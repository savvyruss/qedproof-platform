import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { organisation_id, email } = await req.json()
  if (!organisation_id || !email?.trim()) {
    return NextResponse.json({ error: 'organisation_id and email are required' }, { status: 400 })
  }

  const { data: member } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .ilike('email', email.trim())
    .maybeSingle()

  if (!member) {
    return NextResponse.json(
      { error: `No account found for ${email.trim()}. They need to sign in at least once (an account is created automatically) before you can add them to an organisation.` },
      { status: 404 }
    )
  }

  const { data, error } = await supabase
    .from('organisation_members')
    .insert({ organisation_id, user_id: member.id, accepted_at: new Date().toISOString() })
    .select('*, profiles(email, full_name)')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `${member.email} is already a member of this organisation.` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
