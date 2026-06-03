import OpenAI from 'openai'
import { AnalyzeResult } from '@/types'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function analyzeImage(base64Image: string): Promise<AnalyzeResult> {
  const openai = getOpenAI()
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
          {
            type: 'text',
            text: `この画像から飲食店・スポット情報を抽出してください。
JSONのみで回答してください。

{
  "extracted_name": "店舗名（読み取れない場合はnull）",
  "extracted_area": "エリア・地名（読み取れない場合はnull）",
  "extracted_genre": "ジャンル（restaurant/cafe/bar/bakery/meal_takeaway/tourist_attraction/park/museum/shopping_mall/night_club/spa/other のいずれか、不明はnull）",
  "confidence": "店名が明確に読み取れたらhigh、不確かならlow"
}`,
          },
        ],
      },
    ],
    max_tokens: 200,
  })

  try {
    const content = response.choices[0].message.content ?? '{}'
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleaned) as AnalyzeResult
  } catch {
    return { extracted_name: null, extracted_area: null, extracted_genre: null, confidence: 'low' }
  }
}

export async function summarizeReviews(
  spotName: string,
  reviews: string[]
): Promise<string[]> {
  if (reviews.length === 0) return []

  const openai = getOpenAI()
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: `「${spotName}」の口コミを分析して、特徴を箇条書き3〜5点で要約してください。
1点あたり15〜25文字の日本語で、ポジティブ・ネガティブ両方含めて構いません。
口コミが少ない場合は「口コミが少ないため要約が限られます」を最初に追加してください。
JSON配列のみで回答してください。例: ["パンケーキが人気", "店内が広い", "休日は混雑しやすい"]

口コミ：
${reviews.join('\n\n')}`,
      },
    ],
    max_tokens: 300,
  })

  try {
    const content = response.choices[0].message.content ?? '[]'
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleaned) as string[]
  } catch {
    return []
  }
}

export async function analyzeUrl(url: string): Promise<AnalyzeResult> {
  const openai = getOpenAI()
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: `このURL「${url}」から判断できる飲食店・スポット情報を抽出してください。
URLのパターンやパラメータから店名・エリアを推測してください。
JSONのみで回答してください。

{
  "extracted_name": "店舗名（推測できない場合はnull）",
  "extracted_area": "エリア（推測できない場合はnull）",
  "extracted_genre": "ジャンル（restaurant/cafe/bar/bakery/meal_takeaway/tourist_attraction/park/museum/shopping_mall/night_club/spa/other のいずれか）",
  "confidence": "high または low"
}`,
      },
    ],
    max_tokens: 200,
  })

  try {
    const content = response.choices[0].message.content ?? '{}'
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleaned) as AnalyzeResult
  } catch {
    return { extracted_name: null, extracted_area: null, extracted_genre: null, confidence: 'low' }
  }
}
