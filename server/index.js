import dotenv from 'dotenv'
import { fileURLToPath as _ftu } from 'url'
import { dirname as _dn, join as _join } from 'path'
dotenv.config({ path: _join(_dn(_ftu(import.meta.url)), '.env') })
import express  from 'express'
import cors     from 'cors'
import mongoose from 'mongoose'
import path     from 'path'
import { fileURLToPath } from 'url'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import fichesRouter from './routes/fiches.js'
import authRouter   from './routes/auth.js'
import usersRouter       from './routes/users.js'
import authRequestsRouter from './routes/authRequests.js'
import activityLogsRouter  from './routes/activityLogs.js'
import eventsRouter from './routes/events.js'
import { requireAuth } from './middleware/authMiddleware.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app  = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json({ limit: '30mb' }))
app.use(express.urlencoded({ extended: true, limit: '30mb' }))

/* ── Fichiers statiques ──────────────────────────────────────────────────── */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

/* ── Route upload photos ─────────────────────────────────────────────────── */
import { upload } from './middleware/upload.js'

app.post('/api/photos', requireAuth, upload.fields([
  { name:'profilDroit', maxCount:1 },
  { name:'face', maxCount:1 },
  { name:'quartGauche', maxCount:1 },
]), (req, res) => {
  const result = {}
  for (const [key, files] of Object.entries(req.files || {})) {
    result[key] = `/uploads/${files[0].filename}`
  }
  res.json(result)
})

/* ── Routes ─────────────────────────────────────────────────────────────── */
app.use('/api/auth',          authRouter)
app.use('/api/users',         usersRouter)
app.use('/api/auth-requests', authRequestsRouter)
app.use('/api/logs',          activityLogsRouter)
app.use('/api/events',        eventsRouter)
app.use('/api/fiches',        fichesRouter)

/* ── Connexion MongoDB ──────────────────────────────────────────────────── */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Atlas connecté'))
  .catch(err => console.error('✗ MongoDB connexion échouée :', err.message))

/* ── Dimensions A4 ─────────────────────────────────────────────────────── */
const PW = 595, PH = 842
const ML = 22, MR = 573   // marges gauche / droite

/* ── Palette simple noir & blanc ───────────────────────────────────────── */
const BLACK  = rgb(0,   0,   0)
const DGRAY  = rgb(0.3, 0.3, 0.3)
const MGRAY  = rgb(0.6, 0.6, 0.6)
const LGRAY  = rgb(0.88,0.88,0.88)
const SLGRAY = rgb(0.95,0.95,0.95)
const WHITE  = rgb(1,   1,   1)

