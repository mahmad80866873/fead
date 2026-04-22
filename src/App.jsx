import { useEffect, useState, useRef } from 'react'
import Dashboard from './Dashboard.jsx'
import Login from './Login.jsx'

const API_BASE = (import.meta.env.VITE_API_BASE || 'https://fead-3sfa.onrender.com').replace(/\/$/, '')

/* ── Palette Gendarmerie Nationale du Niger ───────────────────────────────── */
const C = {
  navy:    '#1C3A0E',   // Vert uniforme sombre
  navy2:   '#112608',   // Vert nuit (fond profond)
  navy3:   '#2E5C1A',   // Vert militaire (béret)
  gold:    '#C49A28',   // Kaki/or (camouflage clair, insignes)
  gold2:   '#D4B050',   // Kaki hover
  goldBg:  '#f7f2e4',
  red:     '#7B3D10',   // Brun camouflage (accent)
  border:  '#7AAA55',   // Vert bordure
  cellHdr: '#EEF5E6',   // Vert très clair
  text:    '#1A3008',
  muted:   '#4A6830',
}

const REGIONS_DEPARTEMENTS = {
  agadez:   ['Arlit','Bilma','Tchirozerine','Iférouane'],
  diffa:    ['Diffa','Mainé-Soroa',"N'Guigmi",'Bosso'],
  dosso:    ['Dosso','Boboye','Dogondoutchi','Falmey','Gaya','Loga','Say'],
  maradi:   ['Maradi','Dakoro','Guidan-Roumdji','Madaoua','Mayahi','Tessaoua','Aguié'],
  niamey:   ['Niamey (Commune I)','Niamey (Commune II)','Niamey (Commune III)','Niamey (Commune IV)','Niamey (Commune V)'],
  tillaberi:['Tillabéri','Ayorou','Balleyara','Bankilaré','Filingué','Kollo','Ouallam','Say','Téra'],
  zinder:   ['Zinder','Gouré','Magaria','Matameye','Mirriah','Tanout'],
  tahoua:   ['Tahoua','Abalak','Bouza','Illéla','Keïta','Madaoua','Malbaza','Tchintabaraden'],
}

const init = {
  pn:false, gn:true, gnn:false,
  nom:'', prenoms:'', epouse:'',
  sexe:'',
  dateNaissance:'', filDe:'', etDe:'', nee:'',
  natNigerienne:false, autreNationalite:false, nationaliteAutre:'',
  lieuNaissance:'', departement:'', region:'', formule:'',
  motifs:'', nCliche:'',
  maisonArret:false, palmaire:false,
  ficheEtabliePar:'', ficheLe:'', nIU:'',
  nProcedure:'', sansProcedure:false,
  service:'', serviceRequerant:'',
  noDossier:'',
  residence:'', profession:'',
  taille:'', typeEthnique:'', teint:'', corpulence:'',
  yeuxBleu:false, yeuxMarronClair:false, yeuxVert:false, yeuxMarronFonce:false,
  yeuxLunette:false, yeuxParticularite:'',
  frontLongval:'', frontLangval:'', frontInclinval:'', frontParticul:'',
  voix:'', accent:'',
  nezLongval:'', nezLangval:'', nezInclinval:'', nezParticul:'',
  cheveuxBlond:false, cheveuxChatain:false, cheveuxRoux:false, cheveuxNoir:false,
  cheveuxDroits:false, cheveuxOndes:false, cheveuxFrises:false, cheveuxCrepus:false,
  cheveuxBarbe:false, cheveuxMoustache:false,
  cheveuxParticularite:'', coiffure:'',
  particulariteVisage:'',
  visageCicatrices:'', visageMarquesEthniques:'', visageTatouages:'', visageAmputation:'',
  troncCicatrices:'', troncMarquesEthniques:'', troncTatouages:'', troncAmputation:'',
  membresCicatrices:'', membresMarquesEthniques:'', membresTatouages:'', membresAmputation:'',
  pouceDroitCode:'', indexDroitCode:'', mediusDroitCode:'', annulaireDroitCode:'', auriculaireDroitCode:'',
  pouceGaucheCode:'', indexGaucheCode:'', mediusGaucheCode:'', annulaireGaucheCode:'', auriculaireGaucheCode:'',
  commentaireDroit1:'', commentaireDroit2:'', commentaireDroit3:'',
  commentaireGauche1:'', commentaireGauche2:'', commentaireGauche3:'',
  dateSignalement:'', agentSaisie:'', observations:'',
}

/* ── Primitives ───────────────────────────────────────────────────────────── */

function FI({ name, value, onChange, cls='', placeholder='', disabled=false, type='text' }) {
  return (
    <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      disabled={disabled} readOnly={disabled}
      style={{ color: disabled ? '#aaa' : C.text, cursor: disabled ? 'not-allowed' : 'text' }}
      className={`bg-transparent outline-none text-[11px] font-medium
        border-b-2 border-transparent focus:border-b-2 placeholder:text-slate-300
        transition-all leading-tight min-w-0 pb-0.5
        hover:border-b-slate-300 focus:border-b-[#b8922a] ${cls}`} />
  )
}

function Sq({ name, checked, onChange }) {
  return (
    <span onClick={() => onChange({ target:{ name, type:'checkbox', checked:!checked } })}
      style={checked ? { background: C.navy, borderColor: C.navy } : { borderColor: '#94a3b8' }}
      className={`inline-flex items-center justify-center w-[14px] h-[14px] border-2 cursor-pointer
        select-none flex-shrink-0 transition-all duration-150 text-[9px] font-black text-white rounded-sm`}>
      {checked && '✓'}
    </span>
  )
}

function CbField({ name, checked, onChange, label }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
      <Sq name={name} checked={checked} onChange={onChange} />
      <span style={{ color: checked ? C.navy : C.muted }}
        className="text-[10px] font-medium transition-colors group-hover:text-slate-700">{label}</span>
    </label>
  )
}

/* ── Section header bar ───────────────────────────────────────────────────── */
function SectionBar({ num, title, icon }) {
  return (
    <div style={{ background: `linear-gradient(90deg, ${C.navy} 0%, ${C.navy3} 100%)` }}
      className="flex items-center gap-3 px-4 py-2">
      <span style={{ background: C.gold, color: C.navy }}
        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0">
        {num}
      </span>
      <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{title}</span>
      {icon && <span className="ml-auto text-white opacity-30 text-base">{icon}</span>}
    </div>
  )
}

