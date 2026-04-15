import { Router } from 'express'
import User from '../models/User.js'
import { addRealtimeClient } from '../utils/realtime.js'
import { expireSession, isSessionExpired } from '../utils/session.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId
    const sessionId = req.query.sessionId
    if (!userId || !sessionId) return res.status(401).json({ error: 'Non authentifie.' })

    const user = await User.findById(userId).lean()
    if (!user || !user.actif || user.currentSessionId !== sessionId) {
      return res.status(401).json({ error: 'Session invalide.' })
    }
    if (isSessionExpired(user)) {
      await expireSession(user, sessionId, req.ip)
      return res.status(401).json({ error: 'Session expiree.' })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    res.write(`data: ${JSON.stringify({ event: 'connected', ts: Date.now() })}\n\n`)

    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ event: 'ping', ts: Date.now() })}\n\n`)
    }, 25000)

    const sessionWatcher = setInterval(async () => {
      try {
        const freshUser = await User.findById(userId).lean()
        const invalid = !freshUser || !freshUser.actif || freshUser.currentSessionId !== sessionId || isSessionExpired(freshUser)
        if (!invalid) return
        if (freshUser?.currentSessionId === sessionId && isSessionExpired(freshUser)) {
          await expireSession(freshUser, sessionId, req.ip)
        }
        res.write(`data: ${JSON.stringify({ event: 'session-expired', ts: Date.now() })}\n\n`)
        clearInterval(heartbeat)
        clearInterval(sessionWatcher)
        removeClient()
        res.end()
      } catch {}
    }, 15000)

    const removeClient = addRealtimeClient(res)

    req.on('close', () => {
      clearInterval(heartbeat)
      clearInterval(sessionWatcher)
      removeClient()
      res.end()
    })
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

export default router
