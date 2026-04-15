import User from '../models/User.js'
import { expireSession, isSessionExpired, sessionError, shouldTouchSession } from '../utils/session.js'

export async function requireAuth(req, res, next) {
  const id = req.headers['x-user-id']
  const sessionId = req.headers['x-session-id']
  if (!id || !sessionId) return res.status(401).json(sessionError('Non authentifie.'))

  try {
    const user = await User.findById(id)
    if (!user || !user.actif) return res.status(401).json(sessionError('Session invalide.'))
    if (!user.currentSessionId || user.currentSessionId !== sessionId) {
      return res.status(401).json(sessionError('Cette session a ete remplacee par une autre connexion.'))
    }
    if (isSessionExpired(user)) {
      await expireSession(user, sessionId, req.ip)
      return res.status(401).json(sessionError('Session expiree apres 15 minutes d inactivite.'))
    }
    if (shouldTouchSession(user)) {
      user.sessionLastSeenAt = new Date()
      await user.save()
    }
    req.user = user.toObject()
    req.sessionId = sessionId
    next()
  } catch {
    res.status(401).json(sessionError('Session invalide.'))
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json(sessionError('Non authentifie.'))
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Acces refuse.' })
    next()
  }
}
