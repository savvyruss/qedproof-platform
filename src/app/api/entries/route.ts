import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// When an entry arrives as structured question→answer pairs (e.g. imported
// from a survey export) rather than a single typed paragraph, build a
// readable summary from it so feedback_text (required, and what AI
// analysis reads) is always populated with the full context.
function summariseResponses(responses: Record<string, any>): string {
  return Object.entries(responses)
    .filter(([, answer]) => answer !== null && answer !== undefined && answer !== '')
    .map(([question, answer]) => `${question}\n${Array.isArray(answer) ? answer.join(', ') : answer}`)
    .join('\n\n')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const entries = Array.isArray(body) ? body : [body]
  const projectId = entries[0]?.project_id
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data: project } = await supabase
    .from('projects').select('organisation_id').eq('id', projectId).single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const rows = entries.map(e => {
    const feedback_text = e.feedback_text?.trim()
      || (e.responses ? summariseResponses(e.responses) : '')
    return {
      ...e,
      feedback_text,
      organisation_id: project.organisation_id,
      collected_by: user.id,
      collected_date: e.collected_date ?? new Date().toISOString().split('T')[0],
    }
  })

  const { data, error } = await supabase.from('entries').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('project_id')
  let query = supabase.from('entries').select('*').order('collected_date', { ascending: false }).limit(50)
  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
