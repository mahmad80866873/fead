import { Router } from 'express'
import User from '../models/User.js'
import { log } from '../utils/logger.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()

/* ── POST /api/auth/login ───────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  try {
    const { matricule, password } = req.body
    if (!matricule || !password)
      return res.status(400).json({ error: 'Matricule et mot de passe requis.' })

    const user = await User.findOne({ matricule: matricule.toUpperCase(), actif: true })
    if (!user)
      return res.status(401).json({ error: 'Identifiants incorrects.' })

    const ok = await user.verifyPassword(password)
    if (!ok)
      return res.status(401).json({ error: 'Identifiants incorrects.' })

    /* Mettre à jour la dernière connexion */
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() })

    /* Journaliser */
    await log(user, 'login', { details: 'Connexion', ip: req.ip })

    res.json({
      user: {
        id:        user._id,
        matricule: user.matricule,
        nom:       user.nom,
        prenom:    user.prenom,
        role:      user.role,
        service:   user.service,
      }
    })
  } catch (err) {
    console.error('[login]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

/* ── POST /api/auth/logout ──────────────────────────────────────────────── */
router.post('/logout', requireAuth, async (req, res) => {
  await log(req.user, 'logout', { details: 'Déconnexion', ip: req.ip })
  res.json({ message: 'Déconnecté.' })
})

export default router
