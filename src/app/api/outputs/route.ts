import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { project_id, metric_name, value, unit, recorded_date, notes } = await req.json()
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  if (!metric_name?.trim()) return NextResponse.json({ error: 'metric_name required' }, { status: 400 })
  if (value === undefined || value === null || value === '') return NextResponse.json({ error: 'value required' }, { status: 400 })

  const { data: project } = await supabase
    .from('projects').select('organisation_id').eq('id', project_id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('outputs')
    .insert({
      project_id,
      organisation_id: project.organisation_id,
      metric_name: metric_name.trim(),
      value: Number(value),
      unit: unit?.trim() || null,
      recorded_date: recorded_date || new Date().toISOString().split('T')[0],
      notes: notes?.trim() || null,
      recorded_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('project_id')
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('outputs')
    .select('*')
    .eq('project_id', projectId)
    .order('recorded_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