/* ── Helpers ─────────────────────────────────────────────────────────────
   y exprimé depuis le HAUT de la page ; T() convertit pour pdf-lib
───────────────────────────────────────────────────────────────────────── */
const sv = v => (typeof v === 'string' ? v.trim() : '')
const bv = v => v === true || v === 'true'
// Convertit YYYY-MM-DD → jj/mm/aaaa (laisse intact si autre format)
const fmtDate = v => {
  const s = sv(v)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}`
  return s
}
const T  = n => PH - n

const HL = (pg, y, x1=ML, x2=MR, th=0.5, c=MGRAY) =>
  pg.drawLine({ start:{x:x1, y:T(y)}, end:{x:x2, y:T(y)}, thickness:th, color:c })

const VL = (pg, x, y1, y2, th=0.5, c=MGRAY) =>
  pg.drawLine({ start:{x, y:T(y1)}, end:{x, y:T(y2)}, thickness:th, color:c })

const FILL = (pg, y1, y2, x1=ML, x2=MR, c=LGRAY) =>
  pg.drawRectangle({ x:x1, y:T(y2), width:x2-x1, height:y2-y1, color:c })

const RECT = (pg, y1, y2, x1=ML, x2=MR, bw=0.7, bc=MGRAY) => {
  pg.drawRectangle({ x:x1, y:T(y2), width:x2-x1, height:y2-y1,
    borderWidth:bw, borderColor:bc, color:WHITE })
}

/* Texte (gras ou normal selon la police passée) */
const TXT = (pg, font, t, x, y, sz=8, c=BLACK) => {
  const s = sv(t); if (!s) return
  pg.drawText(s, { x, y:T(y), size:sz, font, color:c })
}

/* Valeur de champ tronquée si nécessaire */
const VAL = (pg, reg, t, x, y, maxPt, sz=9) => {
  const s = sv(t); if (!s) return
  let str = s
  while (str.length > 1 && reg.widthOfTextAtSize(str, sz) > maxPt) str = str.slice(0,-1)
  pg.drawText(str, { x, y:T(y), size:sz, font:reg, color:BLACK })
}

/* Texte multiligne */
function WRAP(pg, font, text, x, y, maxW, sz, lineGap=3) {
  const s = sv(text).replace(/\s+/g,' ')
  if (!s) return
  const words = s.split(' '), lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (font.widthOfTextAtSize(next, sz) <= maxW) cur = next
    else { if (cur) lines.push(cur); cur = w; if (lines.length >= 10) break }
  }
  if (cur && lines.length < 10) lines.push(cur)
  lines.forEach((l,i) => pg.drawText(l, { x, y:T(y + i*(sz+lineGap)), size:sz, font, color:BLACK }))
}

/* Case à cocher */
function BOX(pg, checked, x, y, size=7) {
  pg.drawRectangle({ x, y:T(y+size), width:size, height:size, borderWidth:0.7, borderColor:DGRAY, color:WHITE })
  if (bv(checked)) {
    pg.drawLine({ start:{x:x+1, y:T(y+size-1)}, end:{x:x+size-1, y:T(y+1)}, thickness:1.3, color:BLACK })
    pg.drawLine({ start:{x:x+1, y:T(y+1)}, end:{x:x+size-1, y:T(y+size-1)}, thickness:1.3, color:BLACK })
  }
}

/* Case + libellé */
function CHKLBL(pg, bld, checked, x, y, label, sz=7.5) {
  BOX(pg, checked, x, y)
  if (label) pg.drawText(sv(label), { x:x+10, y:T(y+5), size:sz, font:bld, color:BLACK })
}

/* ── Barre de section numérotée — fond gris clair, texte noir ─────────── */
function SBAR(pg, bld, y1, y2, num, title) {
  FILL(pg, y1, y2, ML, MR, LGRAY)
  HL(pg, y1, ML, MR, 1, DGRAY)
  HL(pg, y2, ML, MR, 1, DGRAY)
  // Badge numéro cerclé
  const cx = ML+10, cy = T((y1+y2)/2)
  pg.drawCircle({ x:cx, y:cy, size:6, color:WHITE })
  pg.drawCircle({ x:cx, y:cy, size:6, borderWidth:0.8, borderColor:DGRAY, color:undefined })
  const nw = bld.widthOfTextAtSize(String(num), 7)
  pg.drawText(String(num), { x:cx-nw/2, y:cy-3, size:7, font:bld, color:BLACK })
  // Titre
  pg.drawText(title, { x:ML+22, y:cy-4, size:8, font:bld, color:BLACK })
}

/* ── En-tête de cellule : fond gris très clair, label en gras ─────────── */
function CHDR(pg, bld, label, x1, x2, yTop, hdrH=11) {
  FILL(pg, yTop, yTop+hdrH, x1, x2, SLGRAY)
  HL(pg, yTop+hdrH, x1, x2, 0.4, MGRAY)
  pg.drawText(sv(label).toUpperCase(), { x:x1+3, y:T(yTop+8), size:6.5, font:bld, color:DGRAY })
}

/* ── Cellule complète : cadre + en-tête + valeur ─────────────────────── */
function CELL(pg, reg, bld, label, value, x1, x2, yTop, yBot, hdrH=11, maxPt=null) {
  RECT(pg, yTop, yBot, x1, x2, 0.5, MGRAY)
  CHDR(pg, bld, label, x1, x2, yTop, hdrH)
  if (value !== undefined) {
    const vx = x1+3, vy = yTop+hdrH+3+(yBot-yTop-hdrH)/2
    VAL(pg, reg, value, vx, vy, maxPt || (x2-x1-6))
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE 1  ─  IDENTIFICATION
══════════════════════════════════════════════════════════════════════════ */
function buildPage1(doc, reg, bld, data) {
  const pg = doc.addPage([PW, PH])

  /* Cadre extérieur */
  pg.drawRectangle({ x:ML-3, y:T(PH-8), width:MR-ML+6, height:PH-20,
    borderWidth:1.5, borderColor:BLACK, color:WHITE })
  pg.drawRectangle({ x:ML,   y:T(PH-11), width:MR-ML,  height:PH-26,
    borderWidth:0.4, borderColor:MGRAY, color:undefined })

  /* ── HEADER [11-70] ──────────────────────────────────────────────────── */
  HL(pg, 70, ML-3, MR+3, 1.5, BLACK)

  // Titre FAED NIGER
  const titleL = 'FAED NIGER'
  pg.drawText(titleL, { x: ML+10, y:T(40), size:20, font:bld, color:BLACK })
  pg.drawText('Fichier Automatisé des Empreintes Digitales',
    { x: ML+10, y:T(58), size:7, font:reg, color:DGRAY })

  // Séparateur vertical dans le header
  VL(pg, 320, 14, 70, 1, MGRAY)

  // Type GN (fixe — Gendarmerie Nationale)
  pg.drawText('GN', { x: 330, y: PH-30, size: 14, font: bld, color: rgb(0.77,0.60,0.16) })
  pg.drawText('Gendarmerie Nationale', { x: 330, y: PH-44, size: 7, font: reg, color: MGRAY })

  let y = 70

  /* ── SECTION 1 : IDENTITÉ ───────────────────────────────────────────── */
  SBAR(pg, bld, y, y+14, '1', "INFORMATIONS D'IDENTITE")
  y += 14

  /* NOM | PRENOM | EPOUSE */
  const row1H = 40, hH = 11
  const c3W = (MR-ML)/3
  const cols3 = [ML, ML+c3W, ML+2*c3W, MR]
  ;[['Nom','nom'],['Prénom(s)','prenoms'],['Épouse / Époux','epouse']].forEach(([label,key],i) => {
    CELL(pg, reg, bld, label, data[key], cols3[i], cols3[i+1], y, y+row1H, hH, c3W-10)
  })
  y += row1H

  /* SEXE | DATE DE NAISSANCE | FILIATION | NATIONALITÉ */
  const row2H = 50
  const x_sexe=ML, x_date=ML+48, x_fil=ML+128, x_nat=ML+390
  ;[[x_sexe,x_date],[x_date,x_fil],[x_fil,x_nat],[x_nat,MR]].forEach(([x1,x2]) =>
    RECT(pg, y, y+row2H, x1, x2, 0.5, MGRAY))

  // Sexe — M et F sur la même ligne
  CHDR(pg, bld, 'Sexe', x_sexe, x_date, y, hH)
  BOX(pg, data.sexe==='M', x_sexe+3, y+hH+16)
  TXT(pg, bld, 'M', x_sexe+13, y+hH+22, 8)
  BOX(pg, data.sexe==='F', x_sexe+26, y+hH+16)
  TXT(pg, bld, 'F', x_sexe+36, y+hH+22, 8)

  // Date de naissance (cellule réduite)
  CHDR(pg, bld, 'Date de naissance', x_date, x_fil, y, hH)
  VAL(pg, reg, fmtDate(data.dateNaissance), x_date+4, y+hH+20, x_fil-x_date-8, 8.5)

  // Filiation
  CHDR(pg, bld, 'Filiation — Fils/Fille de ... et de ... né(e)', x_fil, x_nat, y, hH)
  const fy = y+hH+10
  ;[['Fils de :','filDe',0],['et de :','etDe',85],['né(e) :','nee',170]].forEach(([lbl,key,dx]) => {
    TXT(pg, bld, lbl, x_fil+4+dx, fy+6, 7)
    const vw = dx < 170 ? 72 : (x_nat-x_fil-180)
    VAL(pg, reg, data[key], x_fil+4+dx+36, fy+6, vw)
  })

  // Nationalité — Nat. Nigérienne et Autre sur la même ligne
  CHDR(pg, bld, 'Nationalité', x_nat, MR, y, hH)
  CHKLBL(pg, bld, data.natNigerienne,    x_nat+4,  y+hH+18, 'Nat. Nigérienne', 7)
  CHKLBL(pg, bld, data.autreNationalite, x_nat+90, y+hH+18, 'Autre', 7)
  if (bv(data.autreNationalite) && sv(data.nationaliteAutre))
    VAL(pg, reg, data.nationaliteAutre, x_nat+4, y+hH+34, MR-x_nat-8, 7)
  y += row2H

  /* LIEU | REGION | DÉPARTEMENT | FORMULE */
  const row3H = 38
  const c4W = (MR-ML)/4
  const cols4 = [ML, ML+c4W, ML+2*c4W, ML+3*c4W, MR]
  ;[['Lieu de naissance','lieuNaissance'],['Région','region'],['Département','departement'],['Formule','formule']]
    .forEach(([label,key],i) =>
      CELL(pg, reg, bld, label, data[key], cols4[i], cols4[i+1], y, y+row3H, hH, c4W-10))
  y += row3H

  /* MOTIFS + PANEL DROIT */
  const motifH = 134
  const xPanel = MR-145
  RECT(pg, y, y+motifH, ML, xPanel, 0.5, MGRAY)
  CHDR(pg, bld, 'Motif(s)', ML, xPanel, y, hH)
  WRAP(pg, reg, data.motifs, ML+4, y+hH+13, xPanel-ML-8, 8.5)

  RECT(pg, y, y+motifH, xPanel, MR, 0.5, MGRAY)
  const xMid = xPanel + (MR-xPanel)/2
  CHDR(pg, bld, 'N° Cliché', xPanel, MR, y, hH)
  VAL(pg, reg, data.nCliche, xPanel+4, y+hH+16, MR-xPanel-8)
  HL(pg, y+42, xPanel, MR, 0.4, MGRAY)
  CHDR(pg, bld, "Maison d'arrêt", xPanel, xMid, y+42, hH)
  VL(pg, xMid, y+42, y+motifH, 0.4, MGRAY)
  CHDR(pg, bld, 'Palmaire', xMid, MR, y+42, hH)
  const bsz = 10
  const bMx = xPanel + (xMid-xPanel-bsz)/2
  const bPx = xMid + (MR-xMid-bsz)/2
  const bsy = y+60
  RECT(pg, bsy, bsy+bsz, bMx, bMx+bsz, 1, DGRAY)
  RECT(pg, bsy, bsy+bsz, bPx, bPx+bsz, 1, DGRAY)
  if (bv(data.maisonArret)) {
    pg.drawLine({ start:{x:bMx+1,y:T(bsy+1)},     end:{x:bMx+bsz-1,y:T(bsy+bsz-1)}, thickness:1.2, color:BLACK })
    pg.drawLine({ start:{x:bMx+1,y:T(bsy+bsz-1)}, end:{x:bMx+bsz-1,y:T(bsy+1)},     thickness:1.2, color:BLACK })
  }
  if (bv(data.palmaire)) {
    pg.drawLine({ start:{x:bPx+1,y:T(bsy+1)},     end:{x:bPx+bsz-1,y:T(bsy+bsz-1)}, thickness:1.2, color:BLACK })
    pg.drawLine({ start:{x:bPx+1,y:T(bsy+bsz-1)}, end:{x:bPx+bsz-1,y:T(bsy+1)},     thickness:1.2, color:BLACK })
  }
  y += motifH

  /* FICHE ÉTABLIE + N° PROC */
  const ficheH = 32
  RECT(pg, y, y+ficheH, ML, xPanel, 0.5, MGRAY)
  RECT(pg, y, y+ficheH, xPanel, MR, 0.5, MGRAY)
  TXT(pg, bld, 'Fiche établie par :', ML+4, y+10, 7)
  VAL(pg, reg, data.ficheEtabliePar, ML+72, y+10, 100)
  TXT(pg, bld, 'le :', ML+174, y+10, 7)
  VAL(pg, reg, fmtDate(data.ficheLe), ML+190, y+10, 70)
  TXT(pg, bld, 'n° IJ :', ML+262, y+10, 7)
  VAL(pg, reg, data.nIU, ML+285, y+10, xPanel-ML-289)
  TXT(pg, bld, 'N° de procédure :', xPanel+4, y+10, 7)
  VAL(pg, reg, data.nProcedure, xPanel+68, y+10, 30)
  CHKLBL(pg, bld, data.sansProcedure, xPanel+4, y+20, 'Sans procédure', 7.5)
  y += ficheH

  /* SERVICE */
  const svcH = 24
  RECT(pg, y, y+svcH, ML, ML+280, 0.5, MGRAY)
  RECT(pg, y, y+svcH, ML+280, MR, 0.5, MGRAY)
  TXT(pg, bld, 'Service :', ML+4, y+9, 7.5)
  VAL(pg, reg, data.service, ML+44, y+9, 228)
  TXT(pg, bld, 'Service requérant :', ML+284, y+9, 7.5)
  VAL(pg, reg, data.serviceRequerant, ML+362, y+9, MR-ML-370)
  y += svcH

  /* ── SECTION 2 : EMPREINTES ─────────────────────────────────────────── */
  SBAR(pg, bld, y, y+14, '2', 'EMPREINTES DIGITALES')
  y += 14

  /* Ligne de séparation légère */
  HL(pg, y+4, ML, MR, 0.3, LGRAY)
  y += 8

  /* MAIN DROITE */
  const mainH = 128, vlbW = 38, nbFin = 5
  const finW = (MR-ML-vlbW)/nbFin
  const cmtH = 18  // hauteur ligne Commentaire
  const cmtW = (MR-ML-vlbW)/3

  RECT(pg, y, y+mainH, ML, MR, 1, DGRAY)
  FILL(pg, y, y+mainH, ML, ML+vlbW, SLGRAY)
  VL(pg, ML+vlbW, y, y+mainH, 1, DGRAY)
  const mdT = 'MAIN DROITE'
  pg.drawText(mdT, {
    x: ML+vlbW-8,
    y: T((y+y+mainH)/2) - bld.widthOfTextAtSize(mdT,8)/2,
    size:8, font:bld, color:BLACK, rotate:degrees(90)
  })

  ;['Pouce','Index','Médius','Annulaire','Auriculaire'].forEach((f,i) => {
    const fx = ML+vlbW + i*finW
    if (i>0) VL(pg, fx, y, y+mainH-cmtH, 0.4, MGRAY)
    // zone empreinte (fond très clair)
    FILL(pg, y, y+mainH-cmtH-28, fx, fx+finW, rgb(0.97,0.97,0.97))
    HL(pg, y+mainH-cmtH-28, fx, fx+finW, 0.4, MGRAY)
    // code
    VAL(pg, reg, data[`${['pouce','index','medius','annulaire','auriculaire'][i]}DroitCode`],
      fx+4, y+mainH-cmtH-22, finW-8, 7)
    // label doigt (fond gris clair)
    HL(pg, y+mainH-cmtH-14, fx, fx+finW, 0.4, MGRAY)
    FILL(pg, y+mainH-cmtH-14, y+mainH-cmtH, fx, fx+finW, SLGRAY)
    const fw = bld.widthOfTextAtSize(f,7)
    TXT(pg, bld, f, fx+(finW-fw)/2, y+mainH-cmtH-6, 7)
  })
  // Séparateur + 3 cases Commentaire Main Droite
  HL(pg, y+mainH-cmtH, ML+vlbW, MR, 0.8, DGRAY)
  ;[0,1,2].forEach(ci => {
    const cx = ML+vlbW + ci*cmtW
    if (ci>0) VL(pg, cx, y+mainH-cmtH, y+mainH, 0.5, MGRAY)
    TXT(pg, bld, `Commentaire ${ci+1} :`, cx+4, y+mainH-cmtH+6, 6)
    VAL(pg, reg, data[`commentaireDroit${ci+1}`], cx+4, y+mainH-4, cmtW-8, 7.5)
  })
  y += mainH

  /* MAIN GAUCHE */
  RECT(pg, y, y+mainH, ML, MR, 1, DGRAY)
  FILL(pg, y, y+mainH, ML, ML+vlbW, SLGRAY)
  VL(pg, ML+vlbW, y, y+mainH, 1, DGRAY)
  const mgT = 'MAIN GAUCHE'
  pg.drawText(mgT, {
    x: ML+vlbW-8,
    y: T((y+y+mainH)/2) - bld.widthOfTextAtSize(mgT,8)/2,
    size:8, font:bld, color:BLACK, rotate:degrees(90)
  })

  ;['Pouce','Index','Médius','Annulaire','Auriculaire'].forEach((f,i) => {
    const fx = ML+vlbW + i*finW
    if (i>0) VL(pg, fx, y, y+mainH-cmtH, 0.4, MGRAY)
    FILL(pg, y, y+mainH-cmtH-28, fx, fx+finW, rgb(0.97,0.97,0.97))
    HL(pg, y+mainH-cmtH-28, fx, fx+finW, 0.4, MGRAY)
    VAL(pg, reg, data[`${['pouce','index','medius','annulaire','auriculaire'][i]}GaucheCode`],
      fx+4, y+mainH-cmtH-22, finW-8, 7)
    HL(pg, y+mainH-cmtH-14, fx, fx+finW, 0.4, MGRAY)
    FILL(pg, y+mainH-cmtH-14, y+mainH-cmtH, fx, fx+finW, SLGRAY)
    const fw = bld.widthOfTextAtSize(f,7)
    TXT(pg, bld, f, fx+(finW-fw)/2, y+mainH-cmtH-6, 7)
  })
  // Séparateur + 3 cases Commentaire Main Gauche
  HL(pg, y+mainH-cmtH, ML+vlbW, MR, 0.8, DGRAY)
  ;[0,1,2].forEach(ci => {
    const cx = ML+vlbW + ci*cmtW
    if (ci>0) VL(pg, cx, y+mainH-cmtH, y+mainH, 0.5, MGRAY)
    TXT(pg, bld, `Commentaire ${ci+1} :`, cx+4, y+mainH-cmtH+6, 6)
    VAL(pg, reg, data[`commentaireGauche${ci+1}`], cx+4, y+mainH-4, cmtW-8, 7.5)
  })
  y += mainH

  /* ── FOOTER ─────────────────────────────────────────────────────────── */
  HL(pg, PH-32, ML-3, MR+3, 0.4, MGRAY)
  // Ligne créateur
  const creatorLine = data.createdByName
    ? `Créé par : ${data.createdByName}${data.createdAt ? '  —  Le : ' + new Date(data.createdAt).toLocaleString('fr-FR') : ''}`
    : ''
  if (creatorLine) TXT(pg, reg, creatorLine, ML+4, PH-27, 6.5, MGRAY)

  HL(pg, PH-22, ML-3, MR+3, 1, DGRAY)
  TXT(pg, bld, "FAED Niger -- Système d'Identification Biométrique", ML+4, PH-14, 7, DGRAY)
  TXT(pg, bld, 'CONFIDENTIEL', MR-bld.widthOfTextAtSize('CONFIDENTIEL',7)-4, PH-14, 7, DGRAY)
  const p1 = 'Page 1 / 2'
  TXT(pg, reg, p1, (ML+MR)/2 - reg.widthOfTextAtSize(p1,7)/2, PH-14, 7, DGRAY)
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE 2  ─  NOTICE INDIVIDUELLE / SIGNALEMENT DESCRIPTIF
══════════════════════════════════════════════════════════════════════════ */
async function buildPage2(doc, reg, bld, data) {
  const pg = doc.addPage([PW, PH])

  /* Cadre extérieur */
  pg.drawRectangle({ x:ML-3, y:T(PH-8), width:MR-ML+6, height:PH-20,
    borderWidth:1.5, borderColor:BLACK, color:WHITE })
  pg.drawRectangle({ x:ML, y:T(PH-11), width:MR-ML, height:PH-26,
    borderWidth:0.4, borderColor:MGRAY, color:undefined })

  /* ── HEADER [11-60] ──────────────────────────────────────────────────── */
  HL(pg, 60, ML-3, MR+3, 1.5, BLACK)
  const h2t = 'Notice Individuelle -- Signalement Descriptif'
  pg.drawText(h2t, {
    x: ML+(MR-ML-bld.widthOfTextAtSize(h2t,12))/2, y:T(38),
    size:12, font:bld, color:BLACK,
  })
  TXT(pg, reg, 'FAED NIGER', ML+6, 52, 7, DGRAY)
  const p2lbl = 'Page 2 / 2'
  TXT(pg, reg, p2lbl, MR-reg.widthOfTextAtSize(p2lbl,7)-6, 52, 7, DGRAY)

  let y = 60

  /* ── SECTION 3 : PHOTOGRAPHIES ──────────────────────────────────────── */
  SBAR(pg, bld, y, y+14, '3', 'PHOTOGRAPHIES')
  y += 14

  /* 3 photos */
  const photoH = 140, vlbPh = 30, nph = 3
  const phW = (MR-ML-vlbPh)/nph
  const photoKeys = ['profilDroit','face','quartGauche']
  const photoLabels = ['PROFIL DROIT','FACE','3/4 GAUCHE']

  RECT(pg, y, y+photoH, ML, MR, 1, DGRAY)

  // Label vertical "PHOTOS"
  FILL(pg, y, y+photoH, ML, ML+vlbPh, SLGRAY)
  VL(pg, ML+vlbPh, y, y+photoH, 1, DGRAY)
  const phT = 'PHOTOS'
  pg.drawText(phT, {
    x: ML+vlbPh-8,
    y: T((y+y+photoH)/2) - bld.widthOfTextAtSize(phT,7)/2,
    size:7, font:bld, color:BLACK, rotate:degrees(90)
  })

  for (let i=0; i<nph; i++) {
    const label = photoLabels[i]
    const key   = photoKeys[i]
    const px = ML+vlbPh + i*phW
    if (i>0) VL(pg, px, y, y+photoH, 0.5, MGRAY)

    const fw = phW-16, fh = photoH-22
    const fpx = px+8, fpy = y+6

    // Zone image — reçue en base64 depuis le frontend
    const photoInfo = (data._photos || {})[key]
    let drawn = false
    if (photoInfo?.b64) {
      try {
        const imgBytes = Buffer.from(photoInfo.b64, 'base64')
        let pdfImg
        if (photoInfo.type === 'image/png') pdfImg = await doc.embedPng(imgBytes)
        else                                pdfImg = await doc.embedJpg(imgBytes)
        // scaleToFit dans la zone disponible
        const dims = pdfImg.scaleToFit(fw, fh)
        // centrer horizontalement et verticalement dans la zone
        const ix = px + (phW - dims.width) / 2
        // iy = position du bord HAUT de l'image (depuis le haut de la page)
        const iy = fpy + (fh - dims.height) / 2
        // pdf-lib drawImage : y = bord BAS de l'image en coordonnées pdf-lib (depuis le bas)
        pg.drawImage(pdfImg, { x:ix, y:PH - iy - dims.height, width:dims.width, height:dims.height })
        drawn = true
      } catch(e) { console.error('Photo embed error:', e.message) }
    }
    if (!drawn) {
      FILL(pg, fpy, fpy+fh, fpx, fpx+fw, rgb(0.97,0.97,0.97))
      RECT(pg, fpy, fpy+fh, fpx, fpx+fw, 0.5, MGRAY)
      pg.drawLine({ start:{x:fpx,y:T(fpy)},    end:{x:fpx+fw,y:T(fpy+fh)}, thickness:0.3, color:LGRAY })
      pg.drawLine({ start:{x:fpx,y:T(fpy+fh)}, end:{x:fpx+fw,y:T(fpy)},    thickness:0.3, color:LGRAY })
    }

    // Label bas
    HL(pg, y+photoH-14, px, px+phW, 0.4, MGRAY)
    FILL(pg, y+photoH-14, y+photoH, px, px+phW, SLGRAY)
    const lw = bld.widthOfTextAtSize(label,7)
    TXT(pg, bld, label, px+(phW-lw)/2, y+photoH-6, 7)
  }
  y += photoH

  /* ── SECTION 4 : ÉTAT CIVIL ─────────────────────────────────────────── */
  SBAR(pg, bld, y, y+14, '4', 'ETAT CIVIL ET RÉSIDENCE')
  y += 14

  const rpH = 32
  CELL(pg, reg, bld, 'Résidence',  data.residence,  ML,          (ML+MR)/2, y, y+rpH, 11, (MR-ML)/2-10)
  CELL(pg, reg, bld, 'Profession', data.profession, (ML+MR)/2,   MR,        y, y+rpH, 11, (MR-ML)/2-10)
  y += rpH

  /* ── SECTION 5 : CARACTÉRISTIQUES PHYSIQUES ─────────────────────────── */
  SBAR(pg, bld, y, y+14, '5', 'CARACTÉRISTIQUES PHYSIQUES')
  y += 14

  /* 4 cadres côte à côte */
  const physH = 130
  const xYeux=ML+120, xFront=ML+300, xNez=ML+420

  RECT(pg, y, y+physH, ML,     xYeux,  0.5, MGRAY)
  CHDR(pg, bld, 'Signalement', ML, xYeux, y, 11)
  ;[['Taille','taille'],['Type ethn.','typeEthnique'],['Teint','teint'],['Corpulence','corpulence']]
    .forEach(([l,k],i) => {
      TXT(pg, bld, l+':', ML+4, y+16+i*26, 7)
      VAL(pg, reg, data[k], ML+4, y+27+i*26, xYeux-ML-8)
      if (i<3) HL(pg, y+30+i*26, ML, xYeux, 0.3, LGRAY)
    })

  RECT(pg, y, y+physH, xYeux,  xFront, 0.5, MGRAY)
  CHDR(pg, bld, 'Yeux', xYeux, xFront, y, 11)
  ;[[data.yeuxBleu,'bleu'],[data.yeuxMarronClair,'marron clair'],
    [data.yeuxVert,'vert'],[data.yeuxMarronFonce,'marron foncé']]
    .forEach(([v,l],i) => {
      const col = i%2, row = Math.floor(i/2)
      CHKLBL(pg, bld, v, xYeux+4+col*88, y+14+row*14, l, 7)
    })
  CHKLBL(pg, bld, data.yeuxLunette, xYeux+4, y+43, 'Lunettes', 7)
  TXT(pg, bld, 'Particul.:', xYeux+4, y+56, 6.5)
  VAL(pg, reg, data.yeuxParticularite, xYeux+44, y+56, xFront-xYeux-48)
  HL(pg, y+62, xYeux, xFront, 0.3, MGRAY)
  TXT(pg, bld, 'Voix:', xYeux+4, y+70, 7)
  VAL(pg, reg, data.voix, xYeux+30, y+70, xFront-xYeux-34)
  TXT(pg, bld, 'Accent:', xYeux+4, y+84, 7)
  VAL(pg, reg, data.accent, xYeux+36, y+84, xFront-xYeux-40)

  RECT(pg, y, y+physH, xFront, xNez,   0.5, MGRAY)
  CHDR(pg, bld, 'Front', xFront, xNez, y, 11)
  ;[['Long :','frontLongval'],['Larg :','frontLangval'],['Inclin.','frontInclinval']]
    .forEach(([l,k],i) => {
      const ry = y+13+i*26
      TXT(pg, bld, l, xFront+4, ry+7, 7)
      VAL(pg, reg, data[k], xFront+36, ry+7, xNez-xFront-40)
      if (i<2) HL(pg, ry+16, xFront, xNez, 0.6, MGRAY)
    })
  HL(pg, y+92, xFront, xNez, 0.6, MGRAY)
  TXT(pg, bld, 'Particul.:', xFront+4, y+100, 6.5)
  VAL(pg, reg, data.frontParticul, xFront+44, y+100, xNez-xFront-48)

  RECT(pg, y, y+physH, xNez,   MR,     0.5, MGRAY)
  CHDR(pg, bld, 'Nez', xNez, MR, y, 11)
  ;[['Long :','nezLongval'],['Larg :','nezLangval'],['Inclin.','nezInclinval']]
    .forEach(([l,k],i) => {
      const ry = y+13+i*26
      TXT(pg, bld, l, xNez+4, ry+7, 7)
      VAL(pg, reg, data[k], xNez+36, ry+7, MR-xNez-40)
      if (i<2) HL(pg, ry+16, xNez, MR, 0.6, MGRAY)
    })
  HL(pg, y+92, xNez, MR, 0.6, MGRAY)
  TXT(pg, bld, 'Particul.:', xNez+4, y+100, 6.5)
  VAL(pg, reg, data.nezParticul, xNez+44, y+100, MR-xNez-48)
  y += physH

  /* CHEVEUX */
  const chevH = 34
  RECT(pg, y, y+chevH, ML, MR, 0.5, MGRAY)
  CHDR(pg, bld, 'Cheveux & Pilosité', ML, MR, y, 11)
  const chItems = [
    ['cheveuxBlond','blond'],['cheveuxChatain','châtain'],['cheveuxRoux','roux'],
    ['cheveuxNoir','noir'],  ['cheveuxDroits','droits'],  ['cheveuxOndes','ondés'],
    ['cheveuxFrises','frisés'],['cheveuxCrepus','crépus'],['cheveuxBarbe','barbe'],
    ['cheveuxMoustache','moustache'],
  ]
  const chColW = (MR-ML-4)/10
  chItems.forEach(([k,l],i) => CHKLBL(pg, bld, data[k], ML+4+i*chColW, y+16, l, 6.5))
  y += chevH

  /* PARTICULARITÉ VISAGE */
  const pvH = 20
  RECT(pg, y, y+pvH, ML, MR, 0.5, MGRAY)
  TXT(pg, bld, 'Particularité du visage :', ML+4, y+8, 7.5)
  WRAP(pg, reg, data.particulariteVisage, ML+110, y+8, MR-ML-114, 8)
  y += pvH

  /* ── SECTION 6 : MARQUES PARTICULIÈRES ──────────────────────────────── */
  SBAR(pg, bld, y, y+14, '6', 'MARQUES PARTICULIERES DU CORPS')
  y += 14

  /* Tableau Marques */
  const mpH = 150
  const mpCols = [ML, ML+46, ML+46+126, ML+46+252, ML+46+378, MR]
  const mpRows = [y, y+16, y+16+44, y+16+88, y+mpH]
  const mpColHeaders = ['Cicatrices','Marques ethniques','Tatouages','Amputation']
  const mpRowHeaders = ['VISAGE','TRONC','MEMBRES']

  RECT(pg, y, y+mpH, ML, MR, 1, DGRAY)

  // En-tête colonnes (fond gris clair, texte noir)
  FILL(pg, mpRows[0], mpRows[1], ML, MR, LGRAY)
  HL(pg, mpRows[1], ML, MR, 0.7, DGRAY)
  mpColHeaders.forEach((h,i) => {
    const cx = mpCols[i+1], cw = mpCols[i+2]-mpCols[i+1]
    VL(pg, cx, mpRows[0], y+mpH, 0.5, DGRAY)
    const hw = bld.widthOfTextAtSize(h,7.5)
    TXT(pg, bld, h, cx+(cw-hw)/2, mpRows[0]+11, 7.5, BLACK)
  })

  VL(pg, mpCols[1], mpRows[1], y+mpH, 0.7, DGRAY)

  mpRowHeaders.forEach((rowL,ri) => {
    const ry1 = mpRows[ri+1], ry2 = mpRows[ri+2]
    if (ri>0) HL(pg, ry1, ML, MR, 0.5, MGRAY)
    if (ri%2===1) FILL(pg, ry1, ry2, mpCols[1], MR, SLGRAY)
    // Label rangée — fond gris très clair, texte noir
    FILL(pg, ry1, ry2, ML, mpCols[1], LGRAY)
    const rlH = ry2-ry1
    const rlw = bld.widthOfTextAtSize(rowL,8)
    pg.drawText(rowL, {
      x: ML+mpCols[1]-ML-8,
      y: T(ry1+rlH/2) - rlw/2,
      size:8, font:bld, color:BLACK, rotate:degrees(90)
    })
    // Valeurs
    mpColHeaders.forEach((_,ci) => {
      const cx = mpCols[ci+1], cw = mpCols[ci+2]-mpCols[ci+1]
      const field = ['Cicatrices','MarquesEthniques','Tatouages','Amputation'][ci]
      WRAP(pg, reg, sv(data[`${['visage','tronc','membres'][ri]}${field}`]),
        cx+4, ry1+12, cw-8, 7.5)
    })
  })
  y += mpH

  /* ── SECTION 7 : INFORMATIONS SUPPLÉMENTAIRES ───────────────────────── */
  SBAR(pg, bld, y, y+14, '7', 'INFORMATIONS SUPPLEMENTAIRES')
  y += 14

  const infoH = 32
  CELL(pg, reg, bld, 'Date de signalement', data.dateSignalement, ML, ML+160, y, y+infoH, 11, 150)
  CELL(pg, reg, bld, 'Agent de saisie',     data.agentSaisie, ML+160, MR, y, y+infoH, 11, MR-ML-174)
  y += infoH

  const obsH = 34
  RECT(pg, y, y+obsH, ML, MR, 0.5, MGRAY)
  CHDR(pg, bld, 'Observations', ML, MR, y, 11)
  WRAP(pg, reg, data.observations, ML+4, y+15, MR-ML-8, 8)
  y += obsH

  /* ── FOOTER ─────────────────────────────────────────────────────────── */
  HL(pg, PH-32, ML-3, MR+3, 0.4, MGRAY)
  const creatorLine2 = data.createdByName
    ? `Créé par : ${data.createdByName}${data.createdAt ? '  —  Le : ' + new Date(data.createdAt).toLocaleString('fr-FR') : ''}`
    : ''
  if (creatorLine2) TXT(pg, reg, creatorLine2, ML+4, PH-27, 6.5, MGRAY)

  HL(pg, PH-22, ML-3, MR+3, 1, DGRAY)
  TXT(pg, bld, "FAED Niger -- Système d'Identification Biométrique", ML+4, PH-14, 7, DGRAY)
  TXT(pg, bld, 'CONFIDENTIEL', MR-bld.widthOfTextAtSize('CONFIDENTIEL',7)-4, PH-14, 7, DGRAY)
  const p2 = 'Page 2 / 2'
  TXT(pg, reg, p2, (ML+MR)/2 - reg.widthOfTextAtSize(p2,7)/2, PH-14, 7, DGRAY)
}

/* ══ Génération ════════════════════════════════════════════════════════════ */
async function generatePdf(data) {
  const doc = await PDFDocument.create()
  const reg = await doc.embedFont(StandardFonts.Helvetica)
  const bld = await doc.embedFont(StandardFonts.HelveticaBold)
  buildPage1(doc, reg, bld, data)
  await buildPage2(doc, reg, bld, data)
  return doc.save()
}

/* ══ Routes ════════════════════════════════════════════════════════════════ */
app.get('/api/pdf/template', async (_req, res) => {
  try {
    res.setHeader('Content-Type','application/pdf')
    res.setHeader('Cache-Control','no-store')
    res.send(Buffer.from(await generatePdf({})))
  } catch(e) { console.error(e); res.status(500).json({ error:'template_failed' }) }
})

app.post('/api/pdf/finalize', requireAuth, async (req, res) => {
  try {
    const body = req.body || {}
    const photos = body._photos || {}
    console.log('[PDF] photos reçues:', Object.entries(photos).map(([k,v]) =>
      `${k}: b64=${v?.b64 ? v.b64.length + ' chars' : 'ABSENT'} type=${v?.type}`
    ))
    res.setHeader('Content-Type','application/pdf')
    res.setHeader('Content-Disposition','attachment; filename="faed-fiche.pdf"')
    res.send(Buffer.from(await generatePdf(body)))
  } catch(e) { console.error('[PDF ERROR]', e); res.status(500).json({ error:'finalize_failed' }) }
})

app.listen(PORT, () => console.log(`✓ API FAED en ligne → http://localhost:${PORT}`))
