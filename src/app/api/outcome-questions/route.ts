import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let organisationId = req.nextUrl.searchParams.get('organisation_id')
  const projectId = req.nextUrl.searchParams.get('project_id')

  if (!organisationId && projectId) {
    const { data: project } = await supabase.from('projects').select('organisation_id').eq('id', projectId).single()
    organisationId = project?.organisation_id ?? null
  }
  if (!organisationId) return NextResponse.json({ error: 'organisation_id or project_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('outcome_questions').select('*').eq('organisation_id', organisationId).order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
