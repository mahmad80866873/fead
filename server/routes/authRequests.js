import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { createRequest, listRequests, processRequest } from '../controllers/authRequestController.js'

const router = Router()

router.get ('/',     requireAuth, listRequests)
router.post('/',     requireAuth, requireRole('agent'), createRequest)
router.put ('/:id',  requireAuth, requireRole('superadmin'), processRequest)

export default router
