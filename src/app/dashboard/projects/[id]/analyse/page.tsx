'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AnalysePage() {
  const params = useParams()
  const projectId = params.id as string
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [focus, setFocus] = useState('general')

  async function run() {
    setLoading(true)
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, focus_area: focus }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setResult(json.data)
      toast.success('Analysis complete!')
    } catch (e: any) { toast.error(e.message) }
    setLoading(false)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#9A9890', marginBottom: 8 }}>
          <a href="/dashboard" style={{ color: '#9A9890' }}>Dashboard</a> / <a href={`/dashboard/projects/${projectId}`} style={{ color: '#9A9890' }}>Project</a> / Analysis
        </div>
        <h1 style={{ fontSize: 28 }}>AI Text Analysis</h1>
      </div>

      <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 24, maxWidth: 500, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Run analysis</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Focus area</label>
          <select value={focus} onChange={e => setFocus(e.target.value)}>
            <option value="general">General social impact</option>
            <option value="wellbeing">Wellbeing & mental health</option>
            <option value="skills">Skills & employment</option>
            <option value="community">Community connection</option>
            <option value="barriers">Barriers & challenges</option>
          </select>
        </div>
        <button onClick={run} disabled={loading} style={{ background: loading ? '#9A9890' : '#1E4D35', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '🔍 Analysing — please wait…' : '🔍 Run AI analysis'}
        </button>
      </div>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#D6EDE2', border: '1px solid #b8ddc8', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1E4D35', marginBottom: 8 }}>Summary</h3>
            <p style={{ fontSize: 14, lineHeight: 1.7 }}>{result.summary}</p>
            {result.themes && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {result.themes.map((t: string) => (
                  <span key={t} style={{ background: 'white', border: '1px solid #b8ddc8', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: '#1E4D35', fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Key outcomes evidenced</h3>
              {result.key_outcomes?.map((o: string) => (
                <div key={o} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: '#1E4D35' }}>✓</span>{o}
                </div>
              ))}
            </div>
            <div style={{ background: 'white', border: '1px solid #D8D2C4', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Recommended actions</h3>
              {result.recommended_actions?.map((a: string, i: number) => (
                <div key={a} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: '#1F4E79', fontWeight: 600 }}>{i + 1}.</span>{a}
                </div>
              ))}
            </div>
          </div>

          {result.standout_quote && (
            <div style={{ background: 'white', border: '1px solid #D8D2C4', borderLeft: '3px solid #B8860B', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Standout quote</h3>
              <blockquote style={{ fontStyle: 'italic', fontSize: 14, lineHeight: 1.8, color: '#1A1A18', margin: 0 }}>"{result.standout_quote}"</blockquote>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
