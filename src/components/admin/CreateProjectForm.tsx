'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function CreateProjectForm({ organisationId }: { organisationId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', reporting_period: '', funder_name: '' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Enter a project name')
    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organisation_id: organisationId, ...form }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create project')
      toast.success('Project created')
      setForm({ name: '', reporting_period: '', funder_name: '' })
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    }
    setSaving(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ background: '#1E4D35', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
      >
        + New project
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{ background: '#F7F4EE', border: '1px solid #D8D2C4', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Project name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="2026 Mentoring Programme" autoFocus required />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Reporting period</label>
          <input value={form.reporting_period} onChange={e => setForm(f => ({ ...f, reporting_period: e.target.value }))} placeholder="April 2026 – March 2027" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Funder</label>
          <input value={form.funder_name} onChange={e => setForm(f => ({ ...f, funder_name: e.target.value }))} placeholder="National Lottery" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={saving} style={{ background: saving ? '#9A9890' : '#1E4D35', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Creating…' : 'Create project'}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  )
}
