import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js'

const router = Router()
const SA = requireRole('superadmin')

router.get('/',      requireAuth, SA, listUsers)
router.post('/',     requireAuth, SA, createUser)
router.put('/:id',   requireAuth, SA, updateUser)
router.delete('/:id',requireAuth, SA, deleteUser)

export default router
