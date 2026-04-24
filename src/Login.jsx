import { useState } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE || 'https://fead-3sfa.onrender.com').replace(/\/$/, '')

const C = {
  navy:  '#0A1A05',
  navy2: '#112608',
  navy3: '#1C3A0E',
  gold:  '#C49A28',
  gold2: '#D4B050',
}

const STYLES = `
@keyframes loginFadeUp {
  from { opacity:0; transform:translateY(20px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes loginGlow {
  0%,100% { box-shadow:0 0 16px rgba(196,154,40,0.25); }
  50%      { box-shadow:0 0 32px rgba(196,154,40,0.55); }
}
@keyframes loginRing {
  from { transform:rotate(0deg); }
  to   { transform:rotate(360deg); }
}
@keyframes loginRingRev {
  from { transform:rotate(0deg); }
  to   { transform:rotate(-360deg); }
}
@keyframes loginBlink {
  0%,100% { opacity:1; } 50% { opacity:0.2; }
}
@keyframes loginHex {
  0%,100% { opacity:0.05; } 50% { opacity:0.1; }
}

.l-fade   { animation:loginFadeUp 0.6s ease both; }
.l-fade-2 { animation:loginFadeUp 0.6s 0.12s ease both; }
.l-fade-3 { animation:loginFadeUp 0.6s 0.24s ease both; }
.l-fade-4 { animation:loginFadeUp 0.6s 0.36s ease both; }
.l-glow   { animation:loginGlow 3s ease-in-out infinite; }
.l-ring   { animation:loginRing 14s linear infinite; }
.l-rev    { animation:loginRingRev 9s linear infinite; }
.l-blink  { animation:loginBlink 2s ease-in-out infinite; }
`

/* ── Motif hexagonal ────────────────────────────────────────────────────── */
function HexBg() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ animation:'loginHex 4s ease-in-out infinite' }}>
      <defs>
        <pattern id="lhex" x="0" y="0" width="56" height="64" patternUnits="userSpaceOnUse">
          <polygon points="28,2 54,16 54,48 28,62 2,48 2,16"
            fill="none" stroke="rgba(196,154,40,0.15)" strokeWidth="0.8"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lhex)"/>
    </svg>
  )
}


