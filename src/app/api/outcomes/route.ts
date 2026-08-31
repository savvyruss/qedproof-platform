import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('project_id')
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('outcome_frameworks').select('*').eq('project_id', projectId).order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { project_id, name, outcome_area, indicator, target_value, unit } = await req.json()
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'Outcome name is required' }, { status: 400 })
  if (!outcome_area?.trim()) return NextResponse.json({ error: 'Outcome area is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('outcome_frameworks')
    .insert({
      project_id,
      name: name.trim(),
      outcome_area: outcome_area.trim(),
      indicator: indicator?.trim() || null,
      target_value: target_value ? Number(target_value) : null,
      unit: unit?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
