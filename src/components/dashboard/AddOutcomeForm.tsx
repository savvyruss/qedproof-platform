'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AddOutcomeForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', outcome_area: '', indicator: '' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.outcome_area.trim()) return toast.error('Name and outcome area are required')
    setSaving(true)
    try {
      const res = await fetch('/api/outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, ...form }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to add outcome')
      toast.success('Outcome added')
      setForm({ name: '', outcome_area: '', indicator: '' })
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    }
    setSaving(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ background: '#1E4D35', color: 'white', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
        + Add
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{ background: '#F7F4EE', border: '1px solid #D8D2C4', borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 3 }}>Outcome area (shows in the feedback dropdown) *</label>
        <input value={form.outcome_area} onChange={e => setForm(f => ({ ...f, outcome_area: e.target.value }))} placeholder="e.g. Wellbeing" autoFocus />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 3 }}>Outcome statement *</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Improved wellbeing among participants" />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 3 }}>Indicator (optional)</label>
        <input value={form.indicator} onChange={e => setForm(f => ({ ...f, indicator: e.target.value }))} placeholder="How you'll measure it" />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={saving} style={{ background: saving ? '#9A9890' : '#1E4D35', color: 'white', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Adding…' : 'Add outcome'}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  )
}
