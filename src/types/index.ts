export type SpotStatus = 'want_to_go' | 'visited' | 'favorite' | 'pending'

export type SpotGenre =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'bakery'
  | 'meal_takeaway'
  | 'tourist_attraction'
  | 'park'
  | 'museum'
  | 'shopping_mall'
  | 'night_club'
  | 'spa'
  | 'other'

export const GENRE_LABELS: Record<SpotGenre, string> = {
  restaurant: 'レストラン',
  cafe: 'カフェ',
  bar: 'バー',
  bakery: 'パン屋',
  meal_takeaway: 'テイクアウト',
  tourist_attraction: '観光スポット',
  park: '公園',
  museum: '博物館・美術館',
  shopping_mall: 'ショッピング',
  night_club: 'クラブ',
  spa: 'スパ・サロン',
  other: 'その他',
}

export const STATUS_LABELS: Record<SpotStatus, string> = {
  want_to_go: '行きたい',
  visited: '行った',
  favorite: 'お気に入り',
  pending: '保留',
}

export const STATUS_COLORS: Record<SpotStatus, string> = {
  want_to_go: 'bg-blue-100 text-blue-700',
  visited: 'bg-green-100 text-green-700',
  favorite: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-gray-100 text-gray-600',
}

export interface Spot {
  id: string
  user_id: string
  name: string
  address: string | null
  phone: string | null
  business_hours: string | null
  rating: number | null
  review_count: number | null
  google_maps_url: string | null
  lat: number | null
  lng: number | null
  genre: SpotGenre | null
  area: string | null
  ai_summary: string[] | null
  memo: string | null
  source_image_url: string | null
  source_url: string | null
  status: SpotStatus
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  line_user_id: string
  display_name: string | null
  picture_url: string | null
  created_at: string
}

export interface SearchParams {
  keyword?: string
  area?: string
  genre?: SpotGenre
  status?: SpotStatus
  min_rating?: number
  sort?: 'created_at' | 'rating' | 'name'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface PlaceCandidate {
  place_id: string
  name: string
  address: string
  rating: number | null
  google_maps_url: string
}

export interface AnalyzeResult {
  extracted_name: string | null
  extracted_area: string | null
  extracted_genre: string | null
  confidence: 'high' | 'low'
}
