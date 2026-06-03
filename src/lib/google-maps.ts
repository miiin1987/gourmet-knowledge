import { PlaceCandidate, Spot, SpotGenre } from '@/types'

const API_KEY = process.env.GOOGLE_MAPS_API_KEY!
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place'

const GOOGLE_TYPE_TO_GENRE: Record<string, SpotGenre> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  bar: 'bar',
  bakery: 'bakery',
  meal_takeaway: 'meal_takeaway',
  tourist_attraction: 'tourist_attraction',
  park: 'park',
  museum: 'museum',
  art_gallery: 'museum',
  shopping_mall: 'shopping_mall',
  night_club: 'night_club',
  spa: 'spa',
  beauty_salon: 'spa',
}

export async function searchPlaces(
  query: string
): Promise<PlaceCandidate[]> {
  const params = new URLSearchParams({
    query,
    language: 'ja',
    key: API_KEY,
  })

  const res = await fetch(`${PLACES_BASE}/textsearch/json?${params}`)
  const data = await res.json()

  if (data.status !== 'OK' || !data.results?.length) return []

  return data.results.slice(0, 3).map((place: any) => ({
    place_id: place.place_id,
    name: place.name,
    address: place.formatted_address,
    rating: place.rating ?? null,
    google_maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
  }))
}

export async function getPlaceDetails(
  placeId: string
): Promise<Partial<Spot> | null> {
  const fields = [
    'name',
    'formatted_address',
    'formatted_phone_number',
    'opening_hours',
    'rating',
    'user_ratings_total',
    'url',
    'geometry',
    'types',
    'reviews',
    'address_components',
  ].join(',')

  const params = new URLSearchParams({
    place_id: placeId,
    fields,
    language: 'ja',
    key: API_KEY,
  })

  const res = await fetch(`${PLACES_BASE}/details/json?${params}`)
  const data = await res.json()

  if (data.status !== 'OK' || !data.result) return null

  const place = data.result
  const genre = detectGenre(place.types ?? [])
  const area = extractArea(place.address_components ?? [])

  return {
    name: place.name,
    address: place.formatted_address ?? null,
    phone: place.formatted_phone_number ?? null,
    business_hours: place.opening_hours?.weekday_text?.join('\n') ?? null,
    rating: place.rating ?? null,
    review_count: place.user_ratings_total ?? null,
    google_maps_url: place.url ?? null,
    lat: place.geometry?.location?.lat ?? null,
    lng: place.geometry?.location?.lng ?? null,
    genre,
    area,
  }
}

export function extractReviewTexts(placeDetails: any): string[] {
  return (placeDetails.reviews ?? [])
    .slice(0, 5)
    .map((r: any) => r.text)
    .filter(Boolean)
}

function detectGenre(types: string[]): SpotGenre {
  for (const type of types) {
    if (type in GOOGLE_TYPE_TO_GENRE) {
      return GOOGLE_TYPE_TO_GENRE[type]
    }
  }
  return 'other'
}

function extractArea(components: any[]): string | null {
  const locality = components.find((c) =>
    c.types.includes('locality')
  )?.long_name
  const sublevel1 = components.find((c) =>
    c.types.includes('sublocality_level_1')
  )?.long_name

  if (sublevel1 && locality) return `${locality}${sublevel1}`
  if (locality) return locality
  return null
}
