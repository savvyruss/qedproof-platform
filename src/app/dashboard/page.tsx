import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { data: memberships } = await supabase
    .from('organisation_members').select('organisation_id').eq('user_id', user.id)

  const orgIds = (memberships ?? []).map((m: any) => m.organisation_id)

  const { data: projects } = orgIds.length > 0
    ? await supabase.from('projects').select('*').in('organisation_id', orgIds).order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p style={{ color: '#9A9890', fontSize: 14 }}>Your impact evaluation overview</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Projects', value: projects?.length ?? 0, color: '#1E4D35' },
          { label: 'Role', value: profile?.role === 'admin' ? 'Admin' : 'Client', color: '#B8860B' },
          { label: 'Platform', value: 'QED Proof', color: '#1F4E79' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 16, borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9A9890', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 28, fontFamily: 'Georgia, serif' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 20 }}>Projects</h2>
        {!projects?.length ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9A9890' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📋</div>
            <p style={{ fontWeight: 600, color: '#1A1A18', marginBottom: 4 }}>No projects yet</p>
            <p style={{ fontSize: 14 }}>Projects will appear here once your admin sets them up.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map((p: any) => (
              <a key={p.id} href={`/dashboard/projects/${p.id}`} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: 8, border: '1px solid #D8D2C4', background: 'white'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#9A9890' }}>{p.reporting_period ?? 'No period set'}</div>
                </div>
                <span style={{
                  background: p.is_active ? '#D6EDE2' : '#f3f4f6',
                  color: p.is_active ? '#1E4D35' : '#6b7280',
                  padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600
                }}>{p.is_active ? 'Active' : 'Closed'}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
