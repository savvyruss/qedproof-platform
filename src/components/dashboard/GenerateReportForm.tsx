'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function GenerateReportForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [reportType, setReportType] = useState('funder')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, title, report_type: reportType }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to generate report')
      toast.success('Report drafted!')
      router.push(`/dashboard/projects/${projectId}/reports/${json.data.id}`)
    } catch (e: any) {
      toast.error(e.message)
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ background: '#1E4D35', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
        + Generate report
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{ background: '#F7F4EE', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Title (optional)</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Q1 Funder Update" autoFocus />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Report type</label>
          <select value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="funder">Funder</option>
            <option value="output">Output</option>
            <option value="outcome">Outcome</option>
            <option value="internal">Internal</option>
          </select>
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#9A9890', marginBottom: 12 }}>
        AI drafts every section from your existing feedback and output data — this can take 10–20 seconds. You'll be able to edit it before publishing.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={loading} style={{ background: loading ? '#9A9890' : '#1E4D35', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '🔍 Drafting…' : 'Generate report'}
        </button>
        {!loading && (
          <button type="button" onClick={() => setOpen(false)} style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
