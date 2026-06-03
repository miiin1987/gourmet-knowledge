import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID!
const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState = req.cookies.get('line_state')?.value

  // リクエストのホストからURLを自動生成
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`
  const callbackUrl = `${baseUrl}/api/auth/line/callback`

  if (!code || state !== storedState) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_state`)
  }

  // LINEアクセストークンを取得
  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
      client_id: LINE_LOGIN_CHANNEL_ID,
      client_secret: LINE_LOGIN_CHANNEL_SECRET,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${APP_URL}/login?error=token_failed`)
  }

  const tokenData = await tokenRes.json()

  // LINEプロフィールを取得
  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  if (!profileRes.ok) {
    return NextResponse.redirect(`${APP_URL}/login?error=profile_failed`)
  }

  const profile = await profileRes.json()
  const lineUserId = profile.userId as string

  // Supabaseにユーザーをupsert（サービスロールキーで操作）
  const supabase = createServiceClient()

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('line_user_id', lineUserId)
    .single()

  let userId: string

  if (existingUser) {
    userId = existingUser.id
    await supabase
      .from('users')
      .update({
        display_name: profile.displayName,
        picture_url: profile.pictureUrl ?? null,
      })
      .eq('id', userId)
  } else {
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        line_user_id: lineUserId,
        display_name: profile.displayName,
        picture_url: profile.pictureUrl ?? null,
      })
      .select('id')
      .single()

    if (!newUser) {
      return NextResponse.redirect(`${APP_URL}/login?error=db_error`)
    }
    userId = newUser.id
  }

  // セッションCookieを設定
  const response = NextResponse.redirect(`${baseUrl}/`)
  response.cookies.set('user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30日
    path: '/',
  })
  response.cookies.set('line_user_id', lineUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  response.cookies.delete('line_state')

  return response
}
