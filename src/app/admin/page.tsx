import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateOrgForm from '@/components/admin/CreateOrgForm'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: orgs } = await supabase.from('organisation_summaries').select('*').order('name')

  return (
    <div>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Admin — Organisations</h1>
          <p style={{ color: '#9A9890', fontSize: 14 }}>Manage all client organisations.</p>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <CreateOrgForm />
      </div>

      <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 20 }}>All organisations</h2>
        {!orgs?.length ? (
          <p style={{ color: '#9A9890', fontSize: 14 }}>No organisations yet — create one above to get started.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orgs.map((org: any) => (
              <a
                key={org.id}
                href={`/admin/organisations/${org.id}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 8, border: '1px solid #D8D2C4', textDecoration: 'none', color: 'inherit' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{org.name}</div>
                  <div style={{ fontSize: 12, color: '#9A9890', marginTop: 2 }}>Created: {new Date(org.created_at).toLocaleDateString('en-GB')}</div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#9A9890' }}>
                  <span>{org.member_count ?? 0} member{org.member_count === 1 ? '' : 's'}</span>
                  <span>{org.project_count ?? 0} project{org.project_count === 1 ? '' : 's'}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
