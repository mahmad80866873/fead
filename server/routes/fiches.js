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

const router = Router()
const uploadPieces = upload.array('pieces', 2)
const notInvite    = requireRole('superadmin', 'agent')
const onlySA       = requireRole('superadmin')

// Routes corbeille (avant /:id pour éviter conflit)
router.get   ('/trash',            requireAuth, onlySA, listTrash)
router.put   ('/:id/restore',      requireAuth, onlySA, restoreFiche)
router.delete('/:id/permanent',    requireAuth, onlySA, permanentDelete)

router.get   ('/',     requireAuth, listFiches)
router.get   ('/:id',  requireAuth, getFiche)
router.post  ('/',     requireAuth, notInvite, uploadPieces, createFiche)
router.put   ('/:id',  requireAuth, notInvite, uploadPieces, updateFiche)
router.delete('/:id',  requireAuth, notInvite, deleteFiche)

export default router
