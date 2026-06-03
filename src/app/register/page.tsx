import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import RegisterForm from '@/components/RegisterForm'

export default async function RegisterPage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value
  if (!userId) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="text-gray-500 hover:text-gray-700">
            ← 戻る
          </a>
          <h1 className="text-lg font-bold text-gray-800">お店・スポットを登録</h1>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <RegisterForm />
      </div>
    </div>
  )
}
