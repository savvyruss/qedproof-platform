'use client'

import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function Sidebar({ profile, organisations }: { profile: any; organisations: any[] }) {
  const pathname = usePathname()
  const org = organisations?.[0]

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : profile?.email?.[0]?.toUpperCase() ?? '?'

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    window.location.href = '/login'
  }

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: '⊞', exact: true },
    { href: '/dashboard/projects', label: 'Projects', icon: '📋', exact: false },
  ]

  return (
    <aside style={{ width: 220, flexShrink: 0, background: 'white', borderRight: '1px solid #D8D2C4', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #D8D2C4' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#1E4D35', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Georgia, serif', fontSize: 16, flexShrink: 0 }}>Q</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18' }}>QED Proof</div>
            <div style={{ fontSize: 11, color: '#9A9890', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{org?.name ?? 'Impact Platform'}</div>
          </div>
        </a>
      </div>

      <nav style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ href, label, icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <a key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: active ? '#1E4D35' : '#9A9890', background: active ? '#D6EDE2' : 'transparent', textDecoration: 'none' }}>
              <span style={{ fontSize: 16 }}>{icon}</span>{label}
            </a>
          )
        })}

        {profile?.role === 'admin' && (
          <>
            <div style={{ paddingTop: 16, paddingBottom: 4, paddingLeft: 12, fontSize: 11, fontWeight: 600, color: '#9A9890', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin</div>
            <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: pathname.startsWith('/admin') ? '#1E4D35' : '#9A9890', background: pathname.startsWith('/admin') ? '#D6EDE2' : 'transparent', textDecoration: 'none' }}>
              <span style={{ fontSize: 16 }}>🏢</span>Organisations
            </a>
          </>
        )}
      </nav>

      <div style={{ padding: 10, borderTop: '1px solid #D8D2C4' }}>
        <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#D6EDE2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E4D35', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name ?? 'Account'}</div>
            <div style={{ fontSize: 11, color: '#9A9890' }}>Sign out</div>
          </div>
        </button>
      </div>
    </aside>
  )
}
