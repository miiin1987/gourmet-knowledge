import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import SpotDetailClient from '@/components/SpotDetailClient'

export default async function SpotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value
  if (!userId) redirect('/login')

  const { id } = await params
  const supabase = createServiceClient()
  const { data: spot } = await supabase
    .from('spots')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!spot) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="text-gray-500 hover:text-gray-700">
            ← 戻る
          </a>
          <h1 className="text-lg font-bold text-gray-800 truncate">{spot.name}</h1>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <SpotDetailClient spot={spot} />
      </div>
    </div>
  )
}
