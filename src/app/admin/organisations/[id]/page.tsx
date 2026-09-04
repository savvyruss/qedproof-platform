import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AddMemberForm from '@/components/admin/AddMemberForm'
import CreateProjectForm from '@/components/admin/CreateProjectForm'
import SeedOutcomeQuestionsButton from '@/components/admin/SeedOutcomeQuestionsButton'

export default async function OrgAdminPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: org, error } = await supabase.from('organisations').select('*').eq('id', params.id).single()
  if (error || !org) notFound()

  const { data: members } = await supabase
    .from('organisation_members')
    .select('id, role, accepted_at, profiles(email, full_name)')
    .eq('organisation_id', params.id)

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('organisation_id', params.id)
    .order('created_at', { ascending: false })

  const { data: activeQuestions } = await supabase
    .from('outcome_questions').select('version').eq('organisation_id', params.id).eq('is_active', true)
  const outcomeQuestionCount = activeQuestions?.length ?? 0
  const currentVersion = activeQuestions?.[0]?.version

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#9A9890', marginBottom: 8 }}>
          <a href="/admin" style={{ color: '#9A9890' }}>Admin</a> / {org.name}
        </div>
        <h1 style={{ fontSize: 28 }}>{org.name}</h1>
        {org.contact_email && <p style={{ color: '#9A9890', fontSize: 14 }}>{org.contact_email}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Members</h2>
          <div style={{ marginBottom: 16 }}>
            <AddMemberForm organisationId={params.id} />
          </div>
          {!members?.length ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9A9890', fontSize: 14 }}>No members yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map((m: any) => (
                <div key={m.id} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #D8D2C4', fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>{m.profiles?.full_name ?? m.profiles?.email}</div>
                  <div style={{ color: '#9A9890', fontSize: 12 }}>{m.profiles?.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18 }}>Projects</h2>
            <CreateProjectForm organisationId={params.id} />
          </div>
          {!projects?.length ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9A9890', fontSize: 14 }}>No projects yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projects.map((p: any) => (
                <a key={p.id} href={`/dashboard/projects/${p.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, border: '1px solid #D8D2C4', fontSize: 13, textDecoration: 'none', color: 'inherit' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ color: '#9A9890', fontSize: 12 }}>{p.reporting_period ?? 'No period set'}</div>
                  </div>
                  <span style={{ background: p.is_active ? '#D6EDE2' : '#f3f4f6', color: p.is_active ? '#1E4D35' : '#6b7280', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    {p.is_active ? 'Active' : 'Closed'}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Outcome framework</h2>
            <p style={{ fontSize: 13, color: '#9A9890' }}>
              {outcomeQuestionCount
                ? `v${currentVersion} — ${outcomeQuestionCount} questions active — used in every project's Outcome check-in.`
                : "No outcome questions set up yet for this organisation."}
            </p>
          </div>
          {!outcomeQuestionCount && <SeedOutcomeQuestionsButton organisationId={params.id} />}
        </div>
      </div>
    </div>
  )
}
