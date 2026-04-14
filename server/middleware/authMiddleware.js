import User from '../models/User.js'

/* Attache req.user depuis le header X-User-Id */
export async function requireAuth(req, res, next) {
  const id = req.headers['x-user-id']
  if (!id) return res.status(401).json({ error: 'Non authentifié.' })
  try {
    const user = await User.findById(id).lean()
    if (!user || !user.actif) return res.status(401).json({ error: 'Session invalide.' })
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Session invalide.' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' })
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Accès refusé.' })
    next()
  }
}
