import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AddOutcomeForm from '@/components/dashboard/AddOutcomeForm'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects').select('*').eq('id', params.id).single()

  if (error || !project) notFound()

  const { data: entries } = await supabase
    .from('entries').select('*').eq('project_id', params.id)
    .order('collected_date', { ascending: false })

  const { data: outcomes } = await supabase
    .from('outcome_frameworks').select('*').eq('project_id', params.id)

  const { data: latestAnalysis } = await supabase
    .from('analysis_runs').select('*').eq('project_id', params.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  const { data: outputTotals } = await supabase
    .from('output_totals').select('*').eq('project_id', params.id)

  const allEntries = entries ?? []
  const rated = allEntries.filter((e: any) => e.rating)
  const avgRating = rated.length
    ? (rated.reduce((s: number, e: any) => s + e.rating, 0) / rated.length).toFixed(1)
    : null

  const outcomeCounts: Record<string, number> = {}
  allEntries.forEach((e: any) => {
    const k = e.outcome_area || 'Unspecified'
    outcomeCounts[k] = (outcomeCounts[k] ?? 0) + 1
  })

  const catLabels: Record<string, string> = {
    beneficiary_feedback: 'Beneficiary feedback',
    staff_observation: 'Staff observation',
    case_study: 'Case study',
    community_response: 'Community response',
    stakeholder_input: 'Stakeholder input',
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#9A9890', marginBottom: 8 }}>
          <a href="/dashboard" style={{ color: '#9A9890' }}>Dashboard</a> / {project.name}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 4 }}>{project.name}</h1>
            <p style={{ color: '#9A9890', fontSize: 14 }}>{project.reporting_period ?? 'No reporting period set'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`/dashboard/projects/${params.id}/collect`} style={{ background: '#1E4D35', color: 'white', padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>+ Add feedback</a>
            <a href={`/dashboard/projects/${params.id}/outputs`} style={{ background: 'white', color: '#1A1A18', border: '1px solid #D8D2C4', padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>+ Log output</a>
            <a href={`/dashboard/projects/${params.id}/analyse`} style={{ background: 'white', color: '#1A1A18', border: '1px solid #D8D2C4', padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>Run analysis</a>
            <a href={`/dashboard/projects/${params.id}/reports`} style={{ background: 'white', color: '#1A1A18', border: '1px solid #D8D2C4', padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>Reports</a>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total feedback', value: allEntries.length, color: '#1E4D35' },
          { label: 'Avg rating', value: avgRating ? `${avgRating}/5` : '—', color: '#B8860B' },
          { label: 'Outcome areas', value: Object.keys(outcomeCounts).length, color: '#1F4E79' },
          { label: 'Outcomes tracked', value: outcomes?.length ?? 0, color: '#3A7D5C' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 16, borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9A9890', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 28, fontFamily: 'Georgia, serif' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18 }}>Recent feedback</h2>
            <a href={`/dashboard/projects/${params.id}/collect`} style={{ background: '#1E4D35', color: 'white', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>+ Add</a>
          </div>
          {allEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#9A9890', fontSize: 14 }}>No feedback yet. Click + Add to get started.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allEntries.slice(0, 5).map((e: any) => (
                <div key={e.id} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #D8D2C4' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ background: '#D6EDE2', color: '#1E4D35', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{catLabels[e.category] ?? e.category}</span>
                    {e.rating && <span style={{ color: '#B8860B', fontSize: 12 }}>{'★'.repeat(e.rating)}</span>}
                  </div>
                  {e.responses && Object.keys(e.responses).length > 0 ? (
                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                      {Object.entries(e.responses).slice(0, 2).map(([q, a]: [string, any]) => (
                        <div key={q} style={{ marginBottom: 4 }}>
                          <span style={{ color: '#9A9890' }}>{q}: </span>
                          <span>{Array.isArray(a) ? a.join(', ') : String(a)}</span>
                        </div>
                      ))}
                      {Object.keys(e.responses).length > 2 && (
                        <div style={{ color: '#9A9890', fontSize: 12 }}>+ {Object.keys(e.responses).length - 2} more answer(s)</div>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                      {e.feedback_text.length > 100 ? e.feedback_text.slice(0, 100) + '…' : e.feedback_text}
                    </p>
                  )}
                  <div style={{ fontSize: 11, color: '#9A9890', marginTop: 4 }}>{e.collected_date}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18 }}>Outcome framework</h2>
            <AddOutcomeForm projectId={params.id} />
          </div>
          {!outcomes?.length ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#9A9890', fontSize: 14 }}>No outcomes defined yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {outcomes.map((o: any) => (
                <div key={o.id} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #D8D2C4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{o.name}</span>
                    <span style={{ background: '#D6EDE2', color: '#1E4D35', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{o.status?.replace('_', ' ')}</span>
                  </div>
                  {o.indicator && <div style={{ fontSize: 12, color: '#9A9890', marginTop: 3 }}>{o.indicator}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>Outputs</h2>
          <a href={`/dashboard/projects/${params.id}/outputs`} style={{ background: '#1E4D35', color: 'white', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>+ Log</a>
        </div>
        {!outputTotals?.length ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9A9890', fontSize: 14 }}>Nothing logged yet — e.g. attendees, sessions delivered.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {outputTotals.map((o: any) => (
              <div key={`${o.metric_name}-${o.unit}`} style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #D8D2C4' }}>
                <div style={{ fontSize: 11, color: '#9A9890', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{o.metric_name}</div>
                <div style={{ fontSize: 22, fontFamily: 'Georgia, serif' }}>{o.total_value}{o.unit ? ` ${o.unit}` : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {latestAnalysis && (
        <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Latest AI analysis</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{latestAnalysis.summary}</p>
          {latestAnalysis.themes && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {latestAnalysis.themes.map((t: string) => (
                <span key={t} style={{ background: '#D6EDE2', color: '#1E4D35', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
