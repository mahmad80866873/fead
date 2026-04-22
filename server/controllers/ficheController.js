import fs from 'fs'
import path from 'path'
import Fiche from '../models/Fiche.js'
import { canAgentAct } from './authRequestController.js'
import { log } from '../utils/logger.js'
import { broadcastRealtime } from '../utils/realtime.js'
import { buildDelayExceededMessage, getFicheDisplayName } from '../utils/ficheRules.js'

function parseFormData(body) {
  return typeof body.data === 'string' ? JSON.parse(body.data) : (body.data || body)
}

function mapUploadedPieces(files = []) {
  return files.map(file => ({
    originalName: file.originalname,
    storedName: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    url: `/uploads/${file.filename}`,
  }))
}

function getActorName(user) {
  if (!user) return null
  return [user.prenom, user.nom].filter(Boolean).join(' ') || user.matricule
}

function buildNoDossierSuffix(noDossier) {
  return noDossier ? ` (N° ${noDossier})` : ''
}

export async function listFiches(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 20)
    const skip = (page - 1) * limit
    const q = req.query.q?.trim()

    const filter = { deleted: { $ne: true } }
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [
        { nom: regex }, { prenoms: regex }, { epouse: regex },
        { nee: regex }, { service: regex }, { noDossier: regex },
        { formule: regex }, { nProcedure: regex }, { nIU: regex },
        { lieuNaissance: regex }, { residence: regex }, { profession: regex },
        { agentSaisie: regex }, { ficheEtabliePar: regex },
      ]
    } else if (req.user?.role === 'agent') {
      // Sans recherche : l'agent ne voit que ses propres fiches
      filter.createdBy = req.user._id
    }
    if (req.query.type === 'pn') filter.pn = true
    if (req.query.type === 'gn') filter.gn = true
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

export async function getFiche(req, res) {
  try {
    const fiche = await Fiche.findById(req.params.id).select('-__v').lean()
    if (!fiche) return res.status(404).json({ error: 'Fiche introuvable.' })
    res.json(fiche)
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
}

export async function createFiche(req, res) {
  try {
    const formData = parseFormData(req.body)
    const pieces = mapUploadedPieces(req.files || [])
    const createdBy = req.user?._id || null
    const createdByName = getActorName(req.user)

    const fiche = await Fiche.create({ ...formData, pieces, createdBy, createdByName })

    if (req.user) {
      const cible = getFicheDisplayName(formData)
      const details = `Creation nouveau dossier${formData.noDossier ? ` — N° ${formData.noDossier}` : ''}`
      await log(req.user, 'creer', { cible, ficheId: fiche._id, details, ip: req.ip })
    }

    broadcastRealtime('fiches:changed', { action: 'create', ficheId: fiche._id.toString() })
    res.status(201).json(fiche)
  } catch (err) {
    console.error('[createFiche]', err)
    res.status(400).json({ error: err.message || 'Donnees invalides.' })
  }
}

export async function updateFiche(req, res) {
  try {
    const formData = parseFormData(req.body)
    const newPieces = mapUploadedPieces(req.files || [])
    let existingPieces = []
    if (req.body.existingPieces) {
      try { existingPieces = JSON.parse(req.body.existingPieces) } catch {}
    }

    const existing = await Fiche.findById(req.params.id).select('createdAt createdBy nom prenoms noDossier').lean()
    if (!existing) return res.status(404).json({ error: 'Fiche introuvable.' })

    if (req.user?.role === 'agent') {
      if (String(existing.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ error: 'Accès refusé : vous ne pouvez modifier que vos propres fiches.' })
      }
      const ok = await canAgentAct(req.user._id, req.params.id, 'modifier', existing.createdAt)
      if (!ok) {
        return res.status(403).json({
          error: buildDelayExceededMessage('modifier'),
          code: 'DELAY_EXCEEDED',
        })
      }
    }

    const fiche = await Fiche.findByIdAndUpdate(
      req.params.id,
      { ...formData, pieces: [...existingPieces, ...newPieces] },
      { new: true, runValidators: true }
    ).select('-__v')

    if (!fiche) return res.status(404).json({ error: 'Fiche introuvable.' })

    if (req.user) {
      const cible = getFicheDisplayName(existing)
      const motif = req.body._motif || ''
      const details = motif || `Modification du dossier de ${cible}${buildNoDossierSuffix(existing.noDossier)}`
      await log(req.user, 'modifier', { cible, ficheId: req.params.id, details, ip: req.ip })
    }

    broadcastRealtime('fiches:changed', { action: 'update', ficheId: req.params.id })
    res.json(fiche)
  } catch (err) {
    console.error('[updateFiche]', err)
    res.status(400).json({ error: err.message || 'Donnees invalides.' })
  }
}

