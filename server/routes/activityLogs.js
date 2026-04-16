import { Router } from 'express'
import ActivityLog from '../models/ActivityLog.js'
import User from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { log } from '../utils/logger.js'

const router = Router()
const DOWNLOAD_FORMATS = new Set(['pdf', 'zip'])

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1)
  const limit = Math.min(200, parseInt(query.limit) || 50)
  return { page, limit, skip: (page - 1) * limit }
}

router.post('/download', requireAuth, async (req, res) => {
  try {
    const { ficheId = null, cible = '', format = 'pdf' } = req.body || {}
    const normalizedFormat = String(format).toLowerCase()
    if (!DOWNLOAD_FORMATS.has(normalizedFormat)) {
      return res.status(400).json({ error: 'Format de telechargement invalide.' })
    }

    await log(req.user, 'consulter', {
      cible,
      ficheId,
      details: `Telechargement ${normalizedFormat.toUpperCase()}`,
      ip: req.ip,
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query)
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

router.get('/users-summary', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password').lean()
    const summaries = await Promise.all(users.map(async user => {
      const lastAct = await ActivityLog.findOne({ user: user._id }).sort({ createdAt: -1 }).lean()
      const counts = await ActivityLog.aggregate([
        { $match: { user: user._id } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
      ])

      const stats = {}
      counts.forEach(count => { stats[count._id] = count.count })

      return {
        ...user,
        lastActivity: lastAct?.createdAt || null,
        lastAction: lastAct?.action || null,
        stats,
      }
    }))

    res.json(summaries)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
