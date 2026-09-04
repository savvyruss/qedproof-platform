'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type Question = {
  id: string
  area_code: string
  area_label: string
  question_text: string
  sort_order: number
}

type AnswerState = { score: string; trend: string; reason: string }

export default function CheckinPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [respondentRef, setRespondentRef] = useState('')
  const [checkinDate, setCheckinDate] = useState(new Date().toISOString().split('T')[0])
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [flagAlert, setFlagAlert] = useState(false)

  useEffect(() => {
    fetch(`/api/outcome-questions?project_id=${projectId}`)
      .then(res => res.json())
      .then(json => setQuestions(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  const grouped = useMemo(() => {
    const groups: Record<string, Question[]> = {}
    questions.forEach(q => {
      if (!groups[q.area_label]) groups[q.area_label] = []
      groups[q.area_label].push(q)
    })
    return groups
  }, [questions])

  const answeredCount = Object.values(answers).filter(a => a.score !== '').length

  function setAnswer(questionId: string, field: keyof AnswerState, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: { ...(prev[questionId] ?? { score: '', trend: '', reason: '' }), [field]: value } }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = Object.entries(answers)
      .filter(([, a]) => a.score !== '')
      .map(([question_id, a]) => ({ question_id, score: a.score, trend: a.trend, reason: a.reason }))

    if (payload.length === 0) return toast.error('Answer at least one question before saving')

    setSaving(true)
    try {
      const res = await fetch('/api/outcome-checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, respondent_ref: respondentRef, checkin_date: checkinDate, answers: payload }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save check-in')

      if (json.data.flagged) {
        setFlagAlert(true)
      } else {
        toast.success('Check-in saved')
        router.push(`/dashboard/projects/${projectId}`)
      }
    } catch (e: any) {
      toast.error(e.message)
    }
    setSaving(false)
  }

  const label = { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 } as React.CSSProperties

  if (loading) return <p style={{ color: '#9A9890' }}>Loading…</p>

  if (!questions.length) {
    return (
      <div>
        <div style={{ fontSize: 13, color: '#9A9890', marginBottom: 8 }}>
          <a href="/dashboard" style={{ color: '#9A9890' }}>Dashboard</a> / <a href={`/dashboard/projects/${projectId}`} style={{ color: '#9A9890' }}>Project</a> / Outcome check-in
        </div>
        <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>No outcome questions set up yet</p>
          <p style={{ fontSize: 14, color: '#9A9890' }}>An admin needs to seed the outcome framework for this organisation first (Admin → Organisations → your org).</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {flagAlert && (
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#a63d2f', color: 'white', padding: '18px 24px', borderRadius: 12, marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>⚠️ This check-in flagged a response that needs attention now</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
            The answers have been saved. Please follow your organisation's safeguarding process with this person right now, before ending the session.
          </p>
          <button
            onClick={() => { setFlagAlert(false); router.push(`/dashboard/projects/${projectId}`) }}
            style={{ background: 'white', color: '#a63d2f', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            I've acknowledged this — continue
          </button>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#9A9890', marginBottom: 8 }}>
          <a href="/dashboard" style={{ color: '#9A9890' }}>Dashboard</a> / <a href={`/dashboard/projects/${projectId}`} style={{ color: '#9A9890' }}>Project</a> / Outcome check-in
        </div>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>Outcome check-in</h1>
        <p style={{ color: '#9A9890', fontSize: 14 }}>Completed with a case worker, in session or immediately before one. {answeredCount} of {questions.length} answered.</p>
      </div>

      <form onSubmit={submit}>
        <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={label}>Respondent reference (anonymous ID)</label>
            <input value={respondentRef} onChange={e => setRespondentRef(e.target.value)} placeholder="e.g. Respondent 04" />
          </div>
          <div>
            <label style={label}>Date</label>
            <input type="date" value={checkinDate} onChange={e => setCheckinDate(e.target.value)} />
          </div>
        </div>

        {Object.entries(grouped).map(([areaLabel, qs]) => (
          <div key={areaLabel} style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, color: '#1E4D35', marginBottom: 14 }}>{areaLabel}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {qs.map(q => {
                const a = answers[q.id] ?? { score: '', trend: '', reason: '' }
                return (
                  <div key={q.id} style={{ borderTop: '1px solid #EFEBE2', paddingTop: 14 }}>
                    <p style={{ fontSize: 14, marginBottom: 8 }}>{q.question_text}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 160px 1fr', gap: 10 }}>
                      <select value={a.score} onChange={e => setAnswer(q.id, 'score', e.target.value)}>
                        <option value="">— score —</option>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <select value={a.trend} onChange={e => setAnswer(q.id, 'trend', e.target.value)}>
                        <option value="">— trend —</option>
                        <option value="improving">Improving</option>
                        <option value="static">Static</option>
                        <option value="worsening">Worsening</option>
                      </select>
                      <input value={a.reason} onChange={e => setAnswer(q.id, 'reason', e.target.value)} placeholder="Why / why not (optional)" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <button type="submit" disabled={saving} style={{ background: saving ? '#9A9890' : '#1E4D35', color: 'white', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 15, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving…' : `Save check-in (${answeredCount} answered)`}
        </button>
      </form>
    </div>
  )
}
