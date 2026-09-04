'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function SeedOutcomeQuestionsButton({ organisationId }: { organisationId: string }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function seed() {
    setSaving(true)
    try {
      const res = await fetch('/api/outcome-questions/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organisation_id: organisationId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to seed questions')
      toast.success(`Added ${json.data.length} outcome questions`)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    }
    setSaving(false)
  }

  return (
    <button onClick={seed} disabled={saving} style={{ background: saving ? '#9A9890' : '#1F4E79', color: 'white', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}>
      {saving ? 'Adding…' : '+ Seed outcome framework (45 questions)'}
    </button>
  )
}