export async function deleteFiche(req, res) {
  try {
    const fiche = await Fiche.findById(req.params.id)
    if (!fiche) return res.status(404).json({ error: 'Fiche introuvable.' })
    if (fiche.deleted) return res.status(404).json({ error: 'Fiche deja supprimee.' })

    if (req.user?.role === 'agent') {
      if (String(fiche.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ error: 'Accès refusé : vous ne pouvez supprimer que vos propres fiches.' })
      }
      const ok = await canAgentAct(req.user._id, req.params.id, 'supprimer', fiche.createdAt)
      if (!ok) {
        return res.status(403).json({
          error: buildDelayExceededMessage('supprimer'),
          code: 'DELAY_EXCEEDED',
        })
      }
    }

    await Fiche.findByIdAndUpdate(req.params.id, {
      deleted: true,
      deletedAt: new Date(),
      deletedBy: req.user?._id,
      deletedByName: getActorName(req.user),
    })

    const cible = getFicheDisplayName(fiche)
    const motif = req.body?.motif || ''
    const details = motif || `Suppression du dossier de ${cible}${buildNoDossierSuffix(fiche.noDossier)}`
    if (req.user) await log(req.user, 'supprimer', { cible, ficheId: fiche._id, details, ip: req.ip })

    broadcastRealtime('fiches:changed', { action: 'trash', ficheId: req.params.id })
    res.json({ message: 'Fiche mise en corbeille.' })
  } catch (err) {
    console.error('[deleteFiche]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
}

export async function listTrash(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 20)
    const skip = (page - 1) * limit

    const [fiches, total] = await Promise.all([
      Fiche.find({ deleted: true }).select('-__v').sort({ deletedAt: -1 }).skip(skip).limit(limit).lean(),
      Fiche.countDocuments({ deleted: true }),
    ])

    res.json({ data: fiches, total, page, pages: Math.ceil(total / limit) })
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
}

export async function restoreFiche(req, res) {
  try {
    const fiche = await Fiche.findByIdAndUpdate(
      req.params.id,
      { deleted: false, $unset: { deletedAt: 1, deletedBy: 1, deletedByName: 1 } },
      { new: true }
    )
    if (!fiche) return res.status(404).json({ error: 'Fiche introuvable.' })

    broadcastRealtime('fiches:changed', { action: 'restore', ficheId: req.params.id })
    res.json({ message: 'Fiche restauree.' })
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
}

export async function permanentDelete(req, res) {
  try {
    const fiche = await Fiche.findById(req.params.id)
    if (!fiche) return res.status(404).json({ error: 'Fiche introuvable.' })

    await fiche.deleteOne()

    for (const piece of fiche.pieces || []) {
      const filePath = path.join(process.cwd(), 'server', 'uploads', piece.storedName)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }

    broadcastRealtime('fiches:changed', { action: 'permanent-delete', ficheId: req.params.id })
    res.json({ message: 'Fiche supprimee definitivement.' })
  } catch (err) {
    console.error('[permanentDelete]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
}
