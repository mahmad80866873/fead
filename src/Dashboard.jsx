import { useState, useEffect, useCallback, useRef } from 'react'
import JSZip from 'jszip'

const C = {
  navy:    '#1C3A0E',
  navy2:   '#112608',
  navy3:   '#2E5C1A',
  gold:    '#C49A28',
  gold2:   '#D4B050',
  border:  '#7AAA55',
  cellHdr: '#EEF5E6',
  text:    '#1A3008',
  muted:   '#4A6830',
  sidebar: '#0A1A05',
}

/* ── Dashboard CSS Animations ──────────────────────────────────────────── */
function DashStyles() {
  return (
    <style>{`
      @keyframes dashFadeUp {
        from { opacity:0; transform:translateY(18px); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes dashGlowPulse {
        0%,100% { box-shadow:0 0 8px rgba(196,154,40,0.25); }
        50%      { box-shadow:0 0 22px rgba(196,154,40,0.65); }
      }
      @keyframes dashLogoRing {
        from { transform:rotate(0deg); }
        to   { transform:rotate(360deg); }
      }
      @keyframes dashLogoRingRev {
        from { transform:rotate(0deg); }
        to   { transform:rotate(-360deg); }
      }
      @keyframes dashBlink {
        0%,100% { opacity:1; }
        50%      { opacity:0.15; }
      }
      @keyframes dashScan {
        0%   { transform:translateY(-100%); opacity:0.5; }
        100% { transform:translateY(120vh); opacity:0; }
      }
      @keyframes dashHexAnim {
        0%,100% { opacity:0.055; }
        50%      { opacity:0.11; }
      }
      @keyframes dashPing {
        0%   { transform:scale(1); opacity:0.7; }
        100% { transform:scale(2.4); opacity:0; }
      }
      @keyframes dashSlideIn {
        from { opacity:0; transform:translateX(-12px); }
        to   { opacity:1; transform:translateX(0); }
      }
      @keyframes dashCountUp {
        from { opacity:0; transform:scale(0.6); }
        to   { opacity:1; transform:scale(1); }
      }
      .dash-fade-up   { animation:dashFadeUp  0.55s cubic-bezier(.22,.68,0,1.2) both; }
      .dash-slide-in  { animation:dashSlideIn 0.4s ease both; }
      .dash-count-up  { animation:dashCountUp 0.6s cubic-bezier(.22,.68,0,1.4) both; }
      .dash-card-hover { transition:transform 0.2s ease, box-shadow 0.2s ease; }
      .dash-card-hover:hover { transform:translateY(-3px); box-shadow:0 8px 28px rgba(28,58,14,0.18); }
      .dash-nav-btn   { transition:all 0.18s ease; }
      .dash-nav-btn:hover { background:rgba(196,154,40,0.08) !important; color:rgba(255,255,255,0.9) !important; }
    `}</style>
  )
}

/* ── Hex pattern backgrounds ──────────────────────────────────────────── */
function SidebarHex() {
  return (
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', animation:'dashHexAnim 4s ease infinite' }}
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="sbHex" x="0" y="0" width="44" height="50" patternUnits="userSpaceOnUse">
          <polygon points="22,2 42,13 42,37 22,48 2,37 2,13"
            fill="none" stroke="#C49A28" strokeWidth="0.8"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#sbHex)"/>
    </svg>
  )
}

function MainHex() {
  return (
    <svg style={{ position:'fixed', inset:0, width:'100%', height:'100%', opacity:0.028, pointerEvents:'none', zIndex:0 }}
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="mainHex" x="0" y="0" width="64" height="74" patternUnits="userSpaceOnUse">
          <polygon points="32,3 61,19 61,55 32,71 3,55 3,19"
            fill="none" stroke="#1C3A0E" strokeWidth="1.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#mainHex)"/>
    </svg>
  )
}

