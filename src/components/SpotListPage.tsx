'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Spot, SearchParams, SpotGenre, SpotStatus, GENRE_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/types'

const GENRE_OPTIONS: { value: SpotGenre | ''; label: string }[] = [
  { value: '', label: 'すべてのジャンル' },
  { value: 'restaurant', label: 'レストラン' },
  { value: 'cafe', label: 'カフェ' },
  { value: 'bar', label: 'バー' },
  { value: 'bakery', label: 'パン屋' },
  { value: 'meal_takeaway', label: 'テイクアウト' },
  { value: 'tourist_attraction', label: '観光スポット' },
  { value: 'park', label: '公園' },
  { value: 'museum', label: '博物館・美術館' },
  { value: 'shopping_mall', label: 'ショッピング' },
  { value: 'other', label: 'その他' },
]

const STATUS_OPTIONS: { value: SpotStatus | ''; label: string }[] = [
  { value: '', label: 'すべての状態' },
  { value: 'want_to_go', label: '行きたい' },
  { value: 'visited', label: '行った' },
  { value: 'favorite', label: 'お気に入り' },
  { value: 'pending', label: '保留' },
]

export default function SpotListPage() {
  const [spots, setSpots] = useState<Spot[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const [keyword, setKeyword] = useState('')
  const [area, setArea] = useState('')
  const [genre, setGenre] = useState<SpotGenre | ''>('')
  const [status, setStatus] = useState<SpotStatus | ''>('')

  const fetchSpots = useCallback(async (reset = false) => {
    setLoading(true)
    const currentPage = reset ? 1 : page

    const params = new URLSearchParams()
    if (keyword) params.set('keyword', keyword)
    if (area) params.set('area', area)
    if (genre) params.set('genre', genre)
    if (status) params.set('status', status)
    params.set('page', String(currentPage))
    params.set('limit', '20')

    const res = await fetch(`/api/spots?${params}`)
    const data = await res.json()

    if (reset) {
      setSpots(data.spots ?? [])
      setPage(2)
    } else {
      setSpots((prev) => [...prev, ...(data.spots ?? [])])
      setPage((p) => p + 1)
    }

    setTotal(data.total ?? 0)
    setHasMore((data.spots ?? []).length === 20)
    setLoading(false)
  }, [keyword, area, genre, status, page])

  useEffect(() => {
    fetchSpots(true)
  }, [keyword, area, genre, status]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">🍜 グルメナレッジ</h1>
          <Link
            href="/register"
            className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-full transition-colors"
          >
            ＋ 登録
          </Link>
        </div>
      </header>

      {/* 検索フォーム */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
          <input
            type="text"
            placeholder="キーワード検索（店名・エリア・メモ）"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="エリア（例：梅田）"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value as SpotGenre | '')}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
            >
              {GENRE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setStatus(o.value as SpotStatus | '')}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  status === o.value
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 件数 */}
      <div className="max-w-2xl mx-auto px-4 py-2 w-full">
        <p className="text-xs text-gray-500">{total}件</p>
      </div>

      {/* スポット一覧 */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-8 space-y-3">
        {spots.map((spot) => (
          <SpotCard key={spot.id} spot={spot} onStatusChange={() => fetchSpots(true)} />
        ))}

        {loading && (
          <div className="text-center py-8 text-gray-400 text-sm">読み込み中...</div>
        )}

        {!loading && spots.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500">まだ登録がありません</p>
            <Link href="/register" className="mt-4 inline-block text-green-500 text-sm font-bold">
              最初の1件を登録する
            </Link>
          </div>
        )}

        {!loading && hasMore && spots.length > 0 && (
          <button
            onClick={() => fetchSpots(false)}
            className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl bg-white"
          >
            さらに読み込む
          </button>
        )}
      </main>
    </div>
  )
}

function SpotCard({
  spot,
  onStatusChange,
}: {
  spot: Spot
  onStatusChange: () => void
}) {
  const [updating, setUpdating] = useState(false)

  const changeStatus = async (newStatus: SpotStatus) => {
    setUpdating(true)
    await fetch(`/api/spots/${spot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setUpdating(false)
    onStatusChange()
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-gray-800 truncate">{spot.name}</h2>
            {spot.genre && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                {GENRE_LABELS[spot.genre]}
              </span>
            )}
          </div>
          {spot.area && <p className="text-xs text-gray-500 mt-0.5">{spot.area}</p>}
          {spot.rating && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-yellow-400 text-sm">★</span>
              <span className="text-sm font-medium">{spot.rating}</span>
              {spot.review_count && (
                <span className="text-xs text-gray-400">
                  ({spot.review_count.toLocaleString()}件)
                </span>
              )}
            </div>
          )}
        </div>

        <span
          className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${STATUS_COLORS[spot.status]}`}
        >
          {STATUS_LABELS[spot.status]}
        </span>
      </div>

      {spot.ai_summary && spot.ai_summary.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {spot.ai_summary.slice(0, 3).map((s, i) => (
            <li key={i} className="text-xs text-gray-600 flex gap-1">
              <span className="text-green-400 shrink-0">・</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {spot.google_maps_url && (
          <a
            href={spot.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition-colors"
          >
            Googleマップ
          </a>
        )}
        <Link
          href={`/spots/${spot.id}`}
          className="text-xs text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          詳細
        </Link>
        <div className="flex gap-1 ml-auto">
          {(['want_to_go', 'visited', 'favorite'] as SpotStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              disabled={updating || spot.status === s}
              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                spot.status === s
                  ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-default'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
