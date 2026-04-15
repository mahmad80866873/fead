import { Router } from 'express'
import User from '../models/User.js'
import { log } from '../utils/logger.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { clearSessionFields, createSession, sessionError } from '../utils/session.js'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { matricule, password, deviceLabel } = req.body
    if (!matricule || !password) {
      return res.status(400).json({ error: 'Matricule et mot de passe requis.' })
    }

    const user = await User.findOne({ matricule: matricule.toUpperCase(), actif: true })
    if (!user) return res.status(401).json({ error: 'Identifiants incorrects.' })

    const ok = await user.verifyPassword(password)
    if (!ok) return res.status(401).json({ error: 'Identifiants incorrects.' })

    Object.assign(user, {
      lastLogin: new Date(),
      ...createSession(deviceLabel || req.headers['user-agent']),
    })
    await user.save()

    await log(user, 'login', { details: 'Connexion', ip: req.ip })

    res.json({
      user: {
        id: user._id,
        matricule: user.matricule,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        service: user.service,
        sessionId: user.currentSessionId,
      }
    })
  } catch (err) {
    console.error('[login]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

router.post('/heartbeat', requireAuth, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id, currentSessionId: req.sessionId },
      { $set: { sessionLastSeenAt: new Date() } }
    )
    res.json({ ok: true })
  } catch {
    res.status(401).json(sessionError('Session invalide.'))
  }
})

router.post('/logout', requireAuth, async (req, res) => {
  await User.updateOne(
    { _id: req.user._id, currentSessionId: req.sessionId },
    { $set: clearSessionFields() }
  )
  await log(req.user, 'logout', { details: 'Deconnexion', ip: req.ip })
  res.json({ message: 'Deconnecte.' })
})

export default router
