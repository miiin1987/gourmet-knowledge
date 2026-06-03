'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spot, SpotStatus, STATUS_LABELS, STATUS_COLORS, GENRE_LABELS } from '@/types'

export default function SpotDetailClient({ spot: initialSpot }: { spot: Spot }) {
  const router = useRouter()
  const [spot, setSpot] = useState(initialSpot)
  const [editing, setEditing] = useState(false)
  const [memo, setMemo] = useState(initialSpot.memo ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const updateStatus = async (status: SpotStatus) => {
    const res = await fetch(`/api/spots/${spot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    setSpot(data.spot)
  }

  const saveMemo = async () => {
    setSaving(true)
    const res = await fetch(`/api/spots/${spot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo }),
    })
    const data = await res.json()
    setSpot(data.spot)
    setSaving(false)
    setEditing(false)
  }

  const deleteSpot = async () => {
    if (!confirm('このスポットを削除しますか？')) return
    setDeleting(true)
    await fetch(`/api/spots/${spot.id}`, { method: 'DELETE' })
    router.push('/')
  }

  return (
    <div className="space-y-4">
      {/* 基本情報 */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{spot.name}</h2>
            {spot.genre && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                {GENRE_LABELS[spot.genre]}
              </span>
            )}
          </div>
          {spot.rating && (
            <div className="text-right">
              <div className="text-yellow-400 text-lg">★ {spot.rating}</div>
              <div className="text-xs text-gray-400">{spot.review_count?.toLocaleString()}件</div>
            </div>
          )}
        </div>

        {spot.area && (
          <div>
            <span className="text-xs text-gray-400">エリア</span>
            <p className="text-sm text-gray-700">{spot.area}</p>
          </div>
        )}
        {spot.address && (
          <div>
            <span className="text-xs text-gray-400">住所</span>
            <p className="text-sm text-gray-700">{spot.address}</p>
          </div>
        )}
        {spot.phone && (
          <div>
            <span className="text-xs text-gray-400">電話番号</span>
            <p className="text-sm text-gray-700">
              <a href={`tel:${spot.phone}`} className="text-blue-500">{spot.phone}</a>
            </p>
          </div>
        )}
        {spot.business_hours && (
          <div>
            <span className="text-xs text-gray-400">営業時間</span>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{spot.business_hours}</pre>
          </div>
        )}
      </div>

      {/* ステータス */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-xs text-gray-400 mb-2">ステータス</p>
        <div className="flex gap-2 flex-wrap">
          {(['want_to_go', 'visited', 'favorite', 'pending'] as SpotStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`text-sm px-4 py-2 rounded-full border font-medium transition-colors ${
                spot.status === s
                  ? STATUS_COLORS[s] + ' border-transparent'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* AI要約 */}
      {spot.ai_summary && spot.ai_summary.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-2">AI口コミ要約</p>
          <ul className="space-y-1">
            {spot.ai_summary.map((s, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-1">
                <span className="text-green-400">・</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* メモ */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400">メモ</p>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-xs text-blue-500">編集</button>
          )}
        </div>
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              placeholder="メモを入力..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <div className="flex gap-2">
              <button
                onClick={saveMemo}
                disabled={saving}
                className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => { setMemo(spot.memo ?? ''); setEditing(false) }}
                className="text-sm text-gray-400 px-4 py-2"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {spot.memo || <span className="text-gray-300">メモなし</span>}
          </p>
        )}
      </div>

      {/* Googleマップ */}
      {spot.google_maps_url && (
        <a
          href={spot.google_maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-colors"
        >
          🗺️ Googleマップで開く
        </a>
      )}

      {/* 登録元 */}
      {(spot.source_url || spot.source_image_url) && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-2">登録元</p>
          {spot.source_url && (
            <a href={spot.source_url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-500 break-all">
              {spot.source_url}
            </a>
          )}
          {spot.source_image_url && (
            <img src={spot.source_image_url} alt="元画像" className="mt-2 rounded-lg max-h-40 object-cover" />
          )}
        </div>
      )}

      {/* 削除 */}
      <button
        onClick={deleteSpot}
        disabled={deleting}
        className="w-full text-red-400 hover:text-red-600 text-sm py-3 border border-red-100 rounded-xl hover:bg-red-50 transition-colors"
      >
        {deleting ? '削除中...' : 'このスポットを削除'}
      </button>

      <p className="text-center text-xs text-gray-300">
        登録日：{new Date(spot.created_at).toLocaleDateString('ja-JP')}
      </p>
    </div>
  )
}
