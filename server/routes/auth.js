import { Router } from 'express'
import User from '../models/User.js'
import { log } from '../utils/logger.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { clearSessionFields, createSession, sessionError } from '../utils/session.js'
import { sendOtpEmail } from '../utils/mailer.js'

const router = Router()

/* ── Codes OTP temporaires (en mémoire, TTL 10 min) ───────────────────────── */
const pendingOTP = new Map()
const OTP_TTL = 10 * 60 * 1000

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}
function makePendingToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
function setPending(token, data) {
  pendingOTP.set(token, { ...data, expiresAt: Date.now() + OTP_TTL })
}
function getPending(token) {
  const entry = pendingOTP.get(token)
  if (!entry || entry.expiresAt < Date.now()) { pendingOTP.delete(token); return null }
  return entry
}

/* ── Login ──────────────────────────────────────────────��──────────────────── */
router.post('/login', async (req, res) => {
  try {
    const { matricule, password, deviceLabel } = req.body
    if (!matricule || !password) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis.' })
    }

    const identifier = matricule.trim()
    const user = await User.findOne({
      actif: true,
      $or: [
        { matricule: identifier.toUpperCase() },
        { email: identifier.toLowerCase() },
      ],
    })
    if (!user) return res.status(401).json({ error: 'Identifiants incorrects.' })

    const ok = await user.verifyPassword(password)
    if (!ok) return res.status(401).json({ error: 'Identifiants incorrects.' })

    /* OTP obligatoire si SMTP configuré */
    const smtpReady = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    if (smtpReady) {
      if (!user.email) {
        return res.status(403).json({
          error: 'Aucun email associé à ce compte. Contactez un administrateur pour en ajouter un avant de vous connecter.',
        })
      }

      const code = generateCode()
      const pendingToken = makePendingToken()
      setPending(pendingToken, {
        userId: user._id.toString(),
        code,
        deviceLabel: deviceLabel || req.headers['user-agent'],
      })
      try {
        await sendOtpEmail(user.email, code)
      } catch (mailErr) {
        pendingOTP.delete(pendingToken)
        console.error('[OTP email]', mailErr.message)
        return res.status(500).json({ error: "Échec d'envoi du code OTP. Réessayez dans quelques instants." })
      }
      const [name, domain] = user.email.split('@')
      const maskedEmail = name.slice(0, 2) + '***@' + domain
      return res.json({ twoFactorRequired: true, pendingToken, maskedEmail })
    }

    /* Session directe (SMTP non configuré) */
    Object.assign(user, { lastLogin: new Date(), ...createSession(deviceLabel || req.headers['user-agent']) })
    await user.save()
    await log(user, 'login', { details: 'Connexion', ip: req.ip })

    res.json({
      user: {
        id: user._id, matricule: user.matricule, nom: user.nom, prenom: user.prenom,
        role: user.role, service: user.service, sessionId: user.currentSessionId,
      }
    })
  } catch (err) {
    console.error('[login]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

/* ── Vérification code OTP ─────────────────────────────────────────────────── */
router.post('/verify-2fa', async (req, res) => {
  try {
    const { pendingToken, code } = req.body
    if (!pendingToken || !code) return res.status(400).json({ error: 'Token et code requis.' })

    const entry = getPending(pendingToken)
    if (!entry) return res.status(401).json({ error: 'Code expiré. Recommencez la connexion.' })

    if (entry.code !== code.replace(/\s/g, '')) {
      return res.status(401).json({ error: 'Code incorrect.' })
    }

    pendingOTP.delete(pendingToken)

    const user = await User.findById(entry.userId)
    if (!user || !user.actif) return res.status(401).json({ error: 'Utilisateur introuvable.' })

    Object.assign(user, { lastLogin: new Date(), ...createSession(entry.deviceLabel) })
    await user.save()
    await log(user, 'login', { details: 'Connexion (OTP email)', ip: req.ip })

    res.json({
      user: {
        id: user._id, matricule: user.matricule, nom: user.nom, prenom: user.prenom,
        role: user.role, service: user.service, sessionId: user.currentSessionId,
      }
    })
  } catch (err) {
    console.error('[verify-2fa]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

/* ── Renvoyer le code OTP ──────────────────────────────────────────────────── */
router.post('/resend-otp', async (req, res) => {
  try {
    const { pendingToken } = req.body
    if (!pendingToken) return res.status(400).json({ error: 'Token requis.' })

    const entry = getPending(pendingToken)
    if (!entry) return res.status(401).json({ error: 'Session expirée. Recommencez la connexion.' })

    const user = await User.findById(entry.userId)
    if (!user || !user.email) return res.status(400).json({ error: 'Email introuvable.' })

    const code = generateCode()
    setPending(pendingToken, { ...entry, code })

    await sendOtpEmail(user.email, code)
    res.json({ ok: true })
  } catch (err) {
    console.error('[resend-otp]', err)
    res.status(500).json({ error: err.message || 'Erreur serveur.' })
  }
})

/* ── Heartbeat ─────────────────────────────────────────────────────────────── */
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

/* ── Logout ────────────────────────────────────────────────────────────────── */
router.post('/logout', requireAuth, async (req, res) => {
  await User.updateOne(
    { _id: req.user._id, currentSessionId: req.sessionId },
    { $set: clearSessionFields() }
  )
  await log(req.user, 'logout', { details: 'Deconnexion', ip: req.ip })
  res.json({ message: 'Deconnecte.' })
})

export default router
