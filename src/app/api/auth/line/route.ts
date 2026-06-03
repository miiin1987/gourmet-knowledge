import { NextRequest, NextResponse } from 'next/server'

const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID!

export async function GET(req: NextRequest) {
  const state = crypto.randomUUID()
  const nonce = crypto.randomUUID()

  // リクエストのホストからコールバックURLを自動生成（環境変数のタイポを防ぐ）
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`
  const callbackUrl = `${baseUrl}/api/auth/line/callback`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_LOGIN_CHANNEL_ID,
    redirect_uri: callbackUrl,
    scope: 'profile openid',
    state,
    nonce,
  })

  const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?${params}`

  const response = NextResponse.redirect(lineAuthUrl)
  // CSRF対策のためstateをCookieに保存
  response.cookies.set('line_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300,
    path: '/',
  })

  return response
}
