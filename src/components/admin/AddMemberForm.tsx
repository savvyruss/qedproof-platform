'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AddMemberForm({ organisationId }: { organisationId: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return toast.error('Enter an email address')
    setSaving(true)
    try {
      const res = await fetch('/api/organisation-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organisation_id: organisationId, email }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to add member')
      toast.success('Member added')
      setEmail('')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="person@organisation.org"
        style={{ flex: 1 }}
      />
      <button type="submit" disabled={saving} style={{ background: saving ? '#9A9890' : '#1E4D35', color: 'white', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
        {saving ? 'Adding…' : '+ Add member'}
      </button>
    </form>
  )
}
