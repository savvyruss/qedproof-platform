import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { organisation_id, name, description, reporting_period, funder_name, start_date, end_date, target_beneficiaries } = body
  if (!organisation_id) return NextResponse.json({ error: 'organisation_id is required' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'Project name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('projects')
    .insert({
      organisation_id,
      name: name.trim(),
      description: description?.trim() || null,
      reporting_period: reporting_period?.trim() || null,
      funder_name: funder_name?.trim() || null,
      start_date: start_date || null,
      end_date: end_date || null,
      target_beneficiaries: target_beneficiaries ? Number(target_beneficiaries) : null,
      created_by: user.id,
    })
    .select()
    .single()

  // RLS ("Members can insert projects") rejects this for anyone who isn't an
  // admin or a member of that organisation — surfaces as a Postgres error.
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json({ data }, { status: 201 })
}