/* ── Cell: label header + content ─────────────────────────────────────────── */
function Cell({ label, children, cls='', style, borderRight=true }) {
  return (
    <div className={`flex flex-col ${borderRight ? 'border-r' : ''} ${cls}`}
      style={{ borderColor: C.border, ...style }}>
      <div style={{ background: C.cellHdr, borderBottomColor: C.border, color: C.navy }}
        className="border-b px-2 py-0.5">
        <span className="text-[8.5px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex-1 flex items-center px-2 py-1">
        {children}
      </div>
    </div>
  )
}

/* ── App ──────────────────────────────────────────────────────────────────── */
/* ── Helper fetch avec auth header ──────────────────────────────────────── */
function makeAuthFetch(user, onSessionExpired) {
  return async (url, opts = {}) => {
    const res = await fetch(url, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        'X-User-Id': user.id,
        'X-Session-Id': user.sessionId,
      },
    })

    if (res.status === 401) {
      try {
        const json = await res.clone().json()
        if (json?.code === 'SESSION_EXPIRED') onSessionExpired?.()
      } catch {}
    }

    return res
  }
}

/* ── App authentifiée ─────────────────────────────────────────────────────── */
function AuthenticatedApp({ user, onLogout }) {
  const authFetch = makeAuthFetch(user, onLogout)
  /* Navigation : 'dashboard' | 'form' */
  const [view, setView]     = useState('dashboard')
  const [editId, setEditId] = useState(null)

  const [data, setData]       = useState(init)
  const [saving, setSaving] = useState(false)
  const [error, setError]     = useState('')
  // photos : { key: { url: objectURL, b64: base64String, type: mimeType } }
  const [photos, setPhotos] = useState({ profilDroit:null, face:null, quartGauche:null })
  const photoRefs = { profilDroit:useRef(), face:useRef(), quartGauche:useRef() }
  const [pieces, setPieces]               = useState([null, null])   // nouveaux fichiers File
  const [existingPieces, setExistingPieces] = useState([])            // pièces déjà en base
  const pieceRefs = [useRef(), useRef()]
  const modifMotifRef = useRef('')                                    // motif de modification

  const onPhotoChange = key => e => {
    const f = e.target.files[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    const reader = new FileReader()
    reader.onload = ev => {
      const b64 = ev.target.result.split(',')[1]
      setPhotos(p => ({ ...p, [key]: { url, b64, type: f.type } }))
    }
    reader.readAsDataURL(f)
  }

  const onChange = e => {
    const { name, value, type, checked } = e.target
    setData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  /* Ouvrir formulaire vide */
  const handleNew = () => {
    const now = new Date().toLocaleString('fr-FR', {
      day:'2-digit', month:'2-digit', year:'numeric',
      hour:'2-digit', minute:'2-digit'
    })
    const agentName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.matricule
    setEditId(null)
    setData({ ...init, gn:true, dateSignalement: now, agentSaisie: agentName })
    setPhotos({ profilDroit:null, face:null, quartGauche:null })
    setPieces([null, null])
    setExistingPieces([])
    setError('')
    setView('form')
  }

  /* Ouvrir une fiche existante */
  const handleOpen = (record, motif = '') => {
    modifMotifRef.current = motif
    setEditId(record._id)
    setData(record)
    // Recharger les photos existantes depuis leurs URLs serveur
    setPhotos({
      profilDroit:  record.photoProfilDroit  ? { url:`${API_BASE}${record.photoProfilDroit}`,  b64:null, type:null } : null,
      face:         record.photoFace         ? { url:`${API_BASE}${record.photoFace}`,         b64:null, type:null } : null,
      quartGauche:  record.photoQuartGauche  ? { url:`${API_BASE}${record.photoQuartGauche}`,  b64:null, type:null } : null,
    })
    setPieces([null, null])
    setExistingPieces(record.pieces || [])   // charger les pièces existantes
    setError('')
    setView('form')
  }

  /* Sauvegarder la fiche dans MongoDB (sans générer/télécharger le PDF) */
  const saveFiche = async () => {
    try {
      setSaving(true); setError('')

      /* 1. Uploader les nouvelles photos sur le serveur pour persistance */
      const photoUrls = {
        profilDroit:  data.photoProfilDroit  || null,
        face:         data.photoFace         || null,
        quartGauche:  data.photoQuartGauche  || null,
      }
      const newPhotos = Object.entries(photos).filter(([, v]) => v?.b64)
      if (newPhotos.length > 0) {
        const photoForm = new FormData()
        for (const [k, v] of newPhotos) {
          const arr = Uint8Array.from(atob(v.b64), c => c.charCodeAt(0))
          const blob = new Blob([arr], { type: v.type })
          const ext  = v.type === 'image/png' ? 'png' : 'jpg'
          photoForm.append(k, blob, `${k}.${ext}`)
        }
        const upRes = await authFetch(`${API_BASE}/api/photos`, { method:'POST', body: photoForm })
        if (upRes.ok) Object.assign(photoUrls, await upRes.json())
      }

      /* 2. Sauvegarder la fiche + pièces jointes dans MongoDB */
      const dataToSave = {
        ...data,
        photoProfilDroit: photoUrls.profilDroit,
        photoFace:        photoUrls.face,
        photoQuartGauche: photoUrls.quartGauche,
      }
      const formPayload = new FormData()
      formPayload.append('data', JSON.stringify(dataToSave))
      formPayload.append('existingPieces', JSON.stringify(existingPieces))
      if (editId && modifMotifRef.current) formPayload.append('_motif', modifMotifRef.current)
      pieces.filter(Boolean).forEach(f => formPayload.append('pieces', f))

      const method = editId ? 'PUT' : 'POST'
      const url    = editId
        ? `${API_BASE}/api/fiches/${editId}`
        : `${API_BASE}/api/fiches`

      const saveRes = await authFetch(url, { method, body: formPayload })
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}))
        throw new Error(err.error || 'Sauvegarde échouée.')
      }

      setView('dashboard')
    } catch (err) {
      setError(err.message || "Erreur. Vérifiez que l'API est active (port 4000).")
    } finally {
      setSaving(false)
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */

  /* Contenu formulaire (injecté dans Dashboard quand view==='form') */
  const formContent = view === 'form' ? (
    <div className="space-y-6">
      {/* Titre page */}
      <div>
        <h1 style={{ color: C.navy }} className="text-2xl font-black tracking-tight">
          {editId ? 'Modifier la fiche' : 'Nouvelle fiche'}
        </h1>
        <p style={{ color: C.muted }} className="text-[11px] mt-0.5">
          {editId ? 'Mise à jour du dossier FAED' : 'Création d\'un nouveau dossier FAED'}
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded">
          {error}
        </p>
      )}

      <div className="space-y-10">

        {/* ══════════════════════════ PAGE 1 ══════════════════════════════ */}
        <div>
          {/* Page label */}
          <div style={{ color: C.gold2 }} className="text-[9px] font-bold tracking-[0.3em] uppercase mb-2 pl-1">
            — Fiche n° 01 / Identification
          </div>

          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <div className="bg-white shadow-2xl overflow-hidden min-w-[600px]"
            style={{ border: `1.5px solid ${C.border}`, borderTop: `4px solid ${C.navy3}` }}>

            {/* ── EN-TÊTE ─────────────────────────────────────────────── */}
            <div style={{ background: `linear-gradient(90deg, ${C.navy} 0%, ${C.navy3} 100%)` }}
              className="flex items-stretch">
              {/* Logo / Titre */}
              <div className="flex-1 px-8 py-4 flex flex-col justify-center"
                style={{ borderRight: `1px solid rgba(255,255,255,0.1)` }}>
                <div style={{ color: C.gold }} className="text-[8px] font-bold tracking-[0.35em] uppercase mb-0.5">
                  République du Niger
                </div>
                <div className="text-white text-[20px] font-black tracking-[0.2em] uppercase leading-tight">
                  FAED NIGER
                </div>
                <div className="text-[8px] text-slate-400 tracking-widest mt-0.5 uppercase">
                  Photographie Signalétique
                </div>
              </div>
              {/* Type : GN uniquement */}
              <div className="flex flex-col justify-center gap-1 px-6">
                <span style={{ color: C.gold, fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform:'uppercase' }}>Type</span>
                <span style={{ color: C.gold, fontSize: 16, fontWeight: 900, letterSpacing: '0.2em' }}>GN</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8 }}>Gendarmerie Nationale</span>
              </div>
            </div>

            {/* ── SECTION 1 : IDENTITÉ ──────────────────────────────── */}
            <SectionBar num="1" title="Informations d'Identité" />

            {/* NOM | PRENOMS | EPOUSE */}
            <div className="flex" style={{ borderBottom: `1px solid ${C.border}`, minHeight: 52 }}>
              {[['Nom','nom'],['Prénom(s)','prenoms'],['Épouse / Époux','epouse']].map(([label, name], i) => (
                <Cell key={name} label={label} borderRight={i < 2} cls="flex-1">
                  <FI name={name} value={data[name]} onChange={onChange} cls="w-full" />
                </Cell>
              ))}
            </div>

            {/* SEXE | DATE DE NAISSANCE | FILIATION | NATIONALITÉ */}
            <div className="flex" style={{ borderBottom: `1px solid ${C.border}`, minHeight: 60 }}>

              <Cell label="Sexe" cls="shrink-0" style={{ width: 56 }}>
                <div className="flex flex-col gap-1.5">
                  {['M','F'].map(v => (
                    <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                      <Sq name="sexe" checked={data.sexe === v}
                        onChange={() => setData(p => ({ ...p, sexe: v }))} />
                      <span style={{ color: data.sexe === v ? C.navy : C.muted }}
                        className="text-[11px] font-bold">{v}</span>
                    </label>
                  ))}
                </div>
              </Cell>

              <Cell label="Date de naissance" cls="shrink-0" style={{ width: 130 }}>
                <FI name="dateNaissance" value={data.dateNaissance} onChange={onChange}
                  cls="w-full" type="date" />
              </Cell>

              <Cell label="Filiation — Fils/Fille de … et de … Surnom" cls="flex-1">
                <div className="flex items-center gap-2 flex-wrap w-full">
                  <span style={{ color: C.muted }} className="text-[9px] font-bold shrink-0">Fils de :</span>
                  <FI name="filDe" value={data.filDe} onChange={onChange} cls="flex-1 min-w-[40px]" />
                  <span style={{ color: C.muted }} className="text-[9px] font-bold shrink-0">et de :</span>
                  <FI name="etDe" value={data.etDe} onChange={onChange} cls="flex-1 min-w-[40px]" />
                  <span style={{ color: C.muted }} className="text-[9px] font-bold shrink-0">Surnom :</span>
                  <FI name="nee" value={data.nee} onChange={onChange} cls="flex-1 min-w-[40px]" />
                </div>
              </Cell>

              <Cell label="Nationalité" cls="shrink-0" borderRight={false} style={{ width: 140 }}>
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="radio" name="nationaliteChoix" value="nigerienne"
                      checked={data.natNigerienne}
                      onChange={() => setData(p => ({ ...p, natNigerienne:true, autreNationalite:false, nationaliteAutre:'' }))}
                      className="accent-[#1C3A0E]" />
                    <span style={{ color: data.natNigerienne ? C.navy : C.muted }} className="text-[10px] font-medium">Nat. Nigérienne</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="radio" name="nationaliteChoix" value="autre"
                      checked={data.autreNationalite}
                      onChange={() => setData(p => ({ ...p, natNigerienne:false, autreNationalite:true }))}
                      className="accent-[#1C3A0E]" />
                    <span style={{ color: data.autreNationalite ? C.navy : C.muted }} className="text-[10px] font-medium">Autre</span>
                  </label>
                  {data.autreNationalite && (
                    <FI name="nationaliteAutre" value={data.nationaliteAutre} onChange={onChange}
                      cls="w-full" placeholder="Préciser…" />
                  )}
                </div>
              </Cell>
            </div>

            {/* LIEU | RÉGION | DÉPARTEMENT | FORMULE */}
            <div className="flex" style={{ borderBottom: `1px solid ${C.border}`, minHeight: 52 }}>
              <Cell label="Lieu de naissance" cls="flex-1">
                <FI name="lieuNaissance" value={data.lieuNaissance} onChange={onChange} cls="w-full" />
              </Cell>
              <Cell label="Région" cls="flex-1">
                <div className="flex flex-col gap-1 w-full">
                  {(() => {
                    const knownRegions = Object.keys(REGIONS_DEPARTEMENTS)
                    const inList = knownRegions.includes(data.region)
                    const isCustom = !inList && data.region !== ''
                    return <>
                      <select
                        value={isCustom ? '__autre' : data.region}
                        onChange={e => {
                          if (e.target.value === '__autre') setData(p => ({ ...p, region: ' ', departement: '' }))
                          else setData(p => ({ ...p, region: e.target.value, departement: '' }))
                        }}
                        style={{ color: C.text, borderBottomColor: C.border }}
                        className="w-full text-[11px] bg-transparent outline-none border-b py-0.5">
                        <option value="">— Sélectionner —</option>
                        {knownRegions.map(r => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                        <option value="__autre">Autre (saisir)…</option>
                      </select>
                      {isCustom && (
                        <FI name="region" value={data.region.trim()}
                          onChange={e => setData(p => ({ ...p, region: e.target.value, departement: '' }))}
                          cls="w-full" placeholder="Saisir la région…" />
                      )}
                    </>
                  })()}
                </div>
              </Cell>
              <Cell label="Département" cls="flex-1">
                <div className="flex flex-col gap-1 w-full">
                  {(() => {
                    const list = REGIONS_DEPARTEMENTS[data.region] || []
                    const inList = list.includes(data.departement)
                    const isCustom = !inList && data.departement !== ''
                    return <>
                      <select
                        value={isCustom ? '__autre' : data.departement}
                        onChange={e => {
                          if (e.target.value === '__autre') setData(p => ({ ...p, departement: ' ' }))
                          else setData(p => ({ ...p, departement: e.target.value }))
                        }}
                        style={{ color: C.text, borderBottomColor: C.border }}
                        className="w-full text-[11px] bg-transparent outline-none border-b py-0.5">
                        <option value="">— Sélectionner —</option>
                        {list.map(d => <option key={d} value={d}>{d}</option>)}
                        <option value="__autre">Autre (saisir)…</option>
                      </select>
                      {isCustom && (
                        <FI name="departement" value={data.departement.trim()} onChange={onChange}
                          cls="w-full" placeholder="Saisir le département…" />
                      )}
                    </>
                  })()}
                </div>
              </Cell>
              <Cell label="Formule Digitale" cls="shrink-0" borderRight={false} style={{ width: 130 }}>
                <FI name="formule" value={data.formule} onChange={onChange} cls="w-full" />
              </Cell>
            </div>

            {/* MOTIFS + N°CLICHÉ + MAISON D'ARRÊT / PALMAIRE */}
            <div className="flex" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="flex-1" style={{ borderRight: `1px solid ${C.border}` }}>
                <div style={{ background: C.cellHdr, borderBottom: `1px solid ${C.border}`, color: C.navy }}
                  className="px-2 py-0.5">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider">Motif(s)</span>
                </div>
                <textarea name="motifs" value={data.motifs} onChange={onChange} rows={4}
                  style={{ color: C.text }}
                  className="w-full bg-transparent outline-none resize-none text-[11px] px-2 py-2
                    focus:bg-blue-50/30 transition-colors" />
              </div>
              <div className="flex flex-col shrink-0" style={{ width: 160 }}>
                <Cell label="N° Cliché" borderRight={false}
                  style={{ borderBottom: `1px solid ${C.border}` }}>
                  <FI name="nCliche" value={data.nCliche} onChange={onChange} cls="w-full" />
                </Cell>
                <div className="flex flex-1">
                  <Cell label="Maison d'arrêt" cls="flex-1"
                    style={{ borderBottom: 'none', borderRight: `1px solid ${C.border}` }}>
                    <Sq name="maisonArret" checked={data.maisonArret} onChange={onChange} />
                  </Cell>
                  <Cell label="Palmaire" cls="flex-1" borderRight={false} style={{ borderBottom: 'none' }}>
                    <Sq name="palmaire" checked={data.palmaire} onChange={onChange} />
                  </Cell>
                </div>
              </div>
            </div>

            {/* FICHE ÉTABLIE + N° PROCÉDURE */}
            <div className="flex" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="flex-1 flex items-center gap-2 px-3 py-2 flex-wrap"
                style={{ borderRight: `1px solid ${C.border}` }}>
                <span style={{ color: C.muted }} className="text-[9px] font-bold shrink-0">Fiche établie par :</span>
                <FI name="ficheEtabliePar" value={data.ficheEtabliePar} onChange={onChange} cls="flex-1 min-w-[60px]" />
                <span style={{ color: C.muted }} className="text-[9px] font-bold shrink-0">le :</span>
                <FI name="ficheLe" value={data.ficheLe} onChange={onChange} cls="w-28" type="date" />
                <span style={{ color: C.muted }} className="text-[9px] font-bold shrink-0">n° IJ :</span>
                <FI name="nIU" value={data.nIU} onChange={onChange} cls="w-16" />
              </div>
              <div className="flex flex-col justify-center gap-2 px-4 py-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span style={{ color: C.muted }} className="text-[9px] font-bold shrink-0">N° de procédure :</span>
                  <FI name="nProcedure" value={data.sansProcedure ? '' : data.nProcedure} onChange={onChange}
                    cls="w-20" placeholder={data.sansProcedure ? '—' : ''} disabled={data.sansProcedure} />
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" name="sansProcedure" checked={data.sansProcedure}
                    onChange={e => setData(p => ({ ...p, sansProcedure: e.target.checked, nProcedure: e.target.checked ? '' : p.nProcedure }))}
                    className="accent-[#1C3A0E]" />
                  <span style={{ color: data.sansProcedure ? C.navy : C.muted }} className="text-[10px] font-medium">Sans procédure</span>
                </label>
              </div>
            </div>

            {/* SERVICE */}
            <div className="flex" style={{ borderBottom: `1px solid ${C.border}`, minHeight: 48 }}>
              <Cell label="Service" cls="flex-1">
                <FI name="service" value={data.service} onChange={onChange} cls="w-full" />
              </Cell>
              <Cell label="Service requérant" cls="flex-1" borderRight={false}>
                <FI name="serviceRequerant" value={data.serviceRequerant} onChange={onChange} cls="w-full" />
              </Cell>
            </div>

            {/* ── SECTION 2 : EMPREINTES ────────────────────────────── */}
            <SectionBar num="2" title="Empreintes Digitales" />

            {/* Separator décoratif */}
            <div style={{ background: C.cellHdr, borderBottom: `1px solid ${C.border}` }}
              className="flex items-center gap-1 px-4 py-1 overflow-hidden">
              {Array.from({ length: 60 }).map((_, i) => (
                <div key={i} className="shrink-0 rounded-full"
                  style={{ width: 6, height: 6, background: i % 3 === 0 ? C.navy : C.border }} />
              ))}
            </div>

            {/* MAIN DROITE */}
            <div className="flex" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 48, background: C.navy, borderRight: `1px solid ${C.border}` }}
                className="flex items-center justify-center shrink-0">
                <span className="text-[8px] font-black text-white tracking-widest uppercase"
                  style={{ writingMode:'vertical-rl', transform:'rotate(180deg)' }}>Main Droite</span>
              </div>
              <div className="flex flex-col flex-1">
                {/* 5 doigts */}
                <div className="flex" style={{ minHeight: 110 }}>
                  {[['Pouce','pouceDroitCode'],['Index','indexDroitCode'],['Médius','mediusDroitCode'],
                    ['Annulaire','annulaireDroitCode'],['Auriculaire','auriculaireDroitCode']].map(([f,n], i) => (
                    <div key={f} className="flex-1 flex flex-col"
                      style={{ borderRight: i < 4 ? `1px solid ${C.border}` : 'none' }}>
                      <div className="flex-1" style={{ background: '#f8fafc', borderBottom: `1px dashed ${C.border}` }} />
                      <div className="px-1 py-1.5" style={{ borderTop: `1px solid ${C.border}` }}>
                        <div style={{ color: C.navy }} className="text-center text-[8px] font-bold mb-1 uppercase">{f}</div>
                        <FI name={n} value={data[n]} onChange={onChange}
                          cls="w-full text-center text-[10px]" placeholder="—" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MAIN GAUCHE */}
            <div className="flex" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 48, background: C.navy2, borderRight: `1px solid ${C.border}` }}
                className="flex items-center justify-center shrink-0">
                <span className="text-[8px] font-black text-white tracking-widest uppercase"
                  style={{ writingMode:'vertical-rl', transform:'rotate(180deg)' }}>Main Gauche</span>
              </div>
              <div className="flex flex-col flex-1">
                {/* 5 doigts */}
                <div className="flex" style={{ minHeight: 110 }}>
                  {[['Pouce','pouceGaucheCode'],['Index','indexGaucheCode'],['Médius','mediusGaucheCode'],
                    ['Annulaire','annulaireGaucheCode'],['Auriculaire','auriculaireGaucheCode']].map(([f,n], i) => (
                    <div key={f} className="flex-1 flex flex-col"
                      style={{ borderRight: i < 4 ? `1px solid ${C.border}` : 'none' }}>
                      <div className="flex-1" style={{ background:'#f8fafc', borderBottom:`1px dashed ${C.border}` }} />
                      <div className="px-1 py-1.5" style={{ borderTop:`1px solid ${C.border}` }}>
                        <div style={{ color: C.navy2 }} className="text-center text-[8px] font-bold mb-1 uppercase">{f}</div>
                        <FI name={n} value={data[n]} onChange={onChange}
                          cls="w-full text-center text-[10px]" placeholder="—" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
          </div>{/* end overflow-x-auto page 1 */}
        </div>

        {/* ══════════════════════════ PAGE 2 ══════════════════════════════ */}
        <div>
          <div style={{ color: C.gold2 }} className="text-[9px] font-bold tracking-[0.3em] uppercase mb-2 pl-1">
            — Fiche n° 02 / Photographie signalétique
          </div>

          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <div className="bg-white shadow-2xl overflow-hidden min-w-[600px]"
            style={{ border: `1.5px solid ${C.border}`, borderTop: `4px solid ${C.gold}` }}>

            {/* En-tête page 2 */}
            <div style={{ background: `linear-gradient(90deg, ${C.navy2} 0%, ${C.navy3} 100%)` }}
              className="px-8 py-3 flex items-center justify-between">
              <div>
                <div style={{ color: C.gold }} className="text-[8px] font-bold tracking-[0.3em] uppercase mb-0.5">
                  Notice Individuelle
                </div>
                <div className="text-white text-[15px] font-black tracking-wide uppercase">
                  Photographie Signalétique
                </div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.15)' }} className="text-5xl font-black select-none">02</div>
            </div>

            {/* ── SECTION 3 : PHOTOGRAPHIES ─────────────────────────── */}
            <SectionBar num="3" title="Photographies" />

            <div className="flex" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 40, background: C.navy, borderRight:`1px solid ${C.border}` }}
                className="flex items-center justify-center shrink-0">
                <span className="text-[8px] font-black text-white uppercase tracking-widest"
                  style={{ writingMode:'vertical-rl', transform:'rotate(180deg)' }}>Photos</span>
              </div>
              <div className="flex flex-1">
                {[['PROFIL DROIT','profilDroit'],['FACE','face'],['3/4 GAUCHE','quartGauche']].map(([label, key], i) => (
                  <div key={key} className="flex-1 flex flex-col"
                    style={{ borderRight: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ background: C.cellHdr, borderBottom:`1px solid ${C.border}`, color: C.navy }}
                      className="text-center py-0.5">
                      <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-2 cursor-pointer
                      hover:bg-slate-50 transition-colors group relative" style={{ minHeight: 140 }}
                      onClick={() => photoRefs[key].current.click()}>
                      {photos[key]
                        ? <>
                            <img src={photos[key].url} alt={label}
                              className="max-h-32 max-w-full object-contain rounded shadow" />
                            <button
                              onClick={e => { e.stopPropagation(); setPhotos(p => ({ ...p, [key]: null })) }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white shadow
                                flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                              </svg>
                            </button>
                          </>
                        : <div className="flex flex-col items-center gap-2">
                            <div style={{ border:`1.5px dashed ${C.border}`, color: C.border }}
                              className="w-16 h-20 rounded flex items-center justify-center group-hover:border-slate-400 transition-colors">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                              </svg>
                            </div>
                            <span style={{ color: C.border }} className="text-[8px] uppercase tracking-wide
                              group-hover:text-slate-400 transition-colors">Cliquer pour ajouter</span>
                          </div>
                      }
                      <input ref={photoRefs[key]} type="file" accept="image/*"
                        className="hidden" onChange={onPhotoChange(key)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SECTION 4 : ÉTAT CIVIL ────────────────────────────── */}
            <SectionBar num="4" title="État Civil & Résidence" />

            <div className="flex" style={{ borderBottom: `1px solid ${C.border}`, minHeight: 52 }}>
              <Cell label="Résidence" cls="flex-1">
                <FI name="residence" value={data.residence} onChange={onChange} cls="w-full" />
              </Cell>
              <Cell label="Profession" cls="flex-1" borderRight={false}>
                <FI name="profession" value={data.profession} onChange={onChange} cls="w-full" />
              </Cell>
            </div>

            {/* ── SECTION 5 : CARACTÉRISTIQUES PHYSIQUES ────────────── */}
            <SectionBar num="5" title="Caractéristiques Physiques" />

            <div className="flex" style={{ borderBottom: `1px solid ${C.border}` }}>

              {/* Signalement général */}
              <div className="flex flex-col shrink-0" style={{ width: 140, borderRight:`1px solid ${C.border}` }}>
                <div style={{ background: C.cellHdr, borderBottom:`1px solid ${C.border}`, color: C.navy }}
                  className="px-2 py-0.5">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider">Morphologie</span>
                </div>
                <div className="p-2 space-y-2.5">
                  {[['TAILLE','taille'],['TYPE ETH.','typeEthnique'],['TEINT','teint'],['CORPULENCE','corpulence']].map(([l,n]) => (
                    <div key={n} className="flex items-center gap-1">
                      <span style={{ color: C.muted, minWidth: 58 }} className="text-[9px] font-bold shrink-0">{l} :</span>
                      <FI name={n} value={data[n]} onChange={onChange} cls="flex-1" />
                    </div>
                  ))}
                </div>
              </div>

              {/* YEUX */}
              <div className="flex flex-col shrink-0" style={{ width: 185, borderRight:`1px solid ${C.border}` }}>
                <div style={{ background: C.cellHdr, borderBottom:`1px solid ${C.border}`, color: C.navy }}
                  className="px-2 py-0.5">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider">Yeux</span>
                </div>
                <div className="p-2 space-y-1.5">
                  {/* Couleur — choix unique */}
                  <span style={{ color: C.muted }} className="text-[8px] font-bold uppercase tracking-wider">Couleur :</span>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {[['yeuxBleu','bleu'],['yeuxMarronClair','marron clair'],['yeuxVert','vert'],['yeuxMarronFonce','marron foncé']].map(([n,l]) => (
                      <label key={n} className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input type="radio" name="yeuxCouleur" value={n}
                          checked={data[n]}
                          onChange={() => setData(p => ({
                            ...p,
                            yeuxBleu:false, yeuxMarronClair:false, yeuxVert:false, yeuxMarronFonce:false,
                            [n]: true
                          }))}
                          className="accent-[#1C3A0E]" />
                        <span style={{ color: data[n] ? C.navy : C.muted }} className="text-[10px] font-medium">{l}</span>
                      </label>
                    ))}
                  </div>
                  <CbField name="yeuxLunette" checked={data.yeuxLunette} onChange={onChange} label="Lunettes" />
                  <div className="flex items-center gap-1">
                    <span style={{ color: C.muted }} className="text-[9px] font-bold shrink-0">Particul. :</span>
                    <FI name="yeuxParticularite" value={data.yeuxParticularite} onChange={onChange} cls="flex-1" />
                  </div>
                  <div style={{ borderTop:`1px solid ${C.border}` }} className="pt-2 space-y-1.5">
                    {[['Voix','voix'],['Accent','accent']].map(([l,n]) => (
                      <div key={n} className="flex items-center gap-1">
                        <span style={{ color: C.muted, minWidth: 44 }} className="text-[9px] font-bold shrink-0">{l} :</span>
                        <FI name={n} value={data[n]} onChange={onChange} cls="flex-1" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* FRONT */}
              <div className="flex flex-col shrink-0" style={{ width: 130, borderRight:`1px solid ${C.border}` }}>
                <div style={{ background: C.cellHdr, borderBottom:`1px solid ${C.border}`, color: C.navy }}
                  className="px-2 py-0.5">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider">Front</span>
                </div>
                <div className="p-2 space-y-2">
                  {[['frontLongval','Long :'],['frontLangval','Larg :'],['frontInclinval','Inclin.']].map(([n,l]) => (
                    <div key={n} className="flex items-center gap-1">
                      <span style={{ color: C.muted, minWidth: 42 }} className="text-[9px] font-bold shrink-0">{l}</span>
                      <FI name={n} value={data[n]||''} onChange={onChange} cls="w-16" />
                    </div>
                  ))}
                  <div style={{ borderTop:`1px solid ${C.border}` }} className="pt-1.5 flex items-center gap-1">
                    <span style={{ color: C.muted }} className="text-[9px] font-bold shrink-0">Particul. :</span>
                    <FI name="frontParticul" value={data.frontParticul} onChange={onChange} cls="flex-1" />
                  </div>
                </div>
              </div>

              {/* NEZ */}
              <div className="flex flex-col flex-1">
                <div style={{ background: C.cellHdr, borderBottom:`1px solid ${C.border}`, color: C.navy }}
                  className="px-2 py-0.5">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider">Nez</span>
                </div>
                <div className="p-2 space-y-2">
                  {[['nezLongval','Long :'],['nezLangval','Larg :'],['nezInclinval','Inclin.']].map(([n,l]) => (
                    <div key={n} className="flex items-center gap-1">
                      <span style={{ color: C.muted, minWidth: 42 }} className="text-[9px] font-bold shrink-0">{l}</span>
                      <FI name={n} value={data[n]||''} onChange={onChange} cls="w-16" />
                    </div>
                  ))}
                  <div style={{ borderTop:`1px solid ${C.border}` }} className="pt-1.5 flex items-center gap-1">
                    <span style={{ color: C.muted }} className="text-[9px] font-bold shrink-0">Particul. :</span>
                    <FI name="nezParticul" value={data.nezParticul} onChange={onChange} cls="flex-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* CHEVEUX */}
            <div style={{ borderBottom:`1px solid ${C.border}` }}>
              <div style={{ background: C.cellHdr, borderBottom:`1px solid ${C.border}`, color: C.navy }}
                className="px-2 py-0.5">
                <span className="text-[8.5px] font-bold uppercase tracking-wider">Cheveux &amp; Pilosité</span>
              </div>
              <div className="px-3 py-2 space-y-2">
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  {/* Couleur — choix unique */}
                  <div className="space-y-1">
                    <span style={{ color: C.muted }} className="text-[8px] font-bold uppercase tracking-wider block">Couleur :</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {[['cheveuxBlond','blond'],['cheveuxChatain','châtain'],['cheveuxRoux','roux'],['cheveuxNoir','noir']].map(([n,l]) => (
                        <label key={n} className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input type="radio" name="cheveuxCouleur" value={n}
                            checked={data[n]}
                            onChange={() => setData(p => ({
                              ...p,
                              cheveuxBlond:false, cheveuxChatain:false, cheveuxRoux:false, cheveuxNoir:false,
                              [n]: true
                            }))}
                            className="accent-[#1C3A0E]" />
                          <span style={{ color: data[n] ? C.navy : C.muted }} className="text-[10px] font-medium">{l}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Texture — choix unique */}
                  <div className="space-y-1">
                    <span style={{ color: C.muted }} className="text-[8px] font-bold uppercase tracking-wider block">Texture :</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {[['cheveuxDroits','droits'],['cheveuxOndes','ondés'],['cheveuxFrises','frisés'],['cheveuxCrepus','crépus']].map(([n,l]) => (
                        <label key={n} className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input type="radio" name="cheveuxTexture" value={n}
                            checked={data[n]}
                            onChange={() => setData(p => ({
                              ...p,
                              cheveuxDroits:false, cheveuxOndes:false, cheveuxFrises:false, cheveuxCrepus:false,
                              [n]: true
                            }))}
                            className="accent-[#1C3A0E]" />
                          <span style={{ color: data[n] ? C.navy : C.muted }} className="text-[10px] font-medium">{l}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Pilosité — cases indépendantes */}
                  <div className="space-y-1">
                    <span style={{ color: C.muted }} className="text-[8px] font-bold uppercase tracking-wider block">Pilosité :</span>
                    <div className="flex gap-4">
                      <CbField name="cheveuxBarbe" checked={data.cheveuxBarbe} onChange={onChange} label="Barbe" />
                      <CbField name="cheveuxMoustache" checked={data.cheveuxMoustache} onChange={onChange} label="Moustache" />
                    </div>
                  </div>
                </div>
                <div style={{ borderTop:`1px solid ${C.border}` }} className="pt-2 flex items-center gap-6">
                  {[['cheveuxParticularite','Particularité'],['coiffure','Coiffure']].map(([n,l]) => (
                    <div key={n} className="flex items-center gap-2">
                      <span style={{ color: C.muted }} className="text-[9px] font-bold shrink-0">{l} :</span>
                      <FI name={n} value={data[n]} onChange={onChange} cls="w-32" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PARTICULARITÉ VISAGE */}
            <div style={{ borderBottom:`1px solid ${C.border}`, minHeight: 44 }}>
              <Cell label="Particularité du visage" borderRight={false}>
                <FI name="particulariteVisage" value={data.particulariteVisage} onChange={onChange} cls="w-full" />
              </Cell>
            </div>

            {/* ── SECTION 6 : MARQUES PARTICULIÈRES ────────────────── */}
            <SectionBar num="6" title="Marques Particulières du Corps" />

            <div className="px-3 py-3">
              <table className="w-full border-collapse text-[10px]"
                style={{ border:`1.5px solid ${C.navy}` }}>
                <thead>
                  <tr style={{ background: C.navy }}>
                    <th className="p-2 text-white font-black text-[9px] uppercase tracking-wider w-16"></th>
                    {['Cicatrices','Marques ethniques','Tatouages','Amputation'].map(h => (
                      <th key={h} style={{ borderLeft:`1px solid rgba(255,255,255,0.15)` }}
                        className="p-2 text-white font-black text-[9px] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[['visage','VISAGE'],['tronc','TRONC'],['membres','MEMBRES']].map(([key, label], ri) => (
                    <tr key={key} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ borderTop:`1px solid ${C.border}`, color: C.navy }}
                        className="text-center font-black text-[9px] uppercase align-middle p-2 tracking-wider">
                        {label}
                      </td>
                      {['Cicatrices','MarquesEthniques','Tatouages','Amputation'].map(field => (
                        <td key={field}
                          style={{ borderTop:`1px solid ${C.border}`, borderLeft:`1px solid ${C.border}`, height: 60 }}>
                          <textarea name={`${key}${field}`} value={data[`${key}${field}`]||''}
                            onChange={onChange}
                            className="w-full h-full bg-transparent outline-none resize-none text-[10px] p-1.5
                              text-center transition-colors focus:bg-blue-50/50"
                            style={{ color: C.text }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── SECTION 7 : INFORMATIONS SUPPLÉMENTAIRES ─────────── */}
            <SectionBar num="7" title="Informations Supplémentaires" />

            <div className="flex" style={{ borderBottom:`1px solid ${C.border}`, minHeight: 52 }}>
              <Cell label="Date de signalement" cls="shrink-0" style={{ width: 170 }}>
                <span style={{ color: C.text }} className="text-[11px] font-medium">
                  {data.dateSignalement || '—'}
                </span>
              </Cell>
              <Cell label="Agent de saisie" cls="flex-1">
                <span style={{ color: C.text }} className="text-[11px] font-medium">
                  {data.agentSaisie || '—'}
                </span>
              </Cell>
            </div>
            <div style={{ borderBottom:`1px solid ${C.border}` }}>
              <div style={{ background: C.cellHdr, borderBottom:`1px solid ${C.border}`, color: C.navy }}
                className="px-2 py-0.5">
                <span className="text-[8.5px] font-bold uppercase tracking-wider">Observations</span>
              </div>
              <textarea name="observations" value={data.observations} onChange={onChange} rows={3}
                style={{ color: C.text }}
                className="w-full bg-transparent outline-none resize-none text-[11px] px-3 py-2
                  focus:bg-blue-50/30 transition-colors" />
            </div>

            {/* ── SECTION 8 : PIÈCES JOINTES ───────────────────────── */}
            <SectionBar num="8" title="Pièces Jointes" />

            {/* Pièces existantes (chargées depuis la base) */}
            {existingPieces.length > 0 && (
              <div style={{ background: C.cellHdr, borderBottom:`1px solid ${C.border}` }}
                className="px-4 py-2 flex flex-wrap gap-2 items-center">
                <span style={{ color: C.navy }} className="text-[8.5px] font-bold uppercase tracking-wider shrink-0">
                  Fichiers enregistrés :
                </span>
                {existingPieces.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-white rounded px-2 py-1"
                    style={{ border:`1px solid ${C.border}` }}>
                    <a href={`${API_BASE}${p.url}`} target="_blank" rel="noreferrer"
                      style={{ color: C.navy }} className="text-[9px] font-semibold hover:underline truncate max-w-[140px]">
                      {p.originalName}
                    </a>
                    <span style={{ color: C.muted }} className="text-[8px]">
                      {p.size < 1024*1024 ? `${(p.size/1024).toFixed(0)} Ko` : `${(p.size/1024/1024).toFixed(1)} Mo`}
                    </span>
                    <button onClick={() => setExistingPieces(prev => prev.filter((_,j) => j !== i))}
                      className="text-slate-400 hover:text-red-500 transition-colors ml-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Nouvelles pièces à joindre */}
            <div className="flex" style={{ borderBottom:`1px solid ${C.border}` }}>
              {[0, 1].map(i => (
                <div key={i} className="flex-1 flex flex-col"
                  style={{ borderRight: i === 0 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ background: C.cellHdr, borderBottom:`1px solid ${C.border}`, color: C.navy }}
                    className="px-2 py-0.5">
                    <span className="text-[8.5px] font-bold uppercase tracking-wider">
                      {editId ? `Remplacer / Ajouter (${i+1})` : `Pièce jointe ${i + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    {pieces[i] ? (
                      <>
                        <div style={{ background: C.navy, color: 'white' }}
                          className="w-9 h-9 rounded flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div style={{ color: C.text }} className="text-[11px] font-semibold truncate">{pieces[i].name}</div>
                          <div style={{ color: C.muted }} className="text-[9px]">
                            {pieces[i].size < 1024*1024
                              ? `${(pieces[i].size/1024).toFixed(0)} Ko`
                              : `${(pieces[i].size/1024/1024).toFixed(1)} Mo`}
                          </div>
                        </div>
                        <button onClick={() => setPieces(p => { const n=[...p]; n[i]=null; return n })}
                          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                            text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <button onClick={() => pieceRefs[i].current.click()}
                        style={{ border:`1.5px dashed ${C.border}`, color: C.muted }}
                        className="flex items-center gap-2 px-4 py-2.5 w-full justify-center rounded
                          hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all text-[10px] font-semibold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Joindre un fichier
                      </button>
                    )}
                    <input ref={pieceRefs[i]} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      onChange={e => { const f=e.target.files[0]; if(f) setPieces(p => { const n=[...p]; n[i]=f; return n }) }} />
                  </div>
                  <div className="px-4 pb-2">
                    <span style={{ color: C.border }} className="text-[8px]">Formats acceptés : PDF, JPG, PNG, DOC, DOCX</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Barre d'actions (bas du formulaire) ───────────────── */}
            <div style={{ background: C.navy2, borderTop:`3px solid ${C.gold}` }}
              className="px-6 py-4 flex items-center justify-between gap-4">
              <span style={{ color: 'rgba(255,255,255,0.4)' }} className="text-[9px] uppercase tracking-widest">
                FAED Niger — Système d'Identification Biométrique
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const now = new Date().toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
                    const agentName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.matricule
                    setData({ ...init, gn:true, dateSignalement: now, agentSaisie: agentName })
                    setPhotos({ profilDroit:null, face:null, quartGauche:null })
                    setPieces([null, null])
                    setExistingPieces([])
                    setError('')
                  }}
                  className="px-5 py-2.5 text-[10px] font-bold text-slate-300 hover:text-white
                    border border-slate-600 hover:border-slate-400 rounded transition-all tracking-wider uppercase">
                  Réinitialiser
                </button>
                <button onClick={saveFiche} disabled={saving}
                  style={{ background: `linear-gradient(135deg, ${C.gold} 0%, ${C.gold2} 100%)`, color: C.navy }}
                  className="flex items-center gap-2 px-6 py-2.5 text-[10px] font-black rounded
                    shadow-lg disabled:opacity-40 transition-all hover:opacity-90 tracking-wider uppercase">
                  {saving
                    ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Enregistrement…</>
                    : <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                          <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                        </svg>
                        Sauvegarder
                      </>}
                </button>
              </div>
            </div>

          </div>
          </div>{/* end overflow-x-auto page 2 */}
        </div>

      </div>
    </div>
  ) : null

  return (
    <Dashboard
      apiBase={API_BASE}
      onNew={handleNew}
      onOpen={handleOpen}
      onLogout={onLogout}
      user={user}
      authFetch={authFetch}
      formContent={formContent}
      isFormView={view === 'form'}
      onExitForm={() => setView('dashboard')}
    />
  )
}

/* ── Racine : gestion auth ────────────────────────────────────────────────── */
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('faed_user')) } catch { return null }
  })

  const clearUser = () => {
    localStorage.removeItem('faed_user')
    setUser(null)
  }

  const handleLogin  = (u) => setUser(u)
  const handleLogout = async () => {
    if (user) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'X-User-Id': user.id, 'X-Session-Id': user.sessionId },
        })
      } catch { /* on déconnecte quand même si l'API est inaccessible */ }
    }
    clearUser()
  }

  useEffect(() => {
    if (!user?.id || !user?.sessionId) return undefined

    const timeoutMs = 15 * 60 * 1000
    let idleTimer = null
    let heartbeatTimer = null
    let lastActivity = Date.now()

    const sendHeartbeat = async () => {
      try {
        await fetch(`${API_BASE}/api/auth/heartbeat`, {
          method: 'POST',
          headers: { 'X-User-Id': user.id, 'X-Session-Id': user.sessionId },
        })
      } catch {}
    }

    const logoutIfIdle = () => {
      if (Date.now() - lastActivity >= timeoutMs) handleLogout()
    }

    const scheduleIdleTimer = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(logoutIfIdle, timeoutMs)
    }

    const onActivity = () => {
      lastActivity = Date.now()
      scheduleIdleTimer()
      clearTimeout(heartbeatTimer)
      heartbeatTimer = setTimeout(sendHeartbeat, 800)
    }

    const events = ['pointerdown', 'keydown', 'mousemove', 'scroll', 'touchstart']
    events.forEach(eventName => window.addEventListener(eventName, onActivity, { passive: true }))
    scheduleIdleTimer()
    sendHeartbeat()

    return () => {
      clearTimeout(idleTimer)
      clearTimeout(heartbeatTimer)
      events.forEach(eventName => window.removeEventListener(eventName, onActivity))
    }
  }, [user?.id, user?.sessionId])

  if (!user) return <Login onLogin={handleLogin} />
  return <AuthenticatedApp user={user} onLogout={handleLogout} />
}
