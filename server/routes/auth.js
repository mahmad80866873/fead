import { Router } from 'express'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import User from '../models/User.js'
import { log } from '../utils/logger.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { clearSessionFields, createSession, sessionError } from '../utils/session.js'

const router = Router()

/* Tokens 2FA temporaires (en mémoire, TTL 5 min) */
const pending2FA = new Map()
const PENDING_TTL = 5 * 60 * 1000

function setPending(token, data) {
  pending2FA.set(token, { ...data, expiresAt: Date.now() + PENDING_TTL })
}
function getPending(token) {
  const entry = pending2FA.get(token)
  if (!entry || entry.expiresAt < Date.now()) { pending2FA.delete(token); return null }
  return entry
}
function makePendingToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/* ── Login ─────────────────────────────────────────────────────────────────── */
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

    /* 2FA activée → step 2 requis */
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const pendingToken = makePendingToken()
      setPending(pendingToken, { userId: user._id.toString(), deviceLabel: deviceLabel || req.headers['user-agent'] })
      return res.json({ twoFactorRequired: true, pendingToken })
    }

    /* Pas de 2FA → session immédiate */
    Object.assign(user, { lastLogin: new Date(), ...createSession(deviceLabel || req.headers['user-agent']) })
    await user.save()
    await log(user, 'login', { details: 'Connexion', ip: req.ip })

    res.json({
      user: {
        id: user._id, matricule: user.matricule, nom: user.nom, prenom: user.prenom,
        role: user.role, service: user.service, sessionId: user.currentSessionId,
        twoFactorEnabled: user.twoFactorEnabled,
      }
    })
  } catch (err) {
    console.error('[login]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

/* ── Vérification code 2FA (step 2 du login) ───────────────────────────────── */
router.post('/verify-2fa', async (req, res) => {
  try {
    const { pendingToken, code } = req.body
    if (!pendingToken || !code) return res.status(400).json({ error: 'Token et code requis.' })

    const entry = getPending(pendingToken)
    if (!entry) return res.status(401).json({ error: 'Session expirée. Recommencez la connexion.' })

    const user = await User.findById(entry.userId)
    if (!user || !user.actif) return res.status(401).json({ error: 'Utilisateur introuvable.' })

    const valid = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: code.replace(/\s/g, ''), window: 1 })
    if (!valid) return res.status(401).json({ error: 'Code incorrect.' })

    pending2FA.delete(pendingToken)

    Object.assign(user, { lastLogin: new Date(), ...createSession(entry.deviceLabel) })
    await user.save()
    await log(user, 'login', { details: 'Connexion (2FA)', ip: req.ip })

    res.json({
      user: {
        id: user._id, matricule: user.matricule, nom: user.nom, prenom: user.prenom,
        role: user.role, service: user.service, sessionId: user.currentSessionId,
        twoFactorEnabled: user.twoFactorEnabled,
      }
    })
  } catch (err) {
    console.error('[verify-2fa]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
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

/* ── Générer le secret 2FA + QR code ──────────────────────────────────────── */
router.get('/2fa/setup', requireAuth, async (req, res) => {
  try {
    const secretObj = speakeasy.generateSecret({ name: `FAED Niger:${req.user.matricule}`, issuer: 'FAED Niger', length: 20 })
    const secret = secretObj.base32
    const qrDataUrl = await QRCode.toDataURL(secretObj.otpauth_url)

    /* Stocker le secret temporairement (sera confirmé ensuite) */
    await User.updateOne({ _id: req.user._id }, { $set: { twoFactorSecret: secret } })

    res.json({ secret, qrDataUrl })
  } catch (err) {
    console.error('[2fa/setup]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

/* ── Confirmer et activer la 2FA ───────────────────────────────────────────── */
router.post('/2fa/confirm', requireAuth, async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Code requis.' })

    const user = await User.findById(req.user._id)
    if (!user?.twoFactorSecret) return res.status(400).json({ error: 'Lancez d\'abord la configuration.' })

    const valid = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: code.replace(/\s/g, ''), window: 1 })
    if (!valid) return res.status(400).json({ error: 'Code incorrect. Vérifiez votre application.' })

    user.twoFactorEnabled = true
    await user.save()

    res.json({ ok: true, message: 'Double authentification activée.' })
  } catch (err) {
    console.error('[2fa/confirm]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

/* ── Désactiver la 2FA ─────────────────────────────────────────────────────── */
router.post('/2fa/disable', requireAuth, async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Code requis pour désactiver.' })

    const user = await User.findById(req.user._id)
    if (!user?.twoFactorEnabled) return res.status(400).json({ error: '2FA non activée.' })

    const valid = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: code.replace(/\s/g, ''), window: 1 })
    if (!valid) return res.status(400).json({ error: 'Code incorrect.' })

    user.twoFactorEnabled = false
    user.twoFactorSecret = null
    await user.save()

    res.json({ ok: true, message: 'Double authentification désactivée.' })
  } catch (err) {
    console.error('[2fa/disable]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

export default router
