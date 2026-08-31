'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function CreateOrgForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Enter an organisation name')
    setSaving(true)
    try {
      const res = await fetch('/api/organisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact_email: contactEmail }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create organisation')
      toast.success('Organisation created')
      setName('')
      setContactEmail('')
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
        style={{ background: '#1E4D35', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
      >
        + New organisation
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{ background: '#F7F4EE', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Organisation name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Youth Futures Trust" autoFocus required />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Contact email (optional)</label>
          <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="contact@organisation.org" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={saving} style={{ background: saving ? '#9A9890' : '#1E4D35', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Creating…' : 'Create organisation'}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  )
}
