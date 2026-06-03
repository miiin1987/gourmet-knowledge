import { NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function POST() {
  const response = NextResponse.redirect(`${APP_URL}/login`)
  response.cookies.delete('user_id')
  response.cookies.delete('line_user_id')
  return response
}
