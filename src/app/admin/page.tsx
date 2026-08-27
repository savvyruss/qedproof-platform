import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: orgs } = await supabase.from('organisations').select('*').order('name')

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>Admin — Organisations</h1>
        <p style={{ color: '#9A9890', fontSize: 14 }}>Manage all client organisations.</p>
      </div>
      <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 20 }}>All organisations</h2>
        {!orgs?.length ? (
          <p style={{ color: '#9A9890', fontSize: 14 }}>No organisations yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orgs.map((org: any) => (
              <div key={org.id} style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid #D8D2C4' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{org.name}</div>
                <div style={{ fontSize: 12, color: '#9A9890', marginTop: 2 }}>Created: {new Date(org.created_at).toLocaleDateString('en-GB')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
