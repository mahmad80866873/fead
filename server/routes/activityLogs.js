import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import ActivityLog from '../models/ActivityLog.js'
import User from '../models/User.js'

const router = Router()

/* ── GET /api/logs?userId=&action=&page= ────────────────────────────────── */
router.get('/', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(200, parseInt(req.query.limit) || 50)
    const skip  = (page - 1) * limit
    const filter = {}
    if (req.query.userId) filter.user = req.query.userId
    if (req.query.action) filter.action = req.query.action

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ActivityLog.countDocuments(filter),
    ])
    res.json({ data: logs, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* ── GET /api/logs/users-summary ─── résumé dernière session par user ───── */
router.get('/users-summary', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password').lean()
    const summaries = await Promise.all(users.map(async u => {
      const lastAct = await ActivityLog.findOne({ user: u._id }).sort({ createdAt: -1 }).lean()
      const counts  = await ActivityLog.aggregate([
        { $match: { user: u._id } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
      ])
      const stats = {}
      counts.forEach(c => { stats[c._id] = c.count })
      return { ...u, lastActivity: lastAct?.createdAt || null, lastAction: lastAct?.action || null, stats }
    }))
    res.json(summaries)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
