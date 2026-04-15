import { Router } from 'express'
import User from '../models/User.js'
import { addRealtimeClient } from '../utils/realtime.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié.' })

    const user = await User.findById(userId).lean()
    if (!user || !user.actif) return res.status(401).json({ error: 'Session invalide.' })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    res.write(`data: ${JSON.stringify({ event: 'connected', ts: Date.now() })}\n\n`)

    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ event: 'ping', ts: Date.now() })}\n\n`)
    }, 25000)

    const removeClient = addRealtimeClient(res)

    req.on('close', () => {
      clearInterval(heartbeat)
      removeClient()
      res.end()
    })
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

export default router
