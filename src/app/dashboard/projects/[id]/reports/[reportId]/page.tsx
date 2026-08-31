import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ReportEditor from '@/components/dashboard/ReportEditor'

export default async function ReportDetailPage({ params }: { params: { id: string; reportId: string } }) {
  const supabase = await createClient()

  const { data: report, error } = await supabase
    .from('reports').select('*').eq('id', params.reportId).eq('project_id', params.id).single()

  if (error || !report) notFound()

  return (
    <div>
      <div className="no-print" style={{ fontSize: 13, color: '#9A9890', marginBottom: 16 }}>
        <a href="/dashboard" style={{ color: '#9A9890' }}>Dashboard</a> / <a href={`/dashboard/projects/${params.id}`} style={{ color: '#9A9890' }}>Project</a> / <a href={`/dashboard/projects/${params.id}/reports`} style={{ color: '#9A9890' }}>Reports</a> / {report.title}
      </div>
      <ReportEditor report={report} />
    </div>
  )
}
