import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { SearchParams, SpotGenre, SpotStatus } from '@/types'

function getUserId(req: NextRequest): string | null {
  return req.cookies.get('user_id')?.value ?? null
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const params: SearchParams = {
    keyword: searchParams.get('keyword') ?? undefined,
    area: searchParams.get('area') ?? undefined,
    genre: (searchParams.get('genre') as SpotGenre) ?? undefined,
    status: (searchParams.get('status') as SpotStatus) ?? undefined,
    min_rating: searchParams.get('min_rating') ? Number(searchParams.get('min_rating')) : undefined,
    sort: (searchParams.get('sort') as SearchParams['sort']) ?? 'created_at',
    order: (searchParams.get('order') as 'asc' | 'desc') ?? 'desc',
    page: Number(searchParams.get('page') ?? 1),
    limit: Number(searchParams.get('limit') ?? 20),
  }

  const supabase = createServiceClient()
  let query = supabase
    .from('spots')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)

  if (params.keyword) {
    query = query.or(
      `name.ilike.%${params.keyword}%,area.ilike.%${params.keyword}%,memo.ilike.%${params.keyword}%`
    )
  }
  if (params.area) query = query.ilike('area', `%${params.area}%`)
  if (params.genre) query = query.eq('genre', params.genre)
  if (params.status) query = query.eq('status', params.status)
  if (params.min_rating) query = query.gte('rating', params.min_rating)

  const sortCol = params.sort ?? 'created_at'
  const ascending = params.order === 'asc'
  query = query.order(sortCol, { ascending, nullsFirst: false })

  const page = params.page ?? 1
  const limit = params.limit ?? 20
  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ spots: data, total: count, page, limit })
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('spots')
    .insert({ ...body, user_id: userId, status: body.status ?? 'want_to_go' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ spot: data }, { status: 201 })
}
