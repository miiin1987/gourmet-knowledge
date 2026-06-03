import * as crypto from 'crypto'
import { Spot, STATUS_LABELS } from '@/types'

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!

export function verifyLineSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', CHANNEL_SECRET)
    .update(body)
    .digest('base64')
  return hash === signature
}

export async function replyToLine(replyToken: string, messages: LineMessage[]): Promise<void> {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })
}

export async function pushToLine(userId: string, messages: LineMessage[]): Promise<void> {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to: userId, messages }),
  })
}

export function buildProcessingMessage(): LineMessage {
  return {
    type: 'text',
    text: '受け付けました。少々お待ちください...',
  }
}

export function buildSuccessMessage(spot: Partial<Spot>): LineMessage {
  const summaryText = spot.ai_summary?.length
    ? spot.ai_summary.map((s) => `・${s}`).join('\n')
    : '・口コミ要約なし'

  const status = spot.status ? STATUS_LABELS[spot.status] : '行きたい'

  return {
    type: 'text',
    text: `✅ 登録完了

店名：${spot.name ?? '不明'}
評価：${spot.rating ? `${spot.rating}（${spot.review_count?.toLocaleString()}件）` : '情報なし'}
エリア：${spot.area ?? '不明'}

AI要約
${summaryText}

状態：${status}`,
  }
}

export function buildCandidatesMessage(
  candidates: { place_id: string; name: string; address: string; rating: number | null }[]
): LineMessage {
  const numbers = ['1️⃣', '2️⃣', '3️⃣']
  const lines = candidates.map(
    (c, i) =>
      `${numbers[i]} ${c.name}\n   ${c.address}${c.rating ? `（評価${c.rating}）` : ''}`
  )

  return {
    type: 'text',
    text: `複数の候補が見つかりました。どちらですか？\n\n${lines.join('\n\n')}\n\n番号を送ってください`,
  }
}

export function buildErrorMessage(reason: string): LineMessage {
  return {
    type: 'text',
    text: `⚠️ ${reason}`,
  }
}

export function buildAskNameMessage(): LineMessage {
  return {
    type: 'text',
    text: '店舗名が読み取れませんでした。\n店舗名を送ってください（例：〇〇カフェ）',
  }
}

export function buildAskAreaMessage(name: string): LineMessage {
  return {
    type: 'text',
    text: `「${name}」を検索しましたが見つかりませんでした。\nエリア名を教えてください（例：梅田、新宿）`,
  }
}

export function buildSavedWithoutMapsMessage(name: string): LineMessage {
  return {
    type: 'text',
    text: `Google マップ情報は取得できませんでしたが、メモとして保存しました。\n\n店名：${name}\n状態：行きたい`,
  }
}

interface LineMessage {
  type: 'text'
  text: string
}

export async function getLineUserProfile(
  userId: string
): Promise<{ displayName: string; pictureUrl: string | null } | null> {
  const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return {
    displayName: data.displayName,
    pictureUrl: data.pictureUrl ?? null,
  }
}
