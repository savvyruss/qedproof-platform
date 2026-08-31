import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/slugify'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { name, contact_email } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Organisation name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('organisations')
    .insert({ name: name.trim(), slug: slugify(name), contact_email: contact_email?.trim() || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
