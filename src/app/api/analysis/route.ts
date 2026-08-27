import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { project_id, focus_area = 'general' } = await req.json()
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data: entries } = await supabase.from('entries').select('*').eq('project_id', project_id)
  if (!entries?.length) return NextResponse.json({ error: 'No entries found' }, { status: 400 })

  const feedbackText = entries.map((e: any, i: number) =>
    `[${i + 1}] (${e.category}, outcome: ${e.outcome_area ?? 'unspecified'}, rating: ${e.rating ?? 'unrated'})\n${e.feedback_text}`
  ).join('\n\n')

  const prompt = `You are an expert social impact evaluator. Analyse these ${entries.length} feedback entries. Focus: ${focus_area}.

${feedbackText}

Return ONLY valid JSON, no other text:
{
  "summary": "2-3 sentence executive summary",
  "positive_count": <number>,
  "neutral_count": <number>,
  "negative_count": <number>,
  "entry_count": ${entries.length},
  "sentiment_score": <number 1-10>,
  "themes": ["theme1","theme2","theme3","theme4","theme5"],
  "key_outcomes": ["outcome1","outcome2","outcome3"],
  "challenges": ["challenge1","challenge2"],
  "recommended_actions": ["action1","action2","action3"],
  "standout_quote": "most impactful quote",
  "report_narrative": "4-5 sentence funder-ready paragraph"
}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const raw = await res.json()
    const text = raw.content?.[0]?.text?.replace(/```json|```/g, '').trim()
    if (!text) throw new Error('Empty response')
    const analysisData = JSON.parse(text)

    const { data: run, error } = await supabase.from('analysis_runs').insert({
      project_id, entry_count: entries.length, focus_area, ...analysisData, run_by: user.id,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: run })
  } catch (e: any) {
    return NextResponse.json({ error: 'Analysis failed: ' + e.message }, { status: 502 })
  }
}
