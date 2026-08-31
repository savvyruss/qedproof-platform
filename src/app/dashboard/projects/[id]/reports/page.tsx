import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import GenerateReportForm from '@/components/dashboard/GenerateReportForm'

const typeLabels: Record<string, string> = { funder: 'Funder', output: 'Output', outcome: 'Outcome', internal: 'Internal' }
const statusColors: Record<string, { bg: string; color: string }> = {
  draft: { bg: '#f3f4f6', color: '#6b7280' },
  generated: { bg: '#FDF3D8', color: '#B8860B' },
  published: { bg: '#D6EDE2', color: '#1E4D35' },
}

export default async function ReportsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: project, error } = await supabase.from('projects').select('*').eq('id', params.id).single()
  if (error || !project) notFound()

  const { data: reports } = await supabase
    .from('reports').select('*').eq('project_id', params.id).order('created_at', { ascending: false })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#9A9890', marginBottom: 8 }}>
          <a href="/dashboard" style={{ color: '#9A9890' }}>Dashboard</a> / <a href={`/dashboard/projects/${params.id}`} style={{ color: '#9A9890' }}>{project.name}</a> / Reports
        </div>
        <h1 style={{ fontSize: 28 }}>Reports</h1>
        <p style={{ color: '#9A9890', fontSize: 14 }}>AI-drafted reports built from this project's feedback and output data.</p>
      </div>

      <GenerateReportForm projectId={params.id} />

      <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 24 }}>
        {!reports?.length ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9A9890' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📄</div>
            <p style={{ fontWeight: 600, color: '#1A1A18', marginBottom: 4 }}>No reports yet</p>
            <p style={{ fontSize: 14 }}>Click "+ Generate report" above to draft your first one.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reports.map((r: any) => {
              const c = statusColors[r.status] ?? statusColors.draft
              return (
                <a key={r.id} href={`/dashboard/projects/${params.id}/reports/${r.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 8, border: '1px solid #D8D2C4', textDecoration: 'none', color: 'inherit' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: '#9A9890' }}>{typeLabels[r.report_type] ?? r.report_type} · {new Date(r.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                  <span style={{ background: c.bg, color: c.color, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{r.status}</span>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
