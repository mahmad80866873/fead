import { Router } from 'express'
import { upload }  from '../middleware/upload.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import {
  listFiches,
  getFiche,
  createFiche,
  updateFiche,
  deleteFiche,
  listTrash,
  restoreFiche,
  permanentDelete,
} from '../controllers/ficheController.js'
import { canAgentAct } from '../controllers/authRequestController.js'
import Fiche from '../models/Fiche.js'

const router = Router()
const uploadPieces = upload.array('pieces', 2)
const notInvite    = requireRole('superadmin', 'agent')
const onlySA       = requireRole('superadmin')

// Statistiques par région
router.get('/stats/regions', requireAuth, async (req, res) => {
  try {
    const results = await Fiche.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: {
          _id: {
            $cond: [
              { $and: [{ $ne: ['$region', null] }, { $ne: ['$region', ''] }] },
              { $toLower: '$region' },
              'non renseignée',
            ]
          },
          count: { $sum: 1 },
      }},
      { $sort: { count: -1 } },
    ])
    res.json(results.map(r => ({ region: r._id, count: r.count })))
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// Routes corbeille (avant /:id pour éviter conflit)
router.get   ('/trash',            requireAuth, onlySA, listTrash)
router.put   ('/:id/restore',      requireAuth, onlySA, restoreFiche)
router.delete('/:id/permanent',    requireAuth, onlySA, permanentDelete)

// Pré-vérification autorisation agent (avant toute action bloquée par délai)
router.get('/:id/can-act', requireAuth, notInvite, async (req, res) => {
  try {
    const { action } = req.query
    if (!['modifier', 'supprimer'].includes(action)) {
      return res.status(400).json({ error: 'Action invalide.' })
    }
    const fiche = await Fiche.findById(req.params.id).select('createdAt createdBy').lean()
    if (!fiche) return res.status(404).json({ error: 'Fiche introuvable.' })

    if (req.user.role !== 'agent') return res.json({ ok: true })

    const ok = await canAgentAct(req.user._id, req.params.id, action, fiche.createdAt)
    if (ok) return res.json({ ok: true })
    return res.status(403).json({ ok: false, code: 'DELAY_EXCEEDED' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get   ('/',     requireAuth, listFiches)
router.get   ('/:id',  requireAuth, getFiche)
router.post  ('/',     requireAuth, notInvite, uploadPieces, createFiche)
router.put   ('/:id',  requireAuth, notInvite, uploadPieces, updateFiche)
router.delete('/:id',  requireAuth, notInvite, deleteFiche)

export default router
