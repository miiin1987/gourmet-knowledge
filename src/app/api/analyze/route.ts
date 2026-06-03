import { NextRequest, NextResponse } from 'next/server'
import { processImageToSpot, processUrlToSpot, processNameAndArea, processPlaceId } from '@/lib/spot-processor'

export async function POST(req: NextRequest) {
  const userId = req.cookies.get('user_id')?.value
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const image = formData.get('image') as File | null
  const url = formData.get('url') as string | null
  const name = formData.get('name') as string | null
  const area = formData.get('area') as string | null
  const placeId = formData.get('place_id') as string | null

  try {
    if (placeId) {
      const result = await processPlaceId(placeId)
      return NextResponse.json(result)
    }

    if (image) {
      const buffer = await image.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const result = await processImageToSpot(base64)
      return NextResponse.json(result)
    }

    if (url) {
      const result = await processUrlToSpot(url)
      return NextResponse.json(result)
    }

    if (name) {
      const result = await processNameAndArea(name, area ?? undefined)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'image, url, or name is required' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
