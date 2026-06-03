import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { verifyLineSignature, replyToLine, pushToLine, buildProcessingMessage, buildSuccessMessage, buildCandidatesMessage, buildErrorMessage, buildAskNameMessage, buildAskAreaMessage, buildSavedWithoutMapsMessage, getLineUserProfile } from '@/lib/line'
import { processImageToSpot, processUrlToSpot, processNameAndArea, processPlaceId } from '@/lib/spot-processor'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body = JSON.parse(rawBody)
  const events = body.events ?? []

  for (const event of events) {
    if (event.type !== 'message') continue

    const lineUserId = event.source.userId as string
    const replyToken = event.replyToken as string

    // 即座に「処理中」を返信してから非同期処理
    await replyToLine(replyToken, [buildProcessingMessage()])

    waitUntil(handleLineEvent(event, lineUserId))
  }

  return NextResponse.json({ status: 'ok' })
}

async function handleLineEvent(event: any, lineUserId: string) {
  try {
    const supabase = createServiceClient()

    // LINEユーザーIDからDBユーザーを検索
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single()

    // 未登録ユーザーの場合は自動登録
    let userId: string
    if (!user) {
      const profile = await getLineUserProfile(lineUserId)
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          line_user_id: lineUserId,
          display_name: profile?.displayName ?? null,
          picture_url: profile?.pictureUrl ?? null,
        })
        .select('id')
        .single()

      if (!newUser) {
        await pushToLine(lineUserId, [buildErrorMessage('ユーザー登録に失敗しました。')])
        return
      }
      userId = newUser.id
    } else {
      userId = user.id
    }

    // 会話状態を確認（前回の会話が継続中か）
    const { data: conv } = await supabase
      .from('line_conversations')
      .select('*')
      .eq('line_user_id', lineUserId)
      .single()

    const messageType = event.message.type

    // 前回の会話が続いている場合（店名待ち・エリア待ち・候補選択待ち）
    if (conv) {
      await handleConversationContinuation(conv, event, lineUserId, userId, supabase)
      return
    }

    // 新規メッセージの処理
    if (messageType === 'image') {
      await handleImageMessage(event, lineUserId, userId, supabase)
    } else if (messageType === 'text') {
      const text = event.message.text as string
      await handleTextMessage(text, lineUserId, userId, supabase)
    }
  } catch (e) {
    console.error('LINE event handling error:', e)
    await pushToLine(lineUserId, [buildErrorMessage('処理中にエラーが発生しました。')])
  }
}

async function handleImageMessage(
  event: any,
  lineUserId: string,
  userId: string,
  supabase: any
) {
  // 画像を取得してBase64変換
  const imageId = event.message.id
  const imageRes = await fetch(
    `https://api-data.line.me/v2/bot/message/${imageId}/content`,
    { headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` } }
  )
  const buffer = await imageRes.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const result = await processImageToSpot(base64)
  await handleProcessResult(result, lineUserId, userId, supabase)
}

async function handleTextMessage(
  text: string,
  lineUserId: string,
  userId: string,
  supabase: any
) {
  const urlPattern = /https?:\/\/[^\s]+/
  const match = text.match(urlPattern)

  if (match) {
    const result = await processUrlToSpot(match[0])
    await handleProcessResult(result, lineUserId, userId, supabase)
  } else {
    // テキストを店名として処理
    const result = await processNameAndArea(text)
    await handleProcessResult(result, lineUserId, userId, supabase)
  }
}

async function handleConversationContinuation(
  conv: any,
  event: any,
  lineUserId: string,
  userId: string,
  supabase: any
) {
  const text = event.message.text as string | undefined

  if (conv.state === 'waiting_name' && text) {
    await supabase.from('line_conversations').delete().eq('line_user_id', lineUserId)
    const result = await processNameAndArea(text)
    await handleProcessResult(result, lineUserId, userId, supabase)

  } else if (conv.state === 'waiting_area' && text) {
    await supabase.from('line_conversations').delete().eq('line_user_id', lineUserId)
    const result = await processNameAndArea(conv.extracted_name, text)
    await handleProcessResult(result, lineUserId, userId, supabase)

  } else if (conv.state === 'waiting_candidate' && text) {
    const num = parseInt(text.trim()) - 1
    const candidates = conv.candidates as any[]
    if (num >= 0 && num < candidates.length) {
      await supabase.from('line_conversations').delete().eq('line_user_id', lineUserId)
      const result = await processPlaceId(candidates[num].place_id)
      await handleProcessResult(result, lineUserId, userId, supabase)
    } else {
      await pushToLine(lineUserId, [buildErrorMessage('1〜3の番号を送ってください。')])
    }
  }
}

async function handleProcessResult(
  result: any,
  lineUserId: string,
  userId: string,
  supabase: any
) {
  if (result.status === 'need_name') {
    await supabase.from('line_conversations').upsert({
      line_user_id: lineUserId,
      state: 'waiting_name',
    })
    await pushToLine(lineUserId, [buildAskNameMessage()])

  } else if (result.status === 'need_area') {
    await supabase.from('line_conversations').upsert({
      line_user_id: lineUserId,
      state: 'waiting_area',
      extracted_name: result.extractedName,
    })
    await pushToLine(lineUserId, [buildAskAreaMessage(result.extractedName)])

  } else if (result.status === 'multiple_candidates') {
    await supabase.from('line_conversations').upsert({
      line_user_id: lineUserId,
      state: 'waiting_candidate',
      candidates: result.candidates,
    })
    await pushToLine(lineUserId, [buildCandidatesMessage(result.candidates)])

  } else if (result.status === 'saved_without_maps') {
    const spotData = { ...result.spotData, user_id: userId, status: 'want_to_go' }
    await supabase.from('spots').insert(spotData)
    await pushToLine(lineUserId, [buildSavedWithoutMapsMessage(result.spotData?.name ?? '不明')])

  } else if (result.status === 'success') {
    const spotData = { ...result.spotData, user_id: userId, status: 'want_to_go' }
    await supabase.from('spots').insert(spotData)
    await pushToLine(lineUserId, [buildSuccessMessage(result.spotData)])
  }
}
