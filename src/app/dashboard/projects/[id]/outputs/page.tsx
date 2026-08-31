'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'

const suggestions = ['Attendees', 'Sessions delivered', 'Referrals made', 'Volunteers involved', 'Hours delivered']

export default function OutputsPage() {
  const params = useParams()
  const projectId = params.id as string
  const [saving, setSaving] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    metric_name: '', value: '', unit: '',
    recorded_date: new Date().toISOString().split('T')[0], notes: ''
  })

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/outputs?project_id=${projectId}`)
      const json = await res.json()
      if (res.ok) setRecords(json.data ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [projectId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.metric_name.trim()) return toast.error('Please enter what you’re recording')
    if (form.value === '') return toast.error('Please enter a number')
    setSaving(true)
    try {
      const res = await fetch('/api/outputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, ...form }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast.success('Output logged!')
      setForm(f => ({ ...f, value: '', notes: '' }))
      load()
    } catch (e: any) { toast.error(e.message ?? 'Something went wrong') }
    setSaving(false)
  }

  const label = { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 } as React.CSSProperties
  const field = { marginBottom: 14 } as React.CSSProperties

  // Running totals per metric, for a quick summary
  const totals: Record<string, { sum: number; unit: string | null }> = {}
  records.forEach(r => {
    const key = r.metric_name
    if (!totals[key]) totals[key] = { sum: 0, unit: r.unit }
    totals[key].sum += Number(r.value)
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#9A9890', marginBottom: 8 }}>
          <a href="/dashboard" style={{ color: '#9A9890' }}>Dashboard</a> / <a href={`/dashboard/projects/${projectId}`} style={{ color: '#9A9890' }}>Project</a> / Log output
        </div>
        <h1 style={{ fontSize: 28 }}>Log output</h1>
        <p style={{ color: '#9A9890', fontSize: 14 }}>Record numbers — attendees, sessions delivered, and so on.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 24 }}>
          <form onSubmit={submit}>
            <div style={field}>
              <label style={label}>What are you recording? *</label>
              <input
                list="metric-suggestions"
                value={form.metric_name}
                onChange={e => setForm(f => ({ ...f, metric_name: e.target.value }))}
                placeholder="Attendees"
                required
              />
              <datalist id="metric-suggestions">
                {suggestions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={field}>
                <label style={label}>Number *</label>
                <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="24" required />
              </div>
              <div style={field}>
                <label style={label}>Unit (optional)</label>
                <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="people" />
              </div>
            </div>
            <div style={field}>
              <label style={label}>Date</label>
              <input type="date" value={form.recorded_date} onChange={e => setForm(f => ({ ...f, recorded_date: e.target.value }))} />
            </div>
            <div style={field}>
              <label style={label}>Notes (optional)</label>
              <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Tuesday evening session at the community centre" style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" disabled={saving} style={{ background: saving ? '#9A9890' : '#1E4D35', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : '+ Log output'}
            </button>
          </form>
        </div>

        <div>
          <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Totals so far</h2>
            {Object.keys(totals).length === 0 ? (
              <p style={{ fontSize: 13, color: '#9A9890' }}>Nothing logged yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(totals).map(([name, { sum, unit }]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>{name}</span>
                    <span style={{ fontWeight: 600 }}>{sum}{unit ? ` ${unit}` : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Recent entries</h2>
            {loading ? (
              <p style={{ fontSize: 13, color: '#9A9890' }}>Loading…</p>
            ) : records.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9A9890' }}>Nothing logged yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {records.slice(0, 8).map(r => (
                  <div key={r.id} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #D8D2C4', fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600 }}>{r.metric_name}</span>
                      <span>{r.value}{r.unit ? ` ${r.unit}` : ''}</span>
                    </div>
                    <div style={{ color: '#9A9890', marginTop: 2 }}>{r.recorded_date}{r.notes ? ` — ${r.notes}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
