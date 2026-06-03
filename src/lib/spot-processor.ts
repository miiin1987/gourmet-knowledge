import { analyzeImage, analyzeUrl, summarizeReviews } from './openai'
import { searchPlaces, getPlaceDetails, extractReviewTexts } from './google-maps'
import { AnalyzeResult, PlaceCandidate, Spot } from '@/types'

export interface ProcessResult {
  status: 'success' | 'need_name' | 'need_area' | 'multiple_candidates' | 'saved_without_maps'
  spotData?: Partial<Spot>
  candidates?: PlaceCandidate[]
  extractedName?: string
}

export async function processImageToSpot(
  base64Image: string
): Promise<ProcessResult> {
  const analyzed = await analyzeImage(base64Image)
  return processAnalyzed(analyzed)
}

export async function processUrlToSpot(url: string): Promise<ProcessResult> {
  // Google Maps URLの場合はplace_idを直接取得
  const placeIdMatch = url.match(/place_id:([^&]+)/)
  if (placeIdMatch) {
    return processPlaceId(placeIdMatch[1])
  }

  const analyzed = await analyzeUrl(url)
  return processAnalyzed(analyzed)
}

export async function processNameAndArea(
  name: string,
  area?: string
): Promise<ProcessResult> {
  const query = area ? `${name} ${area}` : name
  const candidates = await searchPlaces(query)

  if (candidates.length === 0) {
    if (!area) {
      return { status: 'need_area', extractedName: name }
    }
    // エリアを指定しても見つからない → Maps情報なしで保存
    return {
      status: 'saved_without_maps',
      spotData: { name, area: area ?? null },
    }
  }

  if (candidates.length === 1) {
    return processPlaceId(candidates[0].place_id)
  }

  return { status: 'multiple_candidates', candidates, extractedName: name }
}

export async function processPlaceId(placeId: string): Promise<ProcessResult> {
  const details = await getPlaceDetails(placeId)
  if (!details) {
    return { status: 'saved_without_maps', spotData: {} }
  }

  const reviews = await getReviewsFromDetails(placeId)
  const aiSummary = details.name
    ? await summarizeReviews(details.name, reviews)
    : []

  return {
    status: 'success',
    spotData: {
      ...details,
      ai_summary: aiSummary,
      status: 'want_to_go',
    },
  }
}

async function processAnalyzed(analyzed: AnalyzeResult): Promise<ProcessResult> {
  if (!analyzed.extracted_name) {
    return { status: 'need_name' }
  }

  return processNameAndArea(analyzed.extracted_name, analyzed.extracted_area ?? undefined)
}

async function getReviewsFromDetails(placeId: string): Promise<string[]> {
  const fields = 'reviews'
  const params = new URLSearchParams({
    place_id: placeId,
    fields,
    language: 'ja',
    key: process.env.GOOGLE_MAPS_API_KEY!,
  })

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`
  )
  const data = await res.json()
  return extractReviewTexts(data.result ?? {})
}
