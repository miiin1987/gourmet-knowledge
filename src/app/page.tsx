import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SpotListPage from '@/components/SpotListPage'

export default async function Home() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) redirect('/login')

  return <SpotListPage />
}
