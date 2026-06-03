'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PlaceCandidate, SpotStatus } from '@/types'

type Step = 'input' | 'analyzing' | 'candidates' | 'confirm' | 'saving' | 'done' | 'manual'

export default function RegisterForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('input')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [memo, setMemo] = useState('')

  const [candidates, setCandidates] = useState<PlaceCandidate[]>([])
  const [spotData, setSpotData] = useState<any>(null)
  const [error, setError] = useState('')

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const analyze = async () => {
    setError('')
    setStep('analyzing')

    const formData = new FormData()
    if (imageFile) {
      formData.append('image', imageFile)
    } else if (url) {
      formData.append('url', url)
    } else if (name) {
      formData.append('name', name)
      if (area) formData.append('area', area)
    } else {
      setError('画像・URL・店名のいずれかを入力してください')
      setStep('input')
      return
    }

    const res = await fetch('/api/analyze', { method: 'POST', body: formData })
    const result = await res.json()

    if (result.status === 'success' || result.status === 'saved_without_maps') {
      setSpotData({ ...result.spotData, memo })
      setStep('confirm')
    } else if (result.status === 'multiple_candidates') {
      setCandidates(result.candidates)
      setStep('candidates')
    } else if (result.status === 'need_name') {
      setError('店名が読み取れませんでした。手動で入力してください。')
      setStep('manual')
    } else if (result.status === 'need_area') {
      setName(result.extractedName)
      setError(`「${result.extractedName}」が見つかりませんでした。エリアを入力してください。`)
      setStep('input')
    } else {
      setError('解析に失敗しました。手動で入力してください。')
      setStep('manual')
    }
  }

  const selectCandidate = async (placeId: string) => {
    setStep('analyzing')
    const formData = new FormData()
    formData.append('place_id', placeId)
    const res = await fetch('/api/analyze', { method: 'POST', body: formData })
    const result = await res.json()
    setSpotData({ ...result.spotData, memo })
    setStep('confirm')
  }

  const save = async () => {
    setStep('saving')
    const res = await fetch('/api/spots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...spotData, status: 'want_to_go' }),
    })
    if (res.ok) {
      setStep('done')
      setTimeout(() => router.push('/'), 1500)
    } else {
      setError('保存に失敗しました')
      setStep('confirm')
    }
  }

  const saveManual = async () => {
    if (!name) {
      setError('店名を入力してください')
      return
    }
    setStep('saving')
    const res = await fetch('/api/spots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, area: area || null, memo: memo || null, status: 'want_to_go' }),
    })
    if (res.ok) {
      setStep('done')
      setTimeout(() => router.push('/'), 1500)
    } else {
      setError('保存に失敗しました')
      setStep('manual')
    }
  }

  if (step === 'done') {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">✅</div>
        <p className="text-gray-700 font-bold text-lg">登録しました！</p>
        <p className="text-gray-400 text-sm mt-2">一覧へ戻ります...</p>
      </div>
    )
  }

  if (step === 'saving' || step === 'analyzing') {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4 animate-spin">⏳</div>
        <p className="text-gray-600">{step === 'analyzing' ? 'AI解析中...' : '保存中...'}</p>
      </div>
    )
  }

  if (step === 'candidates') {
    return (
      <div className="space-y-4">
        <p className="text-gray-700 font-bold">どちらの店舗ですか？</p>
        {candidates.map((c) => (
          <button
            key={c.place_id}
            onClick={() => selectCandidate(c.place_id)}
            className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-green-400 hover:shadow-sm transition-all"
          >
            <p className="font-bold text-gray-800">{c.name}</p>
            <p className="text-sm text-gray-500 mt-1">{c.address}</p>
            {c.rating && <p className="text-sm text-yellow-500 mt-1">★ {c.rating}</p>}
          </button>
        ))}
        <button
          onClick={() => setStep('manual')}
          className="w-full text-sm text-gray-400 py-3"
        >
          見つからない → 手動で入力
        </button>
      </div>
    )
  }

  if (step === 'confirm' && spotData) {
    return (
      <div className="space-y-4">
        <p className="text-gray-700 font-bold">この内容で保存しますか？</p>
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <div>
            <span className="text-xs text-gray-400">店名</span>
            <p className="font-bold">{spotData.name}</p>
          </div>
          {spotData.area && (
            <div>
              <span className="text-xs text-gray-400">エリア</span>
              <p>{spotData.area}</p>
            </div>
          )}
          {spotData.address && (
            <div>
              <span className="text-xs text-gray-400">住所</span>
              <p className="text-sm">{spotData.address}</p>
            </div>
          )}
          {spotData.rating && (
            <div>
              <span className="text-xs text-gray-400">評価</span>
              <p>★ {spotData.rating}（{spotData.review_count?.toLocaleString()}件）</p>
            </div>
          )}
          {spotData.ai_summary?.length > 0 && (
            <div>
              <span className="text-xs text-gray-400">AI要約</span>
              <ul className="text-sm space-y-0.5 mt-1">
                {spotData.ai_summary.map((s: string, i: number) => (
                  <li key={i} className="flex gap-1">
                    <span className="text-green-400">・</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-400">メモ（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="自由にメモを残せます"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        <button
          onClick={save}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-colors"
        >
          保存する
        </button>
        <button
          onClick={() => setStep('input')}
          className="w-full text-sm text-gray-400 py-2"
        >
          やり直す
        </button>
      </div>
    )
  }

  if (step === 'manual') {
    return (
      <div className="space-y-4">
        {error && <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">{error}</p>}
        <div>
          <label className="text-sm font-bold text-gray-700">店名 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：〇〇カフェ"
            className="w-full border border-gray-200 rounded-lg px-3 py-3 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="text-sm font-bold text-gray-700">エリア</label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="例：梅田、新宿"
            className="w-full border border-gray-200 rounded-lg px-3 py-3 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="text-sm font-bold text-gray-700">メモ</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="自由にメモを残せます"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <button
          onClick={saveManual}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-colors"
        >
          保存する
        </button>
        <button onClick={() => setStep('input')} className="w-full text-sm text-gray-400 py-2">
          戻る
        </button>
      </div>
    )
  }

  // input step
  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">{error}</p>}

      {/* 画像アップロード */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">スクリーンショットから登録</p>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 transition-colors"
        >
          {imagePreview ? (
            <img src={imagePreview} alt="preview" className="max-h-48 mx-auto rounded-lg object-contain" />
          ) : (
            <>
              <div className="text-3xl mb-2">📷</div>
              <p className="text-sm text-gray-400">タップして画像を選択</p>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
      </div>

      <div className="flex items-center gap-3 text-gray-300">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm">または</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* URL入力 */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">URLから登録</p>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Google マップ・Instagram・TikTokのURL"
          className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      <div className="flex items-center gap-3 text-gray-300">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm">または</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* 店名検索 */}
      <div className="space-y-2">
        <p className="text-sm font-bold text-gray-700">店名で検索</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：〇〇カフェ"
          className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <input
          type="text"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="エリア（例：梅田）※任意"
          className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      <button
        onClick={analyze}
        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-colors"
      >
        AI解析して登録
      </button>

      <button
        onClick={() => setStep('manual')}
        className="w-full text-sm text-gray-400 py-2 hover:text-gray-600"
      >
        手動で直接入力する
      </button>
    </div>
  )
}
