import Fiche from '../models/Fiche.js'
import path  from 'path'
import fs    from 'fs'
import { canAgentAct } from './authRequestController.js'
import { log } from '../utils/logger.js'

/* ── GET /api/fiches ─────────────────────────────────────────────────────── */
export async function listFiches(req, res) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 20)
    const skip  = (page - 1) * limit
    const q     = req.query.q?.trim()

    const filter = { deleted: { $ne: true } }
    if (q) filter.$text = { $search: q }
    if (req.user?.role === 'agent') filter.createdBy = req.user._id
    if (req.query.type === 'pn')  filter.pn  = true
    if (req.query.type === 'gn')  filter.gn  = true
    if (req.query.type === 'gnn') filter.gnn = true
    if (req.query.dateDebut || req.query.dateFin) {
      filter.createdAt = {}
      if (req.query.dateDebut) filter.createdAt.$gte = new Date(req.query.dateDebut)
      if (req.query.dateFin) {
        const fin = new Date(req.query.dateFin)
        fin.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = fin
      }
    }

    const [fiches, total] = await Promise.all([
      Fiche.find(filter).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Fiche.countDocuments(filter),
    ])

    res.json({ data: fiches, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('[listFiches]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
}

/* ── GET /api/fiches/:id ─────────────────────────────────────────────────── */
export async function getFiche(req, res) {
  try {
    const fiche = await Fiche.findById(req.params.id).select('-__v').lean()
    if (!fiche) return res.status(404).json({ error: 'Fiche introuvable.' })
    res.json(fiche)
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
}

/* ── POST /api/fiches ────────────────────────────────────────────────────── */
export async function createFiche(req, res) {
  try {
    const formData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data || req.body
    const pieces = (req.files || []).map(f => ({
      originalName: f.originalname, storedName: f.filename,
      mimetype: f.mimetype, size: f.size, url: `/uploads/${f.filename}`,
    }))
    const createdBy     = req.user?._id || null
    const createdByName = req.user
      ? [req.user.prenom, req.user.nom].filter(Boolean).join(' ') || req.user.matricule
      : null

    const fiche = await Fiche.create({ ...formData, pieces, createdBy, createdByName })

    if (req.user) {
      const cible = [formData.nom, formData.prenoms].filter(Boolean).join(' ') || 'Sans nom'
      const details = `Création nouveau dossier${formData.noDossier ? ' — N° ' + formData.noDossier : ''}`
      await log(req.user, 'creer', { cible, ficheId: fiche._id, details, ip: req.ip })
    }

    res.status(201).json(fiche)
  } catch (err) {
    console.error('[createFiche]', err)
    res.status(400).json({ error: err.message || 'Données invalides.' })
  }
}

/* ── PUT /api/fiches/:id ─────────────────────────────────────────────────── */
export async function updateFiche(req, res) {
  try {
    const formData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data || req.body
    const newPieces = (req.files || []).map(f => ({
      originalName: f.originalname, storedName: f.filename,
      mimetype: f.mimetype, size: f.size, url: `/uploads/${f.filename}`,
    }))
    let existingPieces = []
    if (req.body.existingPieces) { try { existingPieces = JSON.parse(req.body.existingPieces) } catch {} }

    const existing = await Fiche.findById(req.params.id).select('createdAt createdBy nom prenoms noDossier').lean()
    if (!existing) return res.status(404).json({ error: 'Fiche introuvable.' })

    if (req.user?.role === 'agent') {
      const ok = await canAgentAct(req.user._id, req.params.id, 'modifier', existing.createdAt)
      if (!ok) return res.status(403).json({
        error: 'Délai de modification dépassé (3h). Demandez une autorisation au Super Admin.',
        code: 'DELAY_EXCEEDED',
      })
    }

    const fiche = await Fiche.findByIdAndUpdate(
      req.params.id,
      { ...formData, pieces: [...existingPieces, ...newPieces] },
      { new: true, runValidators: true }
    ).select('-__v')

    if (!fiche) return res.status(404).json({ error: 'Fiche introuvable.' })

    if (req.user) {
      const cible = [existing.nom, existing.prenoms].filter(Boolean).join(' ') || 'Sans nom'
      const motif = req.body._motif || ''
      const details = motif || `Modification du dossier de ${cible}${existing.noDossier ? ' (N° ' + existing.noDossier + ')' : ''}`
      await log(req.user, 'modifier', { cible, ficheId: req.params.id, details, ip: req.ip })
    }

    res.json(fiche)
  } catch (err) {
    console.error('[updateFiche]', err)
    res.status(400).json({ error: err.message || 'Données invalides.' })
  }
}

/* ── DELETE /api/fiches/:id  →  mise en corbeille (soft delete) ─────────── */
export async function deleteFiche(req, res) {
  try {
    const fiche = await Fiche.findById(req.params.id)
    if (!fiche) return res.status(404).json({ error: 'Fiche introuvable.' })
    if (fiche.deleted) return res.status(404).json({ error: 'Fiche déjà supprimée.' })

    if (req.user?.role === 'agent') {
      const ok = await canAgentAct(req.user._id, req.params.id, 'supprimer', fiche.createdAt)
      if (!ok) return res.status(403).json({
        error: 'Délai de suppression dépassé (30 min). Demandez une autorisation au Super Admin.',
        code: 'DELAY_EXCEEDED',
      })
    }

    const deletedByName = req.user
      ? [req.user.prenom, req.user.nom].filter(Boolean).join(' ') || req.user.matricule
      : null

    await Fiche.findByIdAndUpdate(req.params.id, {
      deleted: true, deletedAt: new Date(),
      deletedBy: req.user?._id, deletedByName,
    })

    const cible = [fiche.nom, fiche.prenoms].filter(Boolean).join(' ') || 'Sans nom'
    const motif = req.body?.motif || ''
    const details = motif || `Suppression du dossier de ${cible}${fiche.noDossier ? ' (N° ' + fiche.noDossier + ')' : ''}`
    if (req.user) await log(req.user, 'supprimer', { cible, ficheId: fiche._id, details, ip: req.ip })

    res.json({ message: 'Fiche mise en corbeille.' })
  } catch (err) {
    console.error('[deleteFiche]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
}

/* ── GET /api/fiches/trash  →  corbeille (superadmin) ───────────────────── */
export async function listTrash(req, res) {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 20)
    const skip  = (page - 1) * limit
    const [fiches, total] = await Promise.all([
      Fiche.find({ deleted: true }).select('-__v').sort({ deletedAt: -1 }).skip(skip).limit(limit).lean(),
      Fiche.countDocuments({ deleted: true }),
    ])
    res.json({ data: fiches, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
}

/* ── PUT /api/fiches/:id/restore  →  restaurer depuis la corbeille ─────── */
export async function restoreFiche(req, res) {
  try {
    const fiche = await Fiche.findByIdAndUpdate(req.params.id,
      { deleted: false, $unset: { deletedAt:1, deletedBy:1, deletedByName:1 } },
      { new: true }
    )
    if (!fiche) return res.status(404).json({ error: 'Fiche introuvable.' })
    res.json({ message: 'Fiche restaurée.' })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
}

/* ── DELETE /api/fiches/:id/permanent  →  suppression définitive (SA) ──── */
export async function permanentDelete(req, res) {
  try {
    const fiche = await Fiche.findById(req.params.id)
    if (!fiche) return res.status(404).json({ error: 'Fiche introuvable.' })

    await fiche.deleteOne()

    for (const p of fiche.pieces || []) {
      const filePath = path.join(process.cwd(), 'server', 'uploads', p.storedName)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }

    res.json({ message: 'Fiche supprimée définitivement.' })
  } catch (err) {
    console.error('[permanentDelete]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
}
