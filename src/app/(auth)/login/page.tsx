'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F4EE', padding: '0 16px' } as React.CSSProperties,
  wrap: { width: '100%', maxWidth: 420 } as React.CSSProperties,
  logo: { width: 52, height: 52, background: '#1E4D35', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'white', fontFamily: 'Georgia, serif', fontSize: 22 } as React.CSSProperties,
  card: { background: 'white', border: '1px solid #D8D2C4', borderRadius: 14, padding: 28 } as React.CSSProperties,
  title: { fontSize: 20, margin: '0 0 20px', color: '#1A1A18', fontFamily: 'Georgia, serif', fontWeight: 400 } as React.CSSProperties,
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#1A1A18', marginBottom: 5 } as React.CSSProperties,
  field: { marginBottom: 16 } as React.CSSProperties,
  btn: { width: '100%', padding: '11px 18px', background: '#1E4D35', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', marginTop: 4 } as React.CSSProperties,
  btnDisabled: { width: '100%', padding: '11px 18px', background: '#9A9890', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'not-allowed', marginTop: 4 } as React.CSSProperties,
  error: { background: '#fdecea', color: '#a63d2f', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 } as React.CSSProperties,
  center: { textAlign: 'center' as const, marginTop: 24 },
  sub: { fontSize: 14, color: '#9A9890', textAlign: 'center' as const, marginBottom: 28 },
  footer: { textAlign: 'center' as const, fontSize: 12, color: '#9A9890', marginTop: 24 },
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Hard redirect — bypasses any routing issues
    window.location.href = '/dashboard'
  }

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.center}>
          <div style={S.logo}>Q</div>
          <h1 style={{ fontSize: 26, margin: '0 0 4px', fontFamily: 'Georgia, serif', fontWeight: 400 }}>QED Proof</h1>
          <p style={S.sub}>Impact Evaluation Platform</p>
        </div>

        <div style={S.card}>
          <h2 style={S.title}>Sign in to your account</h2>

          {error && <div style={S.error}>{error}</div>}

          <form onSubmit={handleLogin}>
            <div style={S.field}>
              <label style={S.label}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@organisation.org"
                required
                autoComplete="email"
              />
            </div>

            <div style={S.field}>
              <label style={S.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={loading ? S.btnDisabled : S.btn}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={S.footer}>
          <a href="https://qedproof.co.uk" style={{ color: '#9A9890' }}>qedproof.co.uk</a>
        </p>
      </div>
    </div>
  )
}