/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Login({ onLogin }) {
  const [matricule, setMatricule] = useState('')
  const [password, setPassword]   = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  /* 2FA step 2 */
  const [pendingToken, setPendingToken] = useState(null)
  const [maskedEmail, setMaskedEmail]   = useState('')
  const [otpCode, setOtpCode]           = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  /* Mot de passe oublié */
  const [forgotStep, setForgotStep]         = useState(null) // null | 'identifier' | 'otp'
  const [forgotId, setForgotId]             = useState('')
  const [forgotToken, setForgotToken]       = useState(null)
  const [forgotMasked, setForgotMasked]     = useState('')
  const [forgotCode, setForgotCode]         = useState('')
  const [forgotPwd, setForgotPwd]           = useState('')
  const [forgotPwdConfirm, setForgotPwdConfirm] = useState('')
  const [showForgotPwd, setShowForgotPwd]   = useState(false)
  const [forgotSuccess, setForgotSuccess]   = useState(false)
  const [forgotCooldown, setForgotCooldown] = useState(0)

  const startCooldown = () => {
    setResendCooldown(60)
    const t = setInterval(() => setResendCooldown(v => { if (v <= 1) { clearInterval(t); return 0 } return v - 1 }), 1000)
  }

  const startForgotCooldown = () => {
    setForgotCooldown(60)
    const t = setInterval(() => setForgotCooldown(v => { if (v <= 1) { clearInterval(t); return 0 } return v - 1 }), 1000)
  }

  const resetForgot = () => {
    setForgotStep(null); setForgotId(''); setForgotToken(null); setForgotMasked('')
    setForgotCode(''); setForgotPwd(''); setForgotPwdConfirm(''); setForgotSuccess(false)
    setError('')
  }

  const handleForgotSend = async e => {
    e.preventDefault()
    if (!forgotId.trim()) { setError('Veuillez saisir votre matricule ou email.'); return }
    try {
      setLoading(true); setError('')
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotId.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Erreur.'); return }
      setForgotToken(json.pendingToken)
      setForgotMasked(json.maskedEmail || '')
      setForgotStep('otp')
      startForgotCooldown()
    } catch { setError('Impossible de contacter le serveur.') }
    finally { setLoading(false) }
  }

  const handleForgotResend = async () => {
    if (forgotCooldown > 0) return
    try {
      setLoading(true); setError('')
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotId.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Erreur.'); return }
      setForgotToken(json.pendingToken)
      startForgotCooldown()
      setForgotCode('')
    } catch { setError('Impossible de contacter le serveur.') }
    finally { setLoading(false) }
  }

  const handleForgotReset = async e => {
    e.preventDefault()
    const code = forgotCode.replace(/\s/g, '')
    if (code.length !== 6) { setError('Le code doit contenir 6 chiffres.'); return }
    if (!forgotPwd.trim()) { setError('Veuillez saisir un nouveau mot de passe.'); return }
    if (forgotPwd.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    if (forgotPwd !== forgotPwdConfirm) { setError('Les mots de passe ne correspondent pas.'); return }
    try {
      setLoading(true); setError('')
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken: forgotToken, code, newPassword: forgotPwd }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Erreur.'); return }
      setForgotSuccess(true)
    } catch { setError('Impossible de contacter le serveur.') }
    finally { setLoading(false) }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!matricule.trim() || !password.trim()) { setError('Veuillez remplir tous les champs.'); return }
    try {
      setLoading(true); setError('')
      const res  = await fetch(`${API_BASE}/api/auth/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          matricule: matricule.trim(),
          password: password.trim(),
          deviceLabel: navigator.userAgent,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Identifiants incorrects.'); return }
      if (json.twoFactorRequired) {
        setPendingToken(json.pendingToken)
        setMaskedEmail(json.maskedEmail || '')
        startCooldown()
        return
      }
      localStorage.setItem('faed_user', JSON.stringify(json.user))
      onLogin(json.user)
    } catch {
      setError("Impossible de contacter le serveur.")
    } finally { setLoading(false) }
  }

  const handle2FA = async e => {
    e.preventDefault()
    const code = otpCode.replace(/\s/g, '')
    if (code.length !== 6) { setError('Le code doit contenir 6 chiffres.'); return }
    try {
      setLoading(true); setError('')
      const res = await fetch(`${API_BASE}/api/auth/verify-2fa`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken, code }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Code incorrect.'); return }
      localStorage.setItem('faed_user', JSON.stringify(json.user))
      onLogin(json.user)
    } catch {
      setError("Impossible de contacter le serveur.")
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    try {
      setLoading(true); setError('')
      const res = await fetch(`${API_BASE}/api/auth/resend-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Erreur.'); return }
      startCooldown()
      setOtpCode('')
    } catch {
      setError("Impossible de contacter le serveur.")
    } finally { setLoading(false) }
  }

  /* ══ Écran mot de passe oublié ══ */
  if (forgotStep) {
    const cardStyle = {
      zIndex:2, background:'rgba(8,20,4,0.92)', border:`1px solid rgba(196,154,40,0.25)`,
      borderTop:`3px solid ${C.gold}`, borderRadius:6, backdropFilter:'blur(20px)',
      boxShadow:'0 40px 100px rgba(0,0,0,0.7)',
    }
    const inputStyle = { border:`1px solid rgba(196,154,40,0.35)`, background:'rgba(196,154,40,0.05)' }
    const inputCls = 'w-full bg-transparent outline-none text-white text-[12px] placeholder:text-slate-700 font-medium'

    return (
      <>
        <style>{STYLES}</style>
        <div className="min-h-screen flex items-center justify-center font-sans overflow-hidden relative"
          style={{ background:`linear-gradient(145deg, #060e03 0%, ${C.navy2} 50%, ${C.navy3} 100%)` }}>
          <HexBg />
          <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translate(-50%,-50%)',
            width:600, height:400, borderRadius:'50%',
            background:'radial-gradient(ellipse, rgba(28,58,14,0.5) 0%, transparent 70%)',
            filter:'blur(50px)', pointerEvents:'none', zIndex:1 }} />

          <div className="relative w-full max-w-[400px] mx-4 l-fade" style={cardStyle}>

            {/* Header */}
            <div className="flex flex-col items-center pt-8 pb-4">
              <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(196,154,40,0.1)',
                border:`2px solid rgba(196,154,40,0.4)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {forgotSuccess
                  ? <svg viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" style={{ width:24, height:24 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" style={{ width:24, height:24 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>}
              </div>
              <div style={{ color: C.gold }} className="text-[15px] font-black tracking-wider uppercase mt-3">
                {forgotSuccess ? 'Mot de passe réinitialisé' : 'Mot de passe oublié'}
              </div>
              {!forgotSuccess && forgotStep === 'otp' && forgotMasked && (
                <div style={{ color:'rgba(255,255,255,0.35)' }} className="text-[10px] text-center mt-1 px-4">
                  Code envoyé à <span style={{ color:'rgba(196,154,40,0.7)' }}>{forgotMasked}</span>
                </div>
              )}
            </div>

            <div style={{ height:1, background:`linear-gradient(90deg,transparent,rgba(196,154,40,0.3),transparent)`, margin:'0 24px' }} />

            {/* Succès */}
            {forgotSuccess ? (
              <div className="px-8 py-8 text-center space-y-4">
                <p style={{ color:'rgba(255,255,255,0.6)' }} className="text-[11px]">
                  Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.
                </p>
                <button onClick={resetForgot}
                  style={{ background:`linear-gradient(135deg,${C.gold},#a8791e,${C.gold2})`, color: C.navy,
                    boxShadow:`0 4px 20px rgba(196,154,40,0.4)` }}
                  className="w-full py-3 font-black text-[11px] uppercase tracking-widest rounded-sm hover:opacity-90 transition-all">
                  Se connecter
                </button>
              </div>
            ) : forgotStep === 'identifier' ? (
              /* Étape 1 : saisie identifiant */
              <form onSubmit={handleForgotSend} className="px-8 py-6 space-y-4">
                <div>
                  <label style={{ color:'rgba(196,154,40,0.65)' }}
                    className="block text-[8px] font-black uppercase tracking-widest mb-1.5">
                    Matricule ou Email
                  </label>
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm"
                    style={{ border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className="w-4 h-4 shrink-0" style={{ color:'rgba(196,154,40,0.45)' }}>
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input type="text" value={forgotId} onChange={e => { setForgotId(e.target.value); setError('') }}
                      placeholder="Votre matricule ou adresse email" autoFocus
                      className={inputCls} />
                  </div>
                </div>
                {error && (
                  <div style={{ background:'rgba(185,28,28,0.12)', border:'1px solid rgba(185,28,28,0.4)' }}
                    className="flex items-center gap-2 px-3 py-2 rounded-sm">
                    <span className="text-red-400 text-[10px]">{error}</span>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  style={{ background:`linear-gradient(135deg,${C.gold},#a8791e,${C.gold2})`, color: C.navy,
                    boxShadow:`0 4px 20px rgba(196,154,40,0.4)` }}
                  className="w-full flex items-center justify-center gap-2 py-3 font-black text-[11px]
                    uppercase tracking-widest rounded-sm hover:opacity-90 disabled:opacity-50 transition-all">
                  {loading
                    ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"/>Envoi…</>
                    : 'Envoyer le code'}
                </button>
                <button type="button" onClick={resetForgot}
                  style={{ color:'rgba(196,154,40,0.45)' }}
                  className="w-full text-[9px] uppercase tracking-wider hover:text-yellow-400/70 transition-colors text-center">
                  ← Retour à la connexion
                </button>
              </form>
            ) : (
              /* Étape 2 : code OTP + nouveau mot de passe */
              <form onSubmit={handleForgotReset} className="px-8 py-6 space-y-4">
                <div>
                  <label style={{ color:'rgba(196,154,40,0.65)' }}
                    className="block text-[8px] font-black uppercase tracking-widest mb-1.5">
                    Code à 6 chiffres
                  </label>
                  <input type="text" inputMode="numeric" maxLength={7} value={forgotCode}
                    onChange={e => { setForgotCode(e.target.value); setError('') }}
                    placeholder="000 000" autoFocus
                    className="w-full text-center text-[22px] font-black tracking-[0.4em] bg-transparent outline-none text-white py-3 rounded-sm"
                    style={inputStyle} />
                </div>
                <div>
                  <label style={{ color:'rgba(196,154,40,0.65)' }}
                    className="block text-[8px] font-black uppercase tracking-widest mb-1.5">
                    Nouveau mot de passe
                  </label>
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm"
                    style={{ border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className="w-4 h-4 shrink-0" style={{ color:'rgba(196,154,40,0.45)' }}>
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <input type={showForgotPwd ? 'text' : 'password'} value={forgotPwd}
                      onChange={e => { setForgotPwd(e.target.value); setError('') }}
                      placeholder="Minimum 6 caractères" className={inputCls} />
                    <button type="button" onClick={() => setShowForgotPwd(v => !v)}
                      style={{ color:'rgba(255,255,255,0.25)' }} className="shrink-0 hover:text-white/60 transition-colors">
                      {showForgotPwd
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ color:'rgba(196,154,40,0.65)' }}
                    className="block text-[8px] font-black uppercase tracking-widest mb-1.5">
                    Confirmer le mot de passe
                  </label>
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm"
                    style={{ border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className="w-4 h-4 shrink-0" style={{ color:'rgba(196,154,40,0.45)' }}>
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <input type={showForgotPwd ? 'text' : 'password'} value={forgotPwdConfirm}
                      onChange={e => { setForgotPwdConfirm(e.target.value); setError('') }}
                      placeholder="Répéter le mot de passe" className={inputCls} />
                  </div>
                </div>
                {error && (
                  <div style={{ background:'rgba(185,28,28,0.12)', border:'1px solid rgba(185,28,28,0.4)' }}
                    className="flex items-center gap-2 px-3 py-2 rounded-sm">
                    <span className="text-red-400 text-[10px]">{error}</span>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  style={{ background:`linear-gradient(135deg,${C.gold},#a8791e,${C.gold2})`, color: C.navy,
                    boxShadow:`0 4px 20px rgba(196,154,40,0.4)` }}
                  className="w-full flex items-center justify-center gap-2 py-3 font-black text-[11px]
                    uppercase tracking-widest rounded-sm hover:opacity-90 disabled:opacity-50 transition-all">
                  {loading
                    ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"/>Traitement…</>
                    : 'Réinitialiser le mot de passe'}
                </button>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={resetForgot}
                    style={{ color:'rgba(196,154,40,0.45)' }}
                    className="text-[9px] uppercase tracking-wider hover:text-yellow-400/70 transition-colors">
                    ← Retour
                  </button>
                  <button type="button" onClick={handleForgotResend} disabled={loading || forgotCooldown > 0}
                    style={{ color: forgotCooldown > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(196,154,40,0.55)' }}
                    className="text-[9px] uppercase tracking-wider hover:opacity-80 transition-colors disabled:cursor-not-allowed">
                    {forgotCooldown > 0 ? `Renvoyer (${forgotCooldown}s)` : 'Renvoyer le code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </>
    )
  }

  /* ══ Écran step 2 : saisie du code OTP ══ */
  if (pendingToken) return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen flex items-center justify-center font-sans overflow-hidden relative"
        style={{ background:`linear-gradient(145deg, #060e03 0%, ${C.navy2} 50%, ${C.navy3} 100%)` }}>
        <HexBg />
        <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translate(-50%,-50%)',
          width:600, height:400, borderRadius:'50%',
          background:'radial-gradient(ellipse, rgba(28,58,14,0.5) 0%, transparent 70%)',
          filter:'blur(50px)', pointerEvents:'none', zIndex:1 }} />

        <div className="relative w-full max-w-[400px] mx-4 l-fade"
          style={{ zIndex:2, background:'rgba(8,20,4,0.92)', border:`1px solid rgba(196,154,40,0.25)`,
            borderTop:`3px solid ${C.gold}`, borderRadius:6, backdropFilter:'blur(20px)',
            boxShadow:'0 40px 100px rgba(0,0,0,0.7)' }}>

          <div className="flex flex-col items-center pt-8 pb-4">
            <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(196,154,40,0.1)',
              border:`2px solid rgba(196,154,40,0.4)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" style={{ width:24, height:24 }}>
                <rect x="5" y="11" width="14" height="10" rx="2"/>
                <path d="M8 11V7a4 4 0 018 0v4"/>
                <circle cx="12" cy="16" r="1" fill={C.gold}/>
              </svg>
            </div>
            <div style={{ color: C.gold }} className="text-[15px] font-black tracking-wider uppercase mt-3">
              Double Authentification
            </div>
            <div style={{ color:'rgba(196,154,40,0.45)' }} className="text-[9px] tracking-widest uppercase mt-1 text-center px-6">
              Double authentification
            </div>
            {maskedEmail && (
              <div style={{ color:'rgba(255,255,255,0.35)' }} className="text-[10px] text-center mt-1 px-4">
                Code envoyé à <span style={{ color:'rgba(196,154,40,0.7)' }}>{maskedEmail}</span>
              </div>
            )}
          </div>

          <div style={{ height:1, background:`linear-gradient(90deg,transparent,rgba(196,154,40,0.3),transparent)`, margin:'0 24px' }} />

          <form onSubmit={handle2FA} className="px-8 py-6 space-y-4">
            <div>
              <label style={{ color:'rgba(196,154,40,0.65)' }}
                className="block text-[8px] font-black uppercase tracking-widest mb-1.5">
                Code à 6 chiffres
              </label>
              <input
                type="text" inputMode="numeric" maxLength={7} value={otpCode}
                onChange={e => { setOtpCode(e.target.value); setError('') }}
                placeholder="000 000" autoFocus
                className="w-full text-center text-[22px] font-black tracking-[0.4em] bg-transparent outline-none text-white py-3 rounded-sm"
                style={{ border:`1px solid rgba(196,154,40,0.35)`, background:'rgba(196,154,40,0.05)' }}
              />
            </div>

            {error && (
              <div style={{ background:'rgba(185,28,28,0.12)', border:'1px solid rgba(185,28,28,0.4)' }}
                className="flex items-center gap-2 px-3 py-2 rounded-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className="w-3.5 h-3.5 text-red-400 shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span className="text-red-400 text-[10px]">{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ background:`linear-gradient(135deg,${C.gold},#a8791e,${C.gold2})`, color: C.navy,
                boxShadow:`0 4px 20px rgba(196,154,40,0.4)` }}
              className="w-full flex items-center justify-center gap-2 py-3 font-black text-[11px]
                uppercase tracking-widest rounded-sm hover:opacity-90 disabled:opacity-50 transition-all">
              {loading
                ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"/>Vérification…</>
                : 'Valider le code'}
            </button>

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => { setPendingToken(null); setOtpCode(''); setError('') }}
                style={{ color:'rgba(196,154,40,0.45)' }}
                className="text-[9px] uppercase tracking-wider hover:text-yellow-400/70 transition-colors">
                ← Retour
              </button>
              <button type="button" onClick={handleResend} disabled={loading || resendCooldown > 0}
                style={{ color: resendCooldown > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(196,154,40,0.55)' }}
                className="text-[9px] uppercase tracking-wider hover:opacity-80 transition-colors disabled:cursor-not-allowed">
                {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer le code'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )

  /* ══ Écran step 1 : matricule + mdp ══ */
  return (
    <>
      <style>{STYLES}</style>

      {/* Fond principal */}
      <div className="min-h-screen flex items-center justify-center font-sans overflow-hidden relative"
        style={{ background:`linear-gradient(145deg, #060e03 0%, ${C.navy2} 50%, ${C.navy3} 100%)` }}>

        {/* Motif hexagonal */}
        <HexBg />

        {/* Tache lumineuse centrale derrière la carte */}
        <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translate(-50%,-50%)',
          width:600, height:400, borderRadius:'50%',
          background:'radial-gradient(ellipse, rgba(28,58,14,0.5) 0%, transparent 70%)',
          filter:'blur(50px)', pointerEvents:'none', zIndex:1 }} />

        {/* ══ CARTE ══ */}
        <div className="relative w-full max-w-[400px] mx-4 l-fade"
          style={{
            zIndex:2,
            background:'rgba(8,20,4,0.92)',
            border:`1px solid rgba(196,154,40,0.25)`,
            borderTop:`3px solid ${C.gold}`,
            borderRadius:6,
            backdropFilter:'blur(20px)',
            boxShadow:'0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(196,154,40,0.05)',
          }}>

          {/* Logo */}
          <div className="flex flex-col items-center pt-9 pb-5">
            <div style={{ position:'relative', width:80, height:80 }}>
              <div className="l-ring" style={{ position:'absolute', inset:-6, borderRadius:'50%',
                border:'1.5px dashed rgba(196,154,40,0.4)' }} />
              <div className="l-rev" style={{ position:'absolute', inset:-1, borderRadius:'50%',
                border:'1px solid rgba(196,154,40,0.2)' }} />
              <img src="/logo-gn.jpeg" alt="GN" className="l-glow"
                style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover',
                  border:`2px solid ${C.gold}`, position:'relative', zIndex:1 }} />
              <div className="l-blink" style={{ position:'absolute', bottom:2, right:2, zIndex:2,
                width:10, height:10, borderRadius:'50%', background:'#4ade80',
                border:`2px solid ${C.navy}`, boxShadow:'0 0 6px #4ade80' }} />
            </div>

            <div style={{ color: C.gold }} className="text-[18px] font-black tracking-[0.2em] uppercase mt-4 leading-none">
              FAED Niger
            </div>
            <div style={{ color:'rgba(196,154,40,0.45)' }} className="text-[9px] tracking-widest uppercase mt-1">
              Gendarmerie Nationale
            </div>
          </div>

          {/* Séparateur */}
          <div style={{ height:1, background:`linear-gradient(90deg,transparent,rgba(196,154,40,0.3),transparent)`, margin:'0 24px' }} />

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">

            {/* Matricule */}
            <div className="l-fade-2">
              <label style={{ color:'rgba(196,154,40,0.65)' }}
                className="block text-[8px] font-black uppercase tracking-widest mb-1.5">
                Matricule ou Email
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm transition-all"
                style={{ border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)' }}
                onFocus={e => e.currentTarget.style.borderColor = C.gold}
                onBlur={e  => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className="w-4 h-4 shrink-0" style={{ color:'rgba(196,154,40,0.45)' }}>
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input type="text" value={matricule} onChange={e => setMatricule(e.target.value)}
                  placeholder="Matricule ou adresse email" autoComplete="username"
                  className="flex-1 bg-transparent outline-none text-white text-[12px]
                    placeholder:text-slate-700 font-medium" />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="l-fade-3">
              <label style={{ color:'rgba(196,154,40,0.65)' }}
                className="block text-[8px] font-black uppercase tracking-widest mb-1.5">
                Mot de passe
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm transition-all"
                style={{ border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)' }}
                onFocus={e => e.currentTarget.style.borderColor = C.gold}
                onBlur={e  => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className="w-4 h-4 shrink-0" style={{ color:'rgba(196,154,40,0.45)' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="flex-1 bg-transparent outline-none text-white text-[12px]
                    placeholder:text-slate-700 font-medium" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ color:'rgba(255,255,255,0.25)' }}
                  className="shrink-0 hover:text-white/60 transition-colors">
                  {showPwd
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>}
                </button>
              </div>

              {/* Mot de passe oublié */}
              <div className="flex justify-end mt-1.5">
                <button type="button" onClick={() => { setForgotStep('identifier'); setError('') }}
                  style={{ color:'rgba(196,154,40,0.45)' }}
                  className="text-[8px] uppercase tracking-wider hover:text-yellow-400/70 transition-colors">
                  Mot de passe oublié ?
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div style={{ background:'rgba(185,28,28,0.12)', border:'1px solid rgba(185,28,28,0.4)' }}
                className="flex items-center gap-2 px-3 py-2 rounded-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className="w-3.5 h-3.5 text-red-400 shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span className="text-red-400 text-[10px]">{error}</span>
              </div>
            )}

            {/* Bouton connexion */}
            <div className="l-fade-4 pt-1">
              <button type="submit" disabled={loading}
                style={{ background:`linear-gradient(135deg,${C.gold},#a8791e,${C.gold2})`, color: C.navy,
                  boxShadow:`0 4px 20px rgba(196,154,40,0.4)` }}
                className="w-full flex items-center justify-center gap-2 py-3 font-black text-[11px]
                  uppercase tracking-widest rounded-sm hover:opacity-90 disabled:opacity-50 transition-all">
                {loading
                  ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"/>Vérification…</>
                  : <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                        <polyline points="10 17 15 12 10 7"/>
                        <line x1="15" y1="12" x2="3" y2="12"/>
                      </svg>
                      Se connecter
                    </>}
              </button>
            </div>
          </form>

          {/* Pied */}
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.25)' }}
            className="px-8 py-3 flex items-center justify-between rounded-b-sm">
            <div className="flex items-center gap-1.5">
              <div className="l-blink" style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80' }} />
              <span style={{ color:'rgba(255,255,255,0.22)' }} className="text-[8px] uppercase tracking-wider">Système actif</span>
            </div>
            <span style={{ color:'rgba(255,255,255,0.12)' }} className="text-[8px] uppercase tracking-wider">GN Niger</span>
          </div>
        </div>
      </div>
    </>
  )
}
