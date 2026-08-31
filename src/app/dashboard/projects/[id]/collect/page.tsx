'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'

const DEFAULT_OUTCOMES = ['Satisfaction', 'Safety', 'Mental health', 'Opportunity', 'Wellbeing', 'Sustainability']

export default function CollectPage() {
  const params = useParams()
  const projectId = params.id as string
  const [saving, setSaving] = useState(false)
  const [outcomes, setOutcomes] = useState<string[]>(DEFAULT_OUTCOMES)
  const [form, setForm] = useState({
    respondent_name: '', feedback_text: '',
    category: 'beneficiary_feedback', outcome_area: '',
    rating: '', collected_date: new Date().toISOString().split('T')[0]
  })

  const categories = [
    ['beneficiary_feedback', 'Beneficiary feedback'],
    ['staff_observation', 'Staff observation'],
    ['case_study', 'Case study'],
    ['community_response', 'Community response'],
    ['stakeholder_input', 'Stakeholder input'],
  ]

  useEffect(() => {
    fetch(`/api/outcomes?project_id=${projectId}`)
      .then(res => res.json())
      .then(json => {
        const areas: string[] = Array.from(new Set((json.data ?? []).map((o: any) => o.outcome_area).filter(Boolean)))
        if (areas.length) setOutcomes(areas)
      })
      .catch(() => {})
  }, [projectId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.feedback_text.trim()) return toast.error('Please enter feedback text')
    setSaving(true)
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, ...form, rating: form.rating ? parseInt(form.rating) : null, source: 'manual' }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Entry saved!')
      setForm(f => ({ ...f, respondent_name: '', feedback_text: '', rating: '', outcome_area: '' }))
    } catch { toast.error('Something went wrong') }
    setSaving(false)
  }

  const label = { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 } as React.CSSProperties
  const field = { marginBottom: 14 } as React.CSSProperties

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#9A9890', marginBottom: 8 }}>
          <a href="/dashboard" style={{ color: '#9A9890' }}>Dashboard</a> / <a href={`/dashboard/projects/${projectId}`} style={{ color: '#9A9890' }}>Project</a> / Add feedback
        </div>
        <h1 style={{ fontSize: 28 }}>Add feedback</h1>
      </div>

      <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 24, maxWidth: 640 }}>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={field}>
              <label style={label}>Name / ID (optional)</label>
              <input value={form.respondent_name} onChange={e => setForm(f => ({ ...f, respondent_name: e.target.value }))} placeholder="Respondent 01" />
            </div>
            <div style={field}>
              <label style={label}>Date collected</label>
              <input type="date" value={form.collected_date} onChange={e => setForm(f => ({ ...f, collected_date: e.target.value }))} />
            </div>
            <div style={field}>
              <label style={label}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {categories.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div style={field}>
              <label style={label}>Outcome area</label>
              <select value={form.outcome_area} onChange={e => setForm(f => ({ ...f, outcome_area: e.target.value }))}>
                <option value="">— select —</option>
                {outcomes.map(a => <option key={a} value={a}>{a}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div style={field}>
            <label style={label}>Feedback / response *</label>
            <textarea rows={5} value={form.feedback_text} onChange={e => setForm(f => ({ ...f, feedback_text: e.target.value }))} placeholder="Type or paste the feedback here…" required style={{ resize: 'vertical' }} />
          </div>
          <div style={{ ...field, width: 200 }}>
            <label style={label}>Star rating (optional)</label>
            <select value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}>
              <option value="">Not rated</option>
              <option value="5">5 ★★★★★ Excellent</option>
              <option value="4">4 ★★★★ Good</option>
              <option value="3">3 ★★★ Average</option>
              <option value="2">2 ★★ Poor</option>
              <option value="1">1 ★ Very poor</option>
            </select>
          </div>
          <button type="submit" disabled={saving} style={{ background: saving ? '#9A9890' : '#1E4D35', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : '+ Save entry'}
          </button>
        </form>
      </div>
    </div>
  )
}
