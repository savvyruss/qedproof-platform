'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const SECTIONS: { key: string; label: string }[] = [
  { key: 'executive_summary', label: 'Executive summary' },
  { key: 'outputs_achieved', label: 'Outputs achieved' },
  { key: 'outcomes_achieved', label: 'Outcomes achieved' },
  { key: 'beneficiary_voice', label: 'Beneficiary voice' },
  { key: 'challenges_learning', label: 'Challenges & learning' },
  { key: 'forward_look', label: 'Forward look' },
  { key: 'recommendations', label: 'Recommendations' },
]

export default function ReportEditor({ report }: { report: any }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(['title', ...SECTIONS.map(s => s.key)].map(k => [k, report[k] ?? '']))
  )

  async function save(publish = false) {
    setSaving(true)
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, publish }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')
      toast.success(publish ? 'Report published!' : 'Saved')
      setEditing(false)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    }
    setSaving(false)
  }

  const isPublished = report.status === 'published'

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        {editing ? (
          <>
            <button onClick={() => save(false)} disabled={saving} style={{ background: saving ? '#9A9890' : '#1E4D35', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button onClick={() => setEditing(false)} disabled={saving} style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={() => window.print()} style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              🖨️ Print / Export
            </button>
            <button onClick={() => setEditing(true)} style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Edit
            </button>
            {!isPublished && (
              <button onClick={() => save(true)} disabled={saving} style={{ background: saving ? '#9A9890' : '#1F4E79', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Publishing…' : 'Publish'}
              </button>
            )}
          </>
        )}
      </div>

      <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 32 }}>
        {editing ? (
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            style={{ fontSize: 24, fontFamily: 'Georgia, serif', marginBottom: 20, padding: '6px 10px' }}
          />
        ) : (
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>{report.title}</h1>
        )}
        {!editing && (
          <p style={{ fontSize: 13, color: '#9A9890', marginBottom: 24 }}>
            {report.reporting_period ?? ''}{isPublished && report.published_at ? ` · Published ${new Date(report.published_at).toLocaleDateString('en-GB')}` : ''}
          </p>
        )}

        {SECTIONS.map(({ key, label }) => (
          <div key={key} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1E4D35', marginBottom: 8, fontFamily: 'system-ui' }}>{label}</h2>
            {editing ? (
              <textarea
                rows={4}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            ) : (
              <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{report[key] || '—'}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