/* ── Scan line for main area ──────────────────────────────────────────── */
function ScanLine() {
  return (
    <div style={{
      position:'fixed', top:0, left:220, right:0, height:2,
      background:'linear-gradient(90deg, transparent, rgba(196,154,40,0.35), transparent)',
      animation:'dashScan 6s linear infinite',
      pointerEvents:'none', zIndex:1,
    }}/>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  })
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(0)} Ko`
  return `${(bytes/(1024*1024)).toFixed(1)} Mo`
}

function TypeBadge({ record }) {
  const t = record.pn ? 'PN' : record.gn ? 'GN' : record.gnn ? 'GNN' : null
  if (!t) return null
  return (
    <span style={{ background: C.gold, color: C.navy }}
      className="text-[9px] font-black px-2 py-0.5 rounded-sm tracking-wider shrink-0">
      {t}
    </span>
  )
}

/* ── Icônes ─────────────────────────────────────────────────────────────────── */
const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IconFolder = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
)
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/>
  </svg>
)
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4">
    <path d="M12 5v14M5 12h14"/>
  </svg>
)

/* ── Modal Aperçu PDF ────────────────────────────────────────────────────── */
function PdfPreviewModal({ record, apiBase, onClose }) {
  const [pdfUrl, setPdfUrl]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [zipLoading, setZipLoading] = useState(false)
  const blobRef = useRef(null)
  const nom = [record.nom, record.prenoms].filter(Boolean).join(' ') || 'Sans-nom'
  const folderName = nom.replace(/[^a-zA-ZÀ-ÿ0-9 _-]/g, '').trim() || 'FAED'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (metric === 'today' || metric === 'month') {
          const today = new Date()
          const dateFin = today.toISOString().slice(0, 10)
          const dateDebut = metric === 'today'
            ? dateFin
            : new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
          const params = new URLSearchParams({ page: 1, limit: 1, dateDebut, dateFin })
          const res = await authFetch(`${apiBase}/api/fiches?${params.toString()}`)
          const json = await res.json()
          setVal(typeof json.total === 'number' ? json.total : 'â€”')
          return
        }
        /* Charger les photos existantes en base64 depuis leurs URLs serveur */
        const photoKeys = ['profilDroit', 'face', 'quartGauche']
        const photoFields = { profilDroit: record.photoProfilDroit, face: record.photoFace, quartGauche: record.photoQuartGauche }
        const _photos = {}
        for (const key of photoKeys) {
          const url = photoFields[key]
          if (!url) continue
          try {
            const resp = await fetch(`${apiBase}${url}`)
            if (!resp.ok) continue
            const blob = await resp.blob()
            const b64 = await new Promise(res => {
              const rd = new FileReader()
              rd.onload = e => res(e.target.result.split(',')[1])
              rd.readAsDataURL(blob)
            })
            _photos[key] = { b64, type: blob.type }
          } catch { /* photo inaccessible */ }
        }

        const res = await fetch(`${apiBase}/api/pdf/finalize`, {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ ...record, _photos }),
        })
        if (!res.ok) throw new Error()
        const blob = await res.blob()
        if (!cancelled) {
          blobRef.current = blob
          setPdfUrl(URL.createObjectURL(blob))
        }
      } catch {
        if (!cancelled) setPdfUrl(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line

  /* Télécharger PDF seul */
  const downloadPdf = () => {
    if (!blobRef.current) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blobRef.current)
    a.download = `${folderName}.pdf`
    a.click()
  }

  /* Télécharger tout en ZIP (PDF + pièces jointes) dans dossier NOM PRENOM */
  const downloadZip = async () => {
    if (!blobRef.current) return
    try {
      setZipLoading(true)
      const zip = new JSZip()
      const folder = zip.folder(folderName)

      /* PDF */
      folder.file(`${folderName}.pdf`, blobRef.current)

      /* Pièces jointes */
      for (const p of (record.pieces || [])) {
        try {
          const res = await fetch(`${apiBase}${p.url}`)
          if (res.ok) {
            const blob = await res.blob()
            folder.file(p.originalName, blob)
          }
        } catch { /* skip fichier inaccessible */ }
      }

      const zipBlob = await zip.generateAsync({ type:'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(zipBlob)
      a.download = `${folderName}.zip`
      a.click()
    } finally { setZipLoading(false) }
  }

  /* Fermer avec Échap */
  useEffect(() => {
    if (count !== null) { setVal(count); return }
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background:'rgba(0,0,0,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {/* Barre du modal — ligne 1 : titre + fermer */}
      <div style={{ background: C.navy, borderBottom:`1px solid rgba(196,154,40,0.2)` }}
        className="flex items-center gap-3 px-5 py-3 shrink-0">
        <div style={{ color: C.gold }} className="shrink-0"><IconShield /></div>
        <div className="flex-1 min-w-0">
          <div style={{ color: C.gold }} className="text-[11px] font-black truncate uppercase tracking-wider">{nom}</div>
          <div className="text-[9px] text-slate-400 tracking-widest">Aperçu du dossier FAED</div>
        </div>
        <button onClick={onClose}
          style={{ background:'#ef4444', color:'white', border:'none', flexShrink:0 }}
          className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black rounded-sm
            hover:bg-red-600 transition-colors tracking-wider uppercase">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Fermer
        </button>
      </div>

      {/* Barre du modal — ligne 2 : actions téléchargement */}
      <div style={{ background: C.navy2, borderBottom:`2px solid ${C.gold}` }}
        className="flex items-center gap-2 px-5 py-2 shrink-0">
        {/* Télécharger PDF */}
        <button onClick={downloadPdf} disabled={loading || !pdfUrl}
          style={{ background: C.navy, color: C.gold, border:`1px solid ${C.gold}` }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black rounded-sm
            hover:opacity-80 disabled:opacity-30 transition-all tracking-wider uppercase">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Télécharger PDF
        </button>

        {/* Télécharger ZIP */}
        <button onClick={downloadZip} disabled={loading || !pdfUrl || zipLoading}
          style={{ background: C.gold, color: C.navy }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black rounded-sm
            hover:opacity-90 disabled:opacity-40 transition-all tracking-wider uppercase shadow">
          {zipLoading
            ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>}
          Tout télécharger (.zip)
        </button>
      </div>

      {/* Info dossier */}
      {record.pieces?.length > 0 && (
        <div style={{ background: C.navy2, borderBottom:`1px solid rgba(255,255,255,0.08)` }}
          className="flex items-center gap-3 px-5 py-1.5 shrink-0 flex-wrap">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Pièces jointes incluses :</span>
          {record.pieces.map((p,i) => (
            <span key={i} style={{ color: C.gold2, border:`1px solid rgba(196,154,40,0.3)` }}
              className="text-[8px] font-semibold px-2 py-0.5 rounded-sm flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
              {p.originalName}
            </span>
          ))}
          <span className="text-[8px] text-slate-600 ml-auto">
            Dossier ZIP : <span style={{ color: C.gold }} className="font-bold">{folderName}/</span>
          </span>
        </div>
      )}

      {/* Visionneuse PDF */}
      <div className="flex-1 min-h-0 p-4">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <span className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor:`${C.gold} transparent ${C.gold} ${C.gold}` }}/>
            <span className="text-[11px] text-slate-400">Génération du PDF en cours…</span>
          </div>
        ) : pdfUrl ? (
          <iframe src={pdfUrl} className="w-full h-full rounded-sm"
            style={{ border:`2px solid ${C.gold}`, background:'white' }} title="Aperçu PDF" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-red-400 text-[12px]">Erreur lors de la génération du PDF.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Modal saisie de motif ────────────────────────────────────────────────── */
function MotifModal({ action, nom, onConfirm, onClose }) {
  const [motif, setMotif] = useState('')
  const label = action === 'modifier' ? 'Modification' : 'Suppression'
  const color = action === 'modifier' ? C.gold : '#ef4444'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-sm shadow-2xl w-full max-w-md" style={{ border:`2px solid ${color}` }}>
        {/* Header */}
        <div style={{ background: C.navy, borderBottom:`2px solid ${color}` }}
          className="px-5 py-3 flex items-center justify-between">
          <span style={{ color }} className="text-[11px] font-black uppercase tracking-wider">
            Motif de {label.toLowerCase()}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p style={{ color: C.muted }} className="text-[10px]">
            Dossier : <strong style={{ color: C.navy }}>{nom}</strong>
          </p>
          <div>
            <label style={{ color: C.muted }} className="block text-[9px] font-bold uppercase tracking-wider mb-1">
              Motif <span className="text-red-400">*</span>
            </label>
            <textarea value={motif} onChange={e => setMotif(e.target.value)} rows={3}
              autoFocus
              placeholder={`Indiquez le motif de ${label.toLowerCase()}…`}
              style={{ border:`1px solid ${C.border}`, color: C.text }}
              className="w-full px-3 py-2 text-[11px] rounded-sm outline-none resize-none
                focus:border-[#C49A28] transition-colors" />
          </div>
        </div>

        <div style={{ borderTop:`1px solid ${C.border}` }}
          className="px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose}
            style={{ border:`1px solid ${C.border}`, color: C.muted }}
            className="px-4 py-1.5 text-[10px] font-bold rounded-sm hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={() => { if (motif.trim()) onConfirm(motif.trim()) }}
            disabled={!motif.trim()}
            style={{ background: color, color: action === 'modifier' ? C.navy : 'white' }}
            className="px-5 py-1.5 text-[10px] font-black rounded-sm hover:opacity-90 disabled:opacity-40">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Carte fiche ─────────────────────────────────────────────────────────── */
function RecordCard({ record, apiBase, onOpen, onDelete, canEdit, authFetch, user }) {
  const [showPreview, setShowPreview]   = useState(false)
  const [motifModal, setMotifModal]     = useState(null)   // null | 'modifier' | 'supprimer'
  const [authModal, setAuthModal]       = useState(null)   // null | { action, motif }
  const [authSentMsg, setAuthSentMsg]   = useState('')
  const nom = [record.nom, record.prenoms].filter(Boolean).join(' ') || 'Sans nom'

  /* Appelé après saisie du motif de suppression */
  const doDelete = async (motif) => {
    setMotifModal(null)
    const res = await (authFetch || fetch)(`${apiBase}/api/fiches/${record._id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motif }),
    })
    if (res.ok) { onDelete(record._id); return }
    const json = await res.json().catch(() => ({}))
    if (json.code === 'DELAY_EXCEEDED') { setAuthModal({ action:'supprimer', motif }); return }
    alert(json.error || 'Erreur lors de la suppression.')
  }

  /* Appelé après saisie du motif de modification */
  const doModify = (motif) => {
    setMotifModal(null)
    if (user?.role === 'agent') {
      const age = Date.now() - new Date(record.createdAt).getTime()
      if (age > 3 * 60 * 60 * 1000) { setAuthModal({ action:'modifier', motif }); return }
    }
    onOpen(record, motif)
  }

  return (
    <>
      {showPreview && (
        <PdfPreviewModal record={record} apiBase={apiBase} onClose={() => setShowPreview(false)} />
      )}
      {motifModal && (
        <MotifModal
          action={motifModal}
          nom={nom}
          onClose={() => setMotifModal(null)}
          onConfirm={motifModal === 'supprimer' ? doDelete : doModify}
        />
      )}
      {authModal && (
        <AuthRequestModal
          fiche={record}
          action={authModal.action}
          apiBase={apiBase}
          authFetch={authFetch || fetch}
          onClose={() => setAuthModal(null)}
          onSent={() => {
            setAuthModal(null)
            setAuthSentMsg('Demande envoyée. En attente de validation du Super Admin.')
            setTimeout(() => setAuthSentMsg(''), 5000)
          }}
        />
      )}

      {authSentMsg && (
        <div style={{ background:'#fef3c7', border:'1px solid #fcd34d' }}
          className="px-3 py-2 rounded-sm text-[10px] text-yellow-800 mb-1">
          {authSentMsg}
        </div>
      )}

      <div style={{ border:`1px solid ${C.border}`, borderTop:`3px solid ${C.navy3}` }}
        className="bg-white rounded-sm flex flex-col dash-card-hover dash-fade-up">

        {/* En-tête carte */}
        <div style={{ background: C.cellHdr, borderBottom:`1px solid ${C.border}` }}
          className="px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div style={{ background: C.navy, color: C.gold }}
              className="w-7 h-7 rounded flex items-center justify-center shrink-0">
              <IconShield />
            </div>
            <div className="min-w-0">
              <div style={{ color: C.navy }} className="text-[12px] font-black truncate">{nom}</div>
              <div style={{ color: C.muted }} className="text-[9px]">{formatDate(record.createdAt)}</div>
            </div>
          </div>
          <TypeBadge record={record} />
        </div>

        {/* Corps */}
        <div className="px-4 py-3 flex-1 space-y-2">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {[
              ['Sexe', record.sexe || '—'],
              ['Naissance', record.dateNaissance || '—'],
              ['Lieu', record.lieuNaissance || '—'],
              ['Service', record.service || '—'],
              ['N° Dossier', record.noDossier || '—'],
              ['Agent de saisie', record.agentSaisie || '—'],
              ['Créé par', record.createdByName || '—'],
            ].map(([k,v]) => (
              <div key={k} className="flex gap-1 items-baseline min-w-0">
                <span style={{ color: C.muted }} className="text-[8px] font-bold uppercase shrink-0">{k}:</span>
                <span style={{ color: C.text }} className="text-[9px] truncate">{v}</span>
              </div>
            ))}
          </div>

          {/* Photos miniatures */}
          {(record.photoProfilDroit || record.photoFace || record.photoQuartGauche) && (
            <div className="flex gap-1.5 pt-1">
              {[record.photoProfilDroit, record.photoFace, record.photoQuartGauche].filter(Boolean).map((url, i) => (
                <img key={i} src={`${apiBase}${url}`} alt=""
                  className="w-10 h-12 object-cover rounded-sm border"
                  style={{ borderColor: C.border }} />
              ))}
            </div>
          )}

          {/* Pièces jointes */}
          {record.pieces?.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {record.pieces.map((p, i) => (
                <a key={i} href={`${apiBase}${p.url}`} target="_blank" rel="noreferrer"
                  style={{ border:`1px solid ${C.border}`, color: C.navy }}
                  className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-semibold rounded-sm
                    hover:bg-green-50 transition-colors max-w-[130px]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 shrink-0">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48"/>
                  </svg>
                  <span className="truncate">{p.originalName}</span>
                  <span style={{ color: C.muted }} className="shrink-0">{formatSize(p.size)}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ borderTop:`1px solid ${C.border}` }}
          className="px-3 py-2 flex items-center gap-2 flex-wrap">

          {/* Aperçu */}
          <button onClick={() => setShowPreview(true)}
            style={{ background: C.navy, color: C.gold }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black rounded-sm
              hover:opacity-90 transition-opacity tracking-wider uppercase">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Aperçu
          </button>

          {canEdit && (
            <>
              {/* Modifier */}
              <button onClick={() => setMotifModal('modifier')}
                style={{ border:`1px solid ${C.gold}`, color: C.gold }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black rounded-sm
                  hover:bg-yellow-50 transition-colors tracking-wider uppercase">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Modifier
              </button>

              {/* Supprimer */}
              <button onClick={() => setMotifModal('supprimer')}
                className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-bold rounded-sm
                  text-red-400 border border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
                Suppr.
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

/* ── StatCard (gère le fetch count utilisateurs si count===null) ─────────── */
function StatCard({ label, count, sub, icon, apiBase, authFetch, metric }) {
  const [val, setVal] = useState(count)
  useEffect(() => {
    if (count !== null) { setVal(count); return }
    ;(async () => {
      try {
        const res  = await authFetch(`${apiBase}/api/users`)
        const json = await res.json()
        setVal(Array.isArray(json) ? json.filter(u => u.actif !== false).length : '—')
      } catch { setVal('—') }
    })()
  }, [count, apiBase, authFetch, metric]) // eslint-disable-line
  return (
    <div style={{
      border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.gold}`,
      background:'linear-gradient(135deg,white 60%,rgba(196,154,40,0.04) 100%)',
      transition:'all 0.25s ease',
    }}
      className="rounded-sm p-5 flex items-center gap-4 dash-card-hover dash-fade-up"
      onMouseEnter={e => { e.currentTarget.style.borderLeftColor = C.gold2; e.currentTarget.style.boxShadow = `0 0 18px rgba(196,154,40,0.2)` }}
      onMouseLeave={e => { e.currentTarget.style.borderLeftColor = C.gold; e.currentTarget.style.boxShadow = 'none' }}>
      <div style={{ color: C.gold, opacity:0.4 }}>{icon}</div>
      <div>
        <div style={{ color: C.navy }} className="text-3xl font-black leading-none dash-count-up">{val ?? '…'}</div>
        <div style={{ color: C.navy }} className="text-[10px] font-bold mt-0.5">{label}</div>
        <div style={{ color: C.muted }} className="text-[9px]">{sub}</div>
      </div>
    </div>
  )
}

/* ── Page Corbeille ───────────────────────────────────────────────────────── */
function PageCorbeille({ apiBase, authFetch }) {
  const [fiches, setFiches]   = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (p=1) => {
    setLoading(true)
    try {
      const res  = await authFetch(`${apiBase}/api/fiches/trash?page=${p}&limit=20`)
      const json = await res.json()
      setFiches(json.data || [])
      setTotal(json.total || 0)
      setPage(json.page || 1)
      setPages(json.pages || 1)
    } finally { setLoading(false) }
  }, [apiBase, authFetch])

  useEffect(() => { load(1) }, [load])

  const restore = async (id) => {
    await authFetch(`${apiBase}/api/fiches/${id}/restore`, { method:'PUT' })
    load(page)
  }

  const destroy = async (id, nom) => {
    if (!window.confirm(`Supprimer définitivement "${nom}" ? Cette action est irréversible.`)) return
    await authFetch(`${apiBase}/api/fiches/${id}/permanent`, { method:'DELETE' })
    load(page)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 style={{ color: C.navy }} className="text-2xl font-black tracking-tight">Corbeille</h1>
        <p style={{ color: C.muted }} className="text-[11px] mt-0.5">{total} fiche{total!==1?'s':''} supprimée{total!==1?'s':''}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:`${C.gold} transparent ${C.gold} ${C.gold}` }}/>
        </div>
      ) : fiches.length === 0 ? (
        <div className="text-center py-16">
          <div style={{ color: C.muted }} className="text-4xl mb-3">🗑</div>
          <p style={{ color: C.muted }} className="text-[11px]">La corbeille est vide</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fiches.map(f => {
            const nom = [f.nom, f.prenoms].filter(Boolean).join(' ') || 'Sans nom'
            return (
              <div key={f._id} style={{ border:`1px solid ${C.border}`, borderLeft:`4px solid #ef4444` }}
                className="bg-white rounded-sm px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div style={{ color: C.navy }} className="text-[12px] font-black truncate">{nom}</div>
                  <div style={{ color: C.muted }} className="text-[9px] mt-0.5 space-x-3">
                    <span>N° {f.noDossier || '—'}</span>
                    <span>·</span>
                    <span>Supprimé par : <strong>{f.deletedByName || '—'}</strong></span>
                    <span>·</span>
                    <span>{f.deletedAt ? new Date(f.deletedAt).toLocaleString('fr-FR') : '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => restore(f._id)}
                    style={{ border:`1px solid ${C.border}`, color: C.navy }}
                    className="px-3 py-1.5 text-[9px] font-bold rounded-sm hover:bg-green-50 transition-all tracking-wider uppercase">
                    Restaurer
                  </button>
                  <button onClick={() => destroy(f._id, nom)}
                    className="px-3 py-1.5 text-[9px] font-bold rounded-sm tracking-wider uppercase
                      bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all">
                    Suppr. définitif
                  </button>
                </div>
              </div>
            )
          })}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => load(page-1)} disabled={page<=1}
                style={{ border:`1px solid ${C.border}`, color: C.navy }}
                className="px-4 py-2 text-[10px] font-bold rounded-sm disabled:opacity-30 hover:bg-green-50">
                ← Précédent
              </button>
              <span style={{ color: C.muted }} className="text-[10px]">Page {page} / {pages}</span>
              <button onClick={() => load(page+1)} disabled={page>=pages}
                style={{ border:`1px solid ${C.border}`, color: C.navy }}
                className="px-4 py-2 text-[10px] font-bold rounded-sm disabled:opacity-30 hover:bg-green-50">
                Suivant →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Page Accueil ─────────────────────────────────────────────────────────── */
function PageAccueil({ total, records, apiBase, onNew, onOpen, onDelete, user, authFetch, pendingCount, trashCount }) {
  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="dash-slide-in">
        <div className="flex items-center gap-3 mb-1">
          <div style={{ width:4, height:28, background:`linear-gradient(180deg,${C.gold},${C.gold2})`,
            borderRadius:2, boxShadow:`0 0 10px rgba(196,154,40,0.45)` }}/>
          <h1 style={{ color: C.navy }} className="text-2xl font-black tracking-tight">Tableau de bord</h1>
        </div>
        <p style={{ color: C.muted }} className="text-[11px] mt-0.5 ml-7">Vue d'ensemble du système FAED Niger</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Total Fiches', total, 'enregistrées',
            <svg key="a" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>],
          ['Utilisateurs', null, 'comptes actifs',
            <svg key="b" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>],
          ["Fiches du jour", null, "crÃ©Ã©es aujourd'hui",
            <svg key="c" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
            'today'],
          ['Fiches du mois', null, 'crÃ©Ã©es ce mois',
            <svg key="d" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M21 7.5V6a2 2 0 00-2-2h-1V2"/><path d="M6 2v2H5a2 2 0 00-2 2v13a2 2 0 002 2h14a2 2 0 002-2V12.5"/><path d="M3 10h18"/><path d="M9 15h6"/><path d="M12 12v6"/></svg>,
            'month'],
        ].map(([label, count, sub, icon, metric]) => {
          if (metric === 'today') {
            return (
              <StatCard
                key="Autorisations"
                label="Autorisations"
                count={user?.role === 'superadmin' ? pendingCount : 'â€”'}
                sub="en attente"
                icon={<svg key="c2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>}
                apiBase={apiBase}
                authFetch={authFetch}
              />
            )
          }

          if (metric === 'month') {
            return (
              <StatCard
                key="Corbeille"
                label="Corbeille"
                count={user?.role === 'superadmin' ? trashCount : 'â€”'}
                sub="fiches supprimées"
                icon={<svg key="d2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>}
                apiBase={apiBase}
                authFetch={authFetch}
              />
            )
          }

          return <StatCard key={label} label={label} count={count} sub={sub} icon={icon} apiBase={apiBase} authFetch={authFetch} metric={metric} />
        })}
      </div>

      {/* Dernières fiches */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ color: C.navy }} className="text-[13px] font-black uppercase tracking-wider">
            Dernières fiches
          </h2>
          {onNew && (
            <button onClick={onNew}
              style={{ background: C.navy, color: C.gold }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black rounded-sm
                hover:opacity-90 tracking-wider uppercase">
              <IconPlus /> Nouvelle fiche
            </button>
          )}
        </div>
        {records.length === 0 ? (
          <div style={{ border:`1px dashed ${C.border}` }}
            className="rounded-sm py-12 text-center">
            <p style={{ color: C.muted }} className="text-[11px]">Aucune fiche enregistrée.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {records.slice(0,6).map(r => (
              <RecordCard key={r._id} record={r} apiBase={apiBase}
                onOpen={onOpen} onDelete={onDelete}
                canEdit={user?.role !== 'invite'}
                authFetch={authFetch} user={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Page Dossiers ───────────────────────────────────────────────────────── */
function PageDossiers({ apiBase, onNew, onOpen, user, authFetch }) {
  const [records, setRecords]   = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [pages, setPages]       = useState(1)
  const [search, setSearch]     = useState('')
  const [type, setType]         = useState('')        // '' | 'pn' | 'gn' | 'gnn'
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin]   = useState('')
  const [fetching, setFetching] = useState(false)

  const load = useCallback(async (p=1, q='', t='', dd='', df='') => {
    try {
      setFetching(true)
      const params = new URLSearchParams({ page:p, limit:12 })
      if (q.trim()) params.set('q', q.trim())
      if (t)        params.set('type', t)
      if (dd)       params.set('dateDebut', dd)
      if (df)       params.set('dateFin', df)
      const res  = await authFetch(`${apiBase}/api/fiches?${params}`)
      const json = await res.json()
      setRecords(json.data); setTotal(json.total)
      setPage(json.page);   setPages(json.pages)
    } finally { setFetching(false) }
  }, [apiBase])

  // Chargement initial
  useEffect(() => { load(1,'','','','') }, [load])

  // Recherche texte avec debounce
  useEffect(() => {
    const t = setTimeout(() => load(1, search, type, dateDebut, dateFin), 400)
    return () => clearTimeout(t)
  }, [search, load]) // eslint-disable-line

  // Filtres immédiats
  useEffect(() => {
    load(1, search, type, dateDebut, dateFin)
  }, [type, dateDebut, dateFin, load]) // eslint-disable-line

  const isInvite = user?.role === 'invite'

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette fiche définitivement ?')) return
    try {
      await authFetch(`${apiBase}/api/fiches/${id}`, { method:'DELETE' })
      load(page, search, type, dateDebut, dateFin)
    } catch { alert('Erreur lors de la suppression.') }
  }

  const hasFilters = search || type || dateDebut || dateFin
  const resetFilters = () => { setSearch(''); setType(''); setDateDebut(''); setDateFin('') }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ color: C.navy }} className="text-2xl font-black tracking-tight">Dossiers</h1>
          <p style={{ color: C.muted }} className="text-[11px] mt-0.5">{total} fiche{total!==1?'s':''} enregistrée{total!==1?'s':''}</p>
        </div>
        {onNew && (
          <button onClick={onNew}
            style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.gold2})`, color: C.navy }}
            className="flex items-center gap-2 px-5 py-2.5 text-[10px] font-black rounded-sm
              shadow hover:opacity-90 transition-all tracking-wider uppercase">
            <IconPlus /> Nouvelle Fiche
          </button>
        )}
      </div>

      {/* ── Barre de filtres ── */}
      <div style={{ border:`1px solid ${C.border}`, background:'white' }}
        className="rounded-sm p-3 space-y-2">

        {/* Ligne 1 : recherche texte */}
        <div style={{ border:`1px solid ${C.border}` }}
          className="flex items-center gap-2 px-3 py-2 rounded-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: C.muted }} className="w-4 h-4 shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher par nom, prénom, service, dossier…"
            style={{ color: C.text }} className="flex-1 outline-none text-[11px] bg-transparent" />
          {search && <button onClick={()=>setSearch('')} style={{ color:C.muted }} className="text-sm leading-none">✕</button>}
        </div>

        {/* Ligne 2 : filtres type + dates */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Filtre Type */}
          <div className="flex items-center gap-1">
            <span style={{ color: C.muted }} className="text-[9px] font-bold uppercase tracking-wider shrink-0">Type :</span>
            {[['','Tous'],['gn','GN']].map(([v,l]) => (
              <button key={v} onClick={() => setType(v)}
                style={type === v
                  ? { background: C.navy, color: C.gold, border:`1px solid ${C.navy}` }
                  : { background: 'white', color: C.muted, border:`1px solid ${C.border}` }}
                className="px-2.5 py-1 text-[9px] font-black rounded-sm tracking-wider uppercase
                  hover:opacity-80 transition-all">
                {l}
              </button>
            ))}
          </div>

          {/* Séparateur */}
          <div style={{ width:1, height:20, background: C.border }} className="mx-1 shrink-0" />

          {/* Intervalle de dates */}
          <div className="flex items-center gap-2">
            <span style={{ color: C.muted }} className="text-[9px] font-bold uppercase tracking-wider shrink-0">Du :</span>
            <input type="date" value={dateDebut} onChange={e=>setDateDebut(e.target.value)}
              style={{ color: C.text, border:`1px solid ${C.border}` }}
              className="text-[10px] px-2 py-1 rounded-sm outline-none bg-white" />
            <span style={{ color: C.muted }} className="text-[9px] font-bold uppercase tracking-wider shrink-0">Au :</span>
            <input type="date" value={dateFin} onChange={e=>setDateFin(e.target.value)}
              style={{ color: C.text, border:`1px solid ${C.border}` }}
              className="text-[10px] px-2 py-1 rounded-sm outline-none bg-white" />
          </div>

          {/* Bouton réinitialiser */}
          {hasFilters && (
            <button onClick={resetFilters}
              style={{ color: C.muted, border:`1px solid ${C.border}` }}
              className="ml-auto px-3 py-1 text-[9px] font-bold rounded-sm hover:bg-red-50
                hover:text-red-500 hover:border-red-200 transition-all tracking-wider uppercase">
              ✕ Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Grille */}
      {fetching ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:`${C.gold} transparent ${C.gold} ${C.gold}` }}/>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16">
          <p style={{ color: C.muted }} className="text-[12px]">
            {hasFilters ? 'Aucun résultat pour ces filtres.' : 'Aucune fiche enregistrée.'}
          </p>
          {hasFilters
            ? <button onClick={resetFilters} style={{ background: C.gold, color: C.navy }}
                className="mt-4 px-5 py-2 text-[10px] font-black rounded-sm tracking-wider uppercase hover:opacity-90">
                Effacer les filtres
              </button>
            : <button onClick={onNew} style={{ background: C.gold, color: C.navy }}
                className="mt-4 px-6 py-2.5 text-[10px] font-black rounded-sm tracking-wider uppercase hover:opacity-90">
                Créer la première fiche
              </button>
          }
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {records.map(r => (
              <RecordCard key={r._id} record={r} apiBase={apiBase}
                onOpen={onOpen} onDelete={handleDelete}
                canEdit={!isInvite}
                authFetch={authFetch} user={user} />
            ))}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => load(page-1, search, type, dateDebut, dateFin)} disabled={page<=1}
                style={{ border:`1px solid ${C.border}`, color: C.navy }}
                className="px-4 py-2 text-[10px] font-bold rounded-sm disabled:opacity-30 hover:bg-green-50">
                ← Précédent
              </button>
              <span style={{ color: C.muted }} className="text-[10px]">Page {page} / {pages}</span>
              <button onClick={() => load(page+1, search, type, dateDebut, dateFin)} disabled={page>=pages}
                style={{ border:`1px solid ${C.border}`, color: C.navy }}
                className="px-4 py-2 text-[10px] font-bold rounded-sm disabled:opacity-30 hover:bg-green-50">
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Page Utilisateurs ───────────────────────────────────────────────────── */
const ROLES = { superadmin:'Super Admin', agent:'Agent', invite:'Invité' }
const ROLE_COLORS = {
  superadmin: { bg:'#fef3c7', color:'#92400e' },
  agent:      { bg:'#dcfce7', color:'#166534' },
  invite:     { bg:'#e0e7ff', color:'#3730a3' },
}

function UserModal({ user, onSave, onClose }) {
  const isNew = !user
  const [form, setForm] = useState(isNew
    ? { matricule:'', password:'', nom:'', prenom:'', role:'agent', service:'', actif:true }
    : { ...user, password:'' }
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const set = (k,v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.6)' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ border:`1.5px solid ${C.border}` }}
        className="bg-white rounded-sm shadow-2xl w-full max-w-md">

        {/* Header */}
        <div style={{ background: C.navy, color: C.gold }}
          className="px-5 py-3 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider">
            {isNew ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* Formulaire */}
        <div className="px-5 py-4 space-y-3">
          {isNew && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ color: C.muted }} className="block text-[9px] font-bold uppercase tracking-wider mb-1">Matricule *</label>
                <input value={form.matricule} onChange={e=>set('matricule',e.target.value)}
                  style={{ border:`1px solid ${C.border}`, color: C.text }}
                  className="w-full px-2 py-1.5 text-[11px] rounded-sm outline-none focus:border-[#C49A28]" />
              </div>
              <div>
                <label style={{ color: C.muted }} className="block text-[9px] font-bold uppercase tracking-wider mb-1">Mot de passe *</label>
                <input type="password" value={form.password} onChange={e=>set('password',e.target.value)}
                  style={{ border:`1px solid ${C.border}`, color: C.text }}
                  className="w-full px-2 py-1.5 text-[11px] rounded-sm outline-none focus:border-[#C49A28]" />
              </div>
            </div>
          )}
          {!isNew && (
            <div>
              <label style={{ color: C.muted }} className="block text-[9px] font-bold uppercase tracking-wider mb-1">Nouveau mot de passe (laisser vide pour ne pas changer)</label>
              <input type="password" value={form.password} onChange={e=>set('password',e.target.value)}
                placeholder="••••••••"
                style={{ border:`1px solid ${C.border}`, color: C.text }}
                className="w-full px-2 py-1.5 text-[11px] rounded-sm outline-none focus:border-[#C49A28]" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ color: C.muted }} className="block text-[9px] font-bold uppercase tracking-wider mb-1">Prénom</label>
              <input value={form.prenom||''} onChange={e=>set('prenom',e.target.value)}
                style={{ border:`1px solid ${C.border}`, color: C.text }}
                className="w-full px-2 py-1.5 text-[11px] rounded-sm outline-none focus:border-[#C49A28]" />
            </div>
            <div>
              <label style={{ color: C.muted }} className="block text-[9px] font-bold uppercase tracking-wider mb-1">Nom</label>
              <input value={form.nom||''} onChange={e=>set('nom',e.target.value)}
                style={{ border:`1px solid ${C.border}`, color: C.text }}
                className="w-full px-2 py-1.5 text-[11px] rounded-sm outline-none focus:border-[#C49A28]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ color: C.muted }} className="block text-[9px] font-bold uppercase tracking-wider mb-1">Rôle</label>
              <select value={form.role} onChange={e=>set('role',e.target.value)}
                style={{ border:`1px solid ${C.border}`, color: C.text }}
                className="w-full px-2 py-1.5 text-[11px] rounded-sm outline-none bg-white focus:border-[#C49A28]">
                <option value="superadmin">Super Admin</option>
                <option value="agent">Agent</option>
                <option value="invite">Invité</option>
              </select>
            </div>
            <div>
              <label style={{ color: C.muted }} className="block text-[9px] font-bold uppercase tracking-wider mb-1">Service</label>
              <input value={form.service||''} onChange={e=>set('service',e.target.value)}
                style={{ border:`1px solid ${C.border}`, color: C.text }}
                className="w-full px-2 py-1.5 text-[11px] rounded-sm outline-none focus:border-[#C49A28]" />
            </div>
          </div>
          {!isNew && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.actif} onChange={e=>set('actif',e.target.checked)}
                className="w-3.5 h-3.5" />
              <span style={{ color: C.text }} className="text-[11px] font-medium">Compte actif</span>
            </label>
          )}
          {err && <p className="text-red-500 text-[10px]">{err}</p>}
        </div>

        {/* Actions */}
        <div style={{ borderTop:`1px solid ${C.border}` }}
          className="px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose}
            style={{ border:`1px solid ${C.border}`, color: C.muted }}
            className="px-4 py-1.5 text-[10px] font-bold rounded-sm hover:bg-gray-50">
            Annuler
          </button>
          <button disabled={saving}
            onClick={async () => {
              setErr(''); setSaving(true)
              try { await onSave(form) }
              catch(e) { setErr(e.message) }
              finally { setSaving(false) }
            }}
            style={{ background: C.navy, color: C.gold }}
            className="px-5 py-1.5 text-[10px] font-black rounded-sm hover:opacity-90 disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Modal demande d'autorisation (agent) ────────────────────────────────── */
function AuthRequestModal({ fiche, action, apiBase, authFetch, onClose, onSent }) {
  const [motif, setMotif]   = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const actionLabel = action === 'modifier' ? 'Modifier' : 'Supprimer'
  const nom = [fiche.nom, fiche.prenoms].filter(Boolean).join(' ') || 'Sans nom'

  const send = async () => {
    setSaving(true); setErr('')
    try {
      const res = await authFetch(`${apiBase}/api/auth-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ficheId: fiche._id, action, motif }),
      })
      const json = await res.json()
      if (!res.ok) { setErr(json.error || 'Erreur.'); return }
      onSent()
    } catch { setErr('Erreur réseau.') }
    finally  { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.65)' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ border:`1.5px solid ${C.border}` }}
        className="bg-white rounded-sm shadow-2xl w-full max-w-md">

        <div style={{ background: C.navy, color: C.gold }}
          className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="text-[11px] font-black uppercase tracking-wider">Demande d'autorisation</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div style={{ background:'#fef3c7', border:'1px solid #fcd34d' }}
            className="px-3 py-2.5 rounded-sm text-[10px] text-yellow-800 leading-relaxed">
            Le délai autorisé est dépassé. Pour <strong>{actionLabel}</strong> la fiche
            <strong> « {nom} »</strong>, vous devez obtenir l'accord d'un Super Admin.
          </div>

          <div>
            <label style={{ color: C.muted }}
              className="block text-[9px] font-bold uppercase tracking-wider mb-1">
              Motif de la demande (facultatif)
            </label>
            <textarea value={motif} onChange={e=>setMotif(e.target.value)} rows={3}
              placeholder="Expliquez pourquoi cette action est nécessaire…"
              style={{ border:`1px solid ${C.border}`, color: C.text }}
              className="w-full px-3 py-2 text-[11px] rounded-sm outline-none resize-none
                focus:border-[#C49A28] transition-colors" />
          </div>

          {err && <p className="text-red-500 text-[10px]">{err}</p>}
        </div>

        <div style={{ borderTop:`1px solid ${C.border}` }}
          className="px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose}
            style={{ border:`1px solid ${C.border}`, color: C.muted }}
            className="px-4 py-1.5 text-[10px] font-bold rounded-sm hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={send} disabled={saving}
            style={{ background: C.gold, color: C.navy }}
            className="px-5 py-1.5 text-[10px] font-black rounded-sm hover:opacity-90 disabled:opacity-50">
            {saving ? 'Envoi…' : 'Envoyer la demande'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Journal d'activité ──────────────────────────────────────────────────── */
const ACTION_META = {
  login:     { label:'Connexion',    bg:'#e0e7ff', color:'#3730a3' },
  logout:    { label:'Déconnexion',  bg:'#f3f4f6', color:'#6b7280' },
  creer:     { label:'Création',     bg:'#dcfce7', color:'#166534' },
  modifier:  { label:'Modification', bg:'#fef3c7', color:'#92400e' },
  supprimer: { label:'Suppression',  bg:'#fee2e2', color:'#991b1b' },
  consulter: { label:'Consultation', bg:'#e0f2fe', color:'#0369a1' },
}

function JournalActivite({ apiBase, authFetch }) {
  const [logs, setLogs]       = useState([])
  const [users, setUsers]     = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [userId, setUserId]   = useState('')
  const [action, setAction]   = useState('')
  const [loading, setLoading] = useState(false)

  const loadUsers = async () => {
    const res  = await authFetch(`${apiBase}/api/users`)
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
  }

  const load = useCallback(async (p=1, silent=false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ page:p, limit:50 })
      if (userId) params.set('userId', userId)
      if (action) params.set('action', action)
      const res  = await authFetch(`${apiBase}/api/logs?${params}`)
      const json = await res.json()
      const newLogs = json.data || []
      setLogs(prev => JSON.stringify(prev) === JSON.stringify(newLogs) ? prev : newLogs)
      setTotal(json.total || 0)
      setPage(json.page || 1)
      setPages(json.pages || 1)
    } finally { if (!silent) setLoading(false) }
  }, [apiBase, authFetch, userId, action])

  useEffect(() => { loadUsers() }, []) // eslint-disable-line
  useEffect(() => {
    load(1)
    const interval = setInterval(() => load(page, true), 15000)
    return () => clearInterval(interval)
  }, [load]) // eslint-disable-line

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 style={{ color: C.navy }} className="text-[13px] font-black uppercase tracking-wider">
          Journal d'activité
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtre utilisateur */}
          <select value={userId} onChange={e=>setUserId(e.target.value)}
            style={{ border:`1px solid ${C.border}`, color: C.text }}
            className="text-[10px] px-2 py-1.5 rounded-sm outline-none bg-white">
            <option value="">Tous les agents</option>
            {users.map(u => (
              <option key={u._id} value={u._id}>
                {[u.prenom,u.nom].filter(Boolean).join(' ') || u.matricule}
              </option>
            ))}
          </select>
          {/* Filtre action */}
          <select value={action} onChange={e=>setAction(e.target.value)}
            style={{ border:`1px solid ${C.border}`, color: C.text }}
            className="text-[10px] px-2 py-1.5 rounded-sm outline-none bg-white">
            <option value="">Toutes les actions</option>
            {Object.entries(ACTION_META).map(([k,v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button onClick={() => load(1)} style={{ color: C.muted, border:`1px solid ${C.border}` }}
            className="px-3 py-1.5 text-[9px] font-bold rounded-sm hover:bg-green-50">
            Actualiser
          </button>
        </div>
      </div>

      <div style={{ color: C.muted }} className="text-[10px]">
        {total} entrée{total!==1?'s':''} trouvée{total!==1?'s':''}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <span className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:`${C.gold} transparent ${C.gold} ${C.gold}` }}/>
        </div>
      ) : logs.length === 0 ? (
        <div style={{ border:`1px dashed ${C.border}` }} className="rounded-sm py-6 text-center">
          <p style={{ color: C.muted }} className="text-[11px]">Aucune activité enregistrée.</p>
        </div>
      ) : (
        <>
          <div style={{ border:`1px solid ${C.border}` }} className="bg-white rounded-sm overflow-hidden">
            {/* En-tête */}
            <div style={{ background: C.navy, color: C.gold }}
              className="grid grid-cols-[1.5fr_1fr_1fr_2fr_1fr] px-4 py-2 text-[8px] font-black uppercase tracking-wider gap-2">
              <div>Utilisateur</div><div>Action</div><div>Dossier</div><div>Détails</div><div>Date</div>
            </div>
            {logs.map((l, i) => {
              const meta = ACTION_META[l.action] || { label:l.action, bg:'#f3f4f6', color:'#374151' }
              return (
                <div key={l._id}
                  style={{ borderTop: i>0 ? `1px solid ${C.border}` : 'none' }}
                  className="grid grid-cols-[1.5fr_1fr_1fr_2fr_1fr] px-4 py-2 items-center gap-2
                    hover:bg-green-50/40 transition-colors">
                  <div>
                    <div style={{ color: C.navy }} className="text-[10px] font-bold">{l.userName}</div>
                    <div style={{ color: C.muted }} className="text-[8px]">{l.userRole}</div>
                  </div>
                  <div>
                    <span style={{ background: meta.bg, color: meta.color }}
                      className="text-[8px] font-black px-2 py-0.5 rounded-sm">
                      {meta.label}
                    </span>
                  </div>
                  <div style={{ color: C.text }} className="text-[10px] truncate">{l.cible || '—'}</div>
                  <div style={{ color: C.muted }} className="text-[9px] leading-snug" title={l.details || ''}>
                    {l.details || '—'}
                  </div>
                  <div style={{ color: C.muted }} className="text-[9px] whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>
              )
            })}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <button onClick={() => load(page-1)} disabled={page<=1}
                style={{ border:`1px solid ${C.border}`, color: C.navy }}
                className="px-3 py-1.5 text-[10px] font-bold rounded-sm disabled:opacity-30 hover:bg-green-50">
                ← Précédent
              </button>
              <span style={{ color: C.muted }} className="text-[10px]">Page {page} / {pages}</span>
              <button onClick={() => load(page+1)} disabled={page>=pages}
                style={{ border:`1px solid ${C.border}`, color: C.navy }}
                className="px-3 py-1.5 text-[10px] font-bold rounded-sm disabled:opacity-30 hover:bg-green-50">
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Panneau demandes d'autorisation (superadmin, dans PageUtilisateurs) ── */
function PanneauDemandes({ apiBase, authFetch }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [pending, setPending]   = useState(0)

  const STATUS_COLORS = {
    en_attente: { bg:'#fef3c7', color:'#92400e', label:'En attente' },
    approuvee:  { bg:'#dcfce7', color:'#166534', label:'Approuvée' },
    rejetee:    { bg:'#fee2e2', color:'#991b1b', label:'Rejetée' },
  }

  const load = async (silent=false) => {
    if (!silent) setLoading(true)
    try {
      const res  = await authFetch(`${apiBase}/api/auth-requests`)
      const data = await res.json()
      const arr  = Array.isArray(data) ? data : []
      setRequests(prev => JSON.stringify(prev) === JSON.stringify(arr) ? prev : arr)
      setPending(arr.filter(r => r.status === 'en_attente').length)
    } finally { if (!silent) setLoading(false) }
  }

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), 10000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line

  const process = async (id, status) => {
    await authFetch(`${apiBase}/api/auth-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 style={{ color: C.navy }} className="text-[13px] font-black uppercase tracking-wider">
            Demandes d'autorisation
          </h2>
          {pending > 0 && (
            <span style={{ background:'#ef4444', color:'white' }}
              className="text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {pending} en attente
            </span>
          )}
        </div>
        <button onClick={() => load()} style={{ color: C.muted, border:`1px solid ${C.border}` }}
          className="px-3 py-1 text-[9px] font-bold rounded-sm hover:bg-green-50">
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <span className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:`${C.gold} transparent ${C.gold} ${C.gold}` }}/>
        </div>
      ) : requests.length === 0 ? (
        <div style={{ border:`1px dashed ${C.border}` }}
          className="rounded-sm py-6 text-center">
          <p style={{ color: C.muted }} className="text-[11px]">Aucune demande d'autorisation.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(r => {
            const sc = STATUS_COLORS[r.status]
            const actionLabel = r.action === 'modifier' ? 'Modifier' : 'Supprimer'
            return (
              <div key={r._id} style={{ border:`1px solid ${C.border}` }}
                className="bg-white rounded-sm p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ background: r.action==='modifier'?'#e0e7ff':'#fee2e2',
                      color: r.action==='modifier'?'#3730a3':'#991b1b' }}
                      className="text-[8px] font-black px-2 py-0.5 rounded-sm uppercase">
                      {actionLabel}
                    </span>
                    <span style={{ color: C.navy }} className="text-[11px] font-bold truncate">
                      {r.ficheNom || '—'}
                    </span>
                    <span style={{ background: sc.bg, color: sc.color }}
                      className="text-[8px] font-black px-2 py-0.5 rounded-sm">
                      {sc.label}
                    </span>
                  </div>
                  <div style={{ color: C.muted }} className="text-[9px] mt-1">
                    Demandé par <strong>{r.requestedByName}</strong> le {new Date(r.createdAt).toLocaleString('fr-FR')}
                  </div>
                  {r.motif && (
                    <div style={{ color: C.text, background: '#f8fafc', border:`1px solid ${C.border}` }}
                      className="text-[9px] mt-1.5 px-2 py-1 rounded-sm italic">
                      « {r.motif} »
                    </div>
                  )}
                  {r.status === 'approuvee' && r.expiresAt && (
                    <div className="text-[9px] text-green-600 mt-1">
                      Valide jusqu'au {new Date(r.expiresAt).toLocaleString('fr-FR')}
                    </div>
                  )}
                  {r.status !== 'en_attente' && (
                    <div style={{ color: C.muted }} className="text-[9px] mt-0.5">
                      Traité par {r.approvedByName} le {new Date(r.approvedAt).toLocaleString('fr-FR')}
                    </div>
                  )}
                </div>
                {r.status === 'en_attente' && (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => process(r._id, 'approuvee')}
                      style={{ background:'#dcfce7', color:'#166534' }}
                      className="px-3 py-1.5 text-[9px] font-black rounded-sm hover:opacity-80">
                      Approuver
                    </button>
                    <button onClick={() => process(r._id, 'rejetee')}
                      style={{ background:'#fee2e2', color:'#991b1b' }}
                      className="px-3 py-1.5 text-[9px] font-black rounded-sm hover:opacity-80">
                      Rejeter
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PageUtilisateurs({ apiBase, authFetch }) {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)   // null | 'new' | user object

  const load = async () => {
    try {
      setLoading(true)
      const res  = await authFetch(`${apiBase}/api/users`)
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const handleSave = async (form) => {
    const isNew = !form._id
    const url   = isNew ? `${apiBase}/api/users` : `${apiBase}/api/users/${form._id}`
    const body  = { ...form }
    if (!isNew && !body.password) delete body.password

    const res = await authFetch(url, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erreur.')
    setModal(null)
    load()
  }

  const handleDelete = async (u) => {
    if (!window.confirm(`Supprimer ${u.prenom||''} ${u.nom||u.matricule} ?`)) return
    const res = await authFetch(`${apiBase}/api/users/${u._id}`, { method:'DELETE' })
    if (!res.ok) { const j = await res.json(); alert(j.error); return }
    load()
  }

  const toggleActif = async (u) => {
    await authFetch(`${apiBase}/api/users/${u._id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ actif: !u.actif }),
    })
    load()
  }

  return (
    <div className="space-y-5">
      {modal && (
        <UserModal
          user={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ color: C.navy }} className="text-2xl font-black tracking-tight">Utilisateurs</h1>
          <p style={{ color: C.muted }} className="text-[11px] mt-0.5">{users.length} compte{users.length!==1?'s':''} enregistré{users.length!==1?'s':''}</p>
        </div>
        <button onClick={() => setModal('new')}
          style={{ background: C.navy, color: C.gold }}
          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black rounded-sm
            hover:opacity-90 tracking-wider uppercase">
          <IconPlus /> Nouvel utilisateur
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:`${C.gold} transparent ${C.gold} ${C.gold}` }}/>
        </div>
      ) : (
        <div style={{ border:`1px solid ${C.border}` }} className="bg-white rounded-sm overflow-hidden">
          {/* En-tête */}
          <div style={{ background: C.navy, color: C.gold }}
            className="grid grid-cols-[2fr_1fr_1.5fr_1fr_auto] px-4 py-2.5 text-[9px] font-black uppercase tracking-wider gap-3">
            <div>Nom / Matricule</div>
            <div>Rôle</div>
            <div>Service</div>
            <div>Statut</div>
            <div>Actions</div>
          </div>

          {users.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p style={{ color: C.muted }} className="text-[11px]">Aucun utilisateur.</p>
            </div>
          ) : users.map((u, i) => (
            <div key={u._id}
              style={{ borderTop: i>0 ? `1px solid ${C.border}` : 'none' }}
              className="grid grid-cols-[2fr_1fr_1.5fr_1fr_auto] px-4 py-3 items-center gap-3
                hover:bg-green-50/50 transition-colors">

              {/* Nom */}
              <div>
                <div style={{ color: C.navy }} className="text-[11px] font-bold">
                  {[u.prenom, u.nom].filter(Boolean).join(' ') || '—'}
                </div>
                <div style={{ color: C.muted }} className="text-[9px] font-mono">{u.matricule}</div>
              </div>

              {/* Rôle */}
              <div>
                <span style={{ background: ROLE_COLORS[u.role]?.bg, color: ROLE_COLORS[u.role]?.color }}
                  className="text-[9px] font-black px-2 py-0.5 rounded-sm">
                  {ROLES[u.role] || u.role}
                </span>
              </div>

              {/* Service */}
              <div style={{ color: C.muted }} className="text-[10px]">{u.service || '—'}</div>

              {/* Statut */}
              <div>
                <button onClick={() => toggleActif(u)}
                  style={{
                    background: u.actif ? '#dcfce7' : '#fee2e2',
                    color: u.actif ? '#166534' : '#991b1b',
                  }}
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full hover:opacity-80 transition-opacity">
                  {u.actif ? 'Actif' : 'Inactif'}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <button onClick={() => setModal(u)}
                  style={{ border:`1px solid ${C.border}`, color: C.navy }}
                  className="p-1.5 rounded-sm hover:bg-green-50 transition-colors"
                  title="Modifier">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button onClick={() => handleDelete(u)}
                  className="p-1.5 rounded-sm border border-red-200 text-red-400
                    hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Supprimer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
)

const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
)
const IconClipboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/>
  </svg>
)

function Sidebar({ active, setActive, onLogout, user, pendingCount, trashCount }) {
  const isSA = user?.role === 'superadmin'
  const navItems = [
    { id:'accueil',      label:'Accueil',       icon:<IconHome />,      badge: 0 },
    { id:'dossiers',     label:'Dossiers',      icon:<IconFolder />,    badge: 0 },
    ...(isSA ? [
      { id:'utilisateurs', label:'Utilisateurs',  icon:<IconUsers />,     badge: 0 },
      { id:'demandes',     label:'Autorisations', icon:<IconBell />,      badge: pendingCount || 0 },
      { id:'journal',      label:'Journal',       icon:<IconClipboard />, badge: 0 },
      { id:'corbeille',    label:'Corbeille',     icon:<IconTrash />,     badge: trashCount || 0, badgeColor:'#ef4444' },
    ] : []),
  ]

  return (
    <aside style={{ background: C.sidebar, width: 220, flexShrink: 0, position:'relative', overflow:'hidden' }}
      className="flex flex-col h-screen sticky top-0">

      {/* Hex pattern bg */}
      <SidebarHex />

      {/* Gold top accent line */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
        animation:'dashGlowPulse 3s ease infinite', zIndex:1 }}/>

      {/* Logo */}
      <div style={{ borderBottom:`1px solid rgba(196,154,40,0.15)`, position:'relative', zIndex:2 }} className="px-4 py-5">
        <div className="flex items-center gap-3">
          {/* Animated logo ring */}
          <div style={{ position:'relative', width:52, height:52, flexShrink:0 }}>
            {/* Outer rotating ring */}
            <div style={{
              position:'absolute', inset:-4, borderRadius:'50%',
              border:`1.5px dashed rgba(196,154,40,0.5)`,
              animation:'dashLogoRing 12s linear infinite',
            }}/>
            {/* Inner ring */}
            <div style={{
              position:'absolute', inset:-1, borderRadius:'50%',
              border:`1.5px solid rgba(196,154,40,0.25)`,
              animation:'dashLogoRingRev 8s linear infinite',
            }}/>
            <img src="/logo-gn.jpeg" alt="GN"
              style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover',
                border:`2px solid ${C.gold}`,
                boxShadow:`0 0 14px rgba(196,154,40,0.5)` }} />
          </div>
          <div>
            <div style={{ color: C.gold }} className="text-[11px] font-black tracking-[0.18em] uppercase leading-tight">
              FAED Niger
            </div>
            <div style={{ color:'rgba(196,154,40,0.45)' }} className="text-[8px] tracking-widest uppercase leading-tight mt-0.5">
              Gendarmerie Nationale
            </div>
            {/* Status dot */}
            <div className="flex items-center gap-1 mt-1.5">
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#4ade80',
                animation:'dashBlink 2s ease infinite', boxShadow:'0 0 6px #4ade80' }}/>
              <span style={{ color:'rgba(255,255,255,0.3)' }} className="text-[7px] tracking-widest">SYSTÈME ACTIF</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" style={{ position:'relative', zIndex:2 }}>
        {navItems.map(item => {
          const isActive = active === item.id
          return (
            <button key={item.id} onClick={() => setActive(item.id)}
              style={{
                background: isActive
                  ? `linear-gradient(90deg, rgba(196,154,40,0.18), rgba(196,154,40,0.06))`
                  : 'transparent',
                color: isActive ? C.gold : 'rgba(255,255,255,0.45)',
                borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
                boxShadow: isActive ? `inset 0 0 20px rgba(196,154,40,0.07)` : 'none',
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-r-sm text-left
                dash-nav-btn text-[11px] font-semibold tracking-wide">
              <span style={{ opacity: isActive ? 1 : 0.5, filter: isActive ? `drop-shadow(0 0 4px ${C.gold})` : 'none',
                transition:'filter 0.2s ease' }}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background: item.badgeColor || C.gold, color: item.badgeColor ? 'white' : C.navy }}
                  className="text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Utilisateur connecté + déconnexion */}
      <div style={{ borderTop:`1px solid rgba(196,154,40,0.12)`, position:'relative', zIndex:2 }} className="px-3 py-3 space-y-1">
        {user && (
          <div style={{ background:'rgba(196,154,40,0.06)', border:`1px solid rgba(196,154,40,0.12)` }}
            className="px-3 py-2 rounded-sm">
            <div style={{ color:'rgba(255,255,255,0.75)' }} className="text-[10px] font-bold truncate">
              {[user.prenom, user.nom].filter(Boolean).join(' ') || user.matricule}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span style={{ background:`rgba(196,154,40,0.25)`, color: C.gold, border:`1px solid rgba(196,154,40,0.3)` }}
                className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm">
                {user.role}
              </span>
              <span style={{ color:'rgba(255,255,255,0.3)' }} className="text-[8px] font-mono truncate">{user.matricule}</span>
            </div>
          </div>
        )}
        <button
          onClick={() => window.confirm('Se déconnecter ?') && onLogout()}
          style={{ color:'rgba(255,255,255,0.3)' }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-left
            dash-nav-btn text-[11px] font-semibold tracking-wide
            hover:!bg-red-900/30 hover:!text-red-400">
          <IconLogout />
          Se déconnecter
        </button>
      </div>
    </aside>
  )
}

/* ── Dashboard principal ─────────────────────────────────────────────────── */
export default function Dashboard({ apiBase, onNew, onOpen, onLogout, user, authFetch, formContent, isFormView, onExitForm }) {
  const [active, setActive]       = useState('accueil')
  const [records, setRecords]     = useState([])
  const [total, setTotal]         = useState(0)
  const [fetching, setFetching]   = useState(false)
  const [pendingCount, setPendingCount] = useState(0)  // badge sidebar demandes
  const [trashCount, setTrashCount]     = useState(0)  // badge corbeille
  const isSA     = user?.role === 'superadmin'
  const isInvite = user?.role === 'invite'

  /* Polling demandes en attente + corbeille pour badges sidebar (superadmin) */
  useEffect(() => {
    if (!isSA) return
    const checkBadges = async () => {
      try {
        const [rPending, rTrash] = await Promise.all([
          authFetch(`${apiBase}/api/auth-requests?status=en_attente`),
          authFetch(`${apiBase}/api/fiches/trash?page=1&limit=1`),
        ])
        const jPending = await rPending.json()
        const jTrash   = await rTrash.json()
        const cnt = Array.isArray(jPending) ? jPending.filter(r => r.status==='en_attente').length : 0
        setPendingCount(prev => prev === cnt ? prev : cnt)
        setTrashCount(prev => prev === (jTrash.total||0) ? prev : (jTrash.total||0))
      } catch {}
    }
    checkBadges()
    const interval = setInterval(checkBadges, 10000)
    return () => clearInterval(interval)
  }, [isSA, apiBase, authFetch])

  const loadRecent = useCallback(async (silent=false) => {
    try {
      if (!silent) setFetching(true)
      const res  = await authFetch(`${apiBase}/api/fiches?page=1&limit=6`)
      const json = await res.json()
      setRecords(prev => JSON.stringify(prev) === JSON.stringify(json.data) ? prev : json.data)
      setTotal(prev => prev === json.total ? prev : json.total)
    } finally { if (!silent) setFetching(false) }
  }, [apiBase, authFetch])

  useEffect(() => {
    loadRecent()
    const interval = setInterval(() => loadRecent(true), 15000)
    return () => clearInterval(interval)
  }, [loadRecent])

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ position:'relative' }}>
      <DashStyles />
      <MainHex />
      <ScanLine />

      {/* Sidebar */}
      <Sidebar
        active={active}
        setActive={id => { if (isFormView) onExitForm?.(); setActive(id) }}
        onLogout={onLogout}
        user={user}
        pendingCount={pendingCount}
        trashCount={trashCount}
      />

      {/* Contenu principal */}
      <main style={{ background:'#f0f4eb' }} className="flex-1 overflow-y-auto relative">

        {/* Top bar */}
        <div style={{
          background:`linear-gradient(180deg, white 0%, #fafcf8 100%)`,
          borderBottom:`1px solid ${C.border}`,
          boxShadow:'0 2px 12px rgba(28,58,14,0.06)',
        }}
          className="sticky top-0 z-10 px-8 h-14 flex items-center justify-between">

          {/* Left: breadcrumb */}
          <div className="flex items-center gap-3">
            {/* Gold accent bar */}
            <div style={{ width:3, height:22, background:`linear-gradient(180deg,${C.gold},${C.gold2})`,
              borderRadius:2, boxShadow:`0 0 8px rgba(196,154,40,0.5)` }}/>
            <div>
              <div style={{ color: C.navy }} className="text-[11px] font-black uppercase tracking-widest leading-none">
                {isFormView                               && 'Formulaire'}
                {!isFormView && active === 'accueil'      && 'Tableau de bord'}
                {!isFormView && active === 'dossiers'     && 'Dossiers'}
                {!isFormView && active === 'utilisateurs' && 'Utilisateurs'}
                {!isFormView && active === 'demandes'     && "Demandes d'autorisation"}
                {!isFormView && active === 'journal'      && "Journal d'activité"}
                {!isFormView && active === 'corbeille'    && 'Corbeille'}
              </div>
              <div style={{ color: C.muted }} className="text-[8px] tracking-wider mt-0.5">
                FAED Niger — Gendarmerie Nationale
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80',
                animation:'dashBlink 2.5s ease infinite', boxShadow:'0 0 6px #4ade80' }}/>
              <div style={{ color: C.muted }} className="text-[9px] font-mono">
                {new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' })}
              </div>
            </div>
            {!isFormView && active === 'dossiers' && (
              <button onClick={onNew}
                style={{ background:`linear-gradient(135deg,${C.navy},${C.navy3})`, color: C.gold,
                  boxShadow:`0 2px 12px rgba(28,58,14,0.3)` }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black rounded-sm
                  hover:opacity-90 tracking-wider uppercase transition-opacity">
                <IconPlus /> Nouvelle fiche
              </button>
            )}
          </div>
        </div>

        {/* Page */}
        <div className="p-8">
          {isFormView ? (
            <div>
              {/* Bouton retour */}
              <div className="mb-4">
                <button onClick={onExitForm}
                  style={{ background:'white', color: C.navy, border:`1px solid ${C.border}`,
                    boxShadow:'0 1px 6px rgba(28,58,14,0.08)' }}
                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold rounded-sm
                    hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all tracking-wider uppercase">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <line x1="19" y1="12" x2="5" y2="12"/>
                    <polyline points="12 19 5 12 12 5"/>
                  </svg>
                  Fermer le formulaire
                </button>
              </div>
              {formContent}
            </div>
          ) : fetching && active === 'accueil' ? (
            <div className="flex justify-center py-20">
              <span className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
                style={{ borderColor:`${C.gold} transparent ${C.gold} ${C.gold}` }}/>
            </div>
          ) : (
            <>
              {active === 'accueil' && (
                <PageAccueil
                  total={total} records={records} apiBase={apiBase}
                  onNew={!isInvite ? onNew : null} onOpen={onOpen}
                  user={user} authFetch={authFetch}
                  pendingCount={pendingCount}
                  trashCount={trashCount}
                  onDelete={() => { loadRecent() }}
                />
              )}
              {active === 'dossiers' && (
                <PageDossiers apiBase={apiBase} onNew={!isInvite ? onNew : null}
                  onOpen={onOpen} user={user} authFetch={authFetch} />
              )}
              {active === 'utilisateurs' && isSA && (
                <PageUtilisateurs apiBase={apiBase} authFetch={authFetch} />
              )}
              {active === 'demandes' && isSA && (
                <div className="space-y-4">
                  <div>
                    <h1 style={{ color: C.navy }} className="text-2xl font-black tracking-tight">Demandes d'autorisation</h1>
                    <p style={{ color: C.muted }} className="text-[11px] mt-0.5">Demandes de modification / suppression hors délai</p>
                  </div>
                  <PanneauDemandes apiBase={apiBase} authFetch={authFetch} />
                </div>
              )}
              {active === 'journal' && isSA && (
                <div className="space-y-4">
                  <div>
                    <h1 style={{ color: C.navy }} className="text-2xl font-black tracking-tight">Journal d'activité</h1>
                    <p style={{ color: C.muted }} className="text-[11px] mt-0.5">Historique de toutes les actions des utilisateurs</p>
                  </div>
                  <JournalActivite apiBase={apiBase} authFetch={authFetch} />
                </div>
              )}
              {active === 'corbeille' && isSA && (
                <PageCorbeille apiBase={apiBase} authFetch={authFetch} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
