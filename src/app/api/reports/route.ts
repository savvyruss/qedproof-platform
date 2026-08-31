import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { project_id, title, report_type = 'funder' } = await req.json()
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data: project } = await supabase.from('projects').select('*').eq('id', project_id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: entries } = await supabase.from('entries').select('*').eq('project_id', project_id)
  const { data: outputTotals } = await supabase.from('output_totals').select('*').eq('project_id', project_id)
  const { data: outcomes } = await supabase.from('outcome_frameworks').select('*').eq('project_id', project_id)
  const { data: latestAnalysis } = await supabase
    .from('analysis_runs').select('*').eq('project_id', project_id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  const allEntries = entries ?? []
  if (!allEntries.length && !outputTotals?.length) {
    return NextResponse.json({ error: 'Add some feedback or output numbers to this project before generating a report.' }, { status: 400 })
  }

  const feedbackText = allEntries.slice(0, 150).map((e: any, i: number) =>
    `[${i + 1}] (${e.category}, outcome: ${e.outcome_area ?? 'unspecified'}, rating: ${e.rating ?? 'unrated'})\n${e.feedback_text}`
  ).join('\n\n')

  const outputsText = (outputTotals ?? []).map((o: any) => `- ${o.metric_name}: ${o.total_value}${o.unit ? ` ${o.unit}` : ''} (${o.record_count} record(s), latest ${o.last_recorded})`).join('\n') || 'None logged.'
  const outcomesText = (outcomes ?? []).map((o: any) => `- ${o.name}${o.indicator ? ` (${o.indicator})` : ''}: ${o.status ?? 'not_started'}${o.target_value ? `, target ${o.target_value}${o.unit ?? ''}, current ${o.current_value ?? 0}${o.unit ?? ''}` : ''}`).join('\n') || 'None defined.'

  const prompt = `You are an expert social impact evaluator writing a ${report_type} report for a funder/board audience, in UK English.

Project: ${project.name}
Reporting period: ${project.reporting_period ?? 'not specified'}
Funder: ${project.funder_name ?? 'not specified'}
Target beneficiaries: ${project.target_beneficiaries ?? 'not specified'}

OUTPUTS LOGGED:
${outputsText}

OUTCOME FRAMEWORK:
${outcomesText}

${latestAnalysis ? `PRIOR AI ANALYSIS SUMMARY:\n${latestAnalysis.summary}\n` : ''}
FEEDBACK ENTRIES (${allEntries.length} total, showing up to 150):
${feedbackText || 'None collected yet.'}

Write a funder-ready report. Return ONLY valid JSON, no other text, with these exact keys (each a plain string of 2-5 sentences, UK English, professional but warm tone, grounded only in the data above — do not invent numbers):
{
  "executive_summary": "...",
  "outputs_achieved": "...",
  "outcomes_achieved": "...",
  "beneficiary_voice": "... (may include a short direct quote from the feedback if a strong one exists)",
  "challenges_learning": "...",
  "forward_look": "...",
  "recommendations": "..."
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
        model: 'claude-sonnet-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const raw = await res.json()
    const text = raw.content?.[0]?.text?.replace(/```json|```/g, '').trim()
    if (!text) throw new Error('Empty response from AI')
    const sections = JSON.parse(text)

    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        project_id,
        organisation_id: project.organisation_id,
        analysis_run_id: latestAnalysis?.id ?? null,
        title: title?.trim() || `${project.name} — ${report_type} report`,
        report_type,
        status: 'draft',
        reporting_period: project.reporting_period,
        ...sections,
        generated_by: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: report }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Report generation failed: ' + e.message }, { status: 502 })
  }
}
