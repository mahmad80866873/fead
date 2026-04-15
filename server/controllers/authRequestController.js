import AuthRequest from '../models/AuthRequest.js'
import Fiche       from '../models/Fiche.js'
import { broadcastRealtime } from '../utils/realtime.js'

const MODIFY_LIMIT_MS = 3 * 60 * 60 * 1000   // 3 heures
const DELETE_LIMIT_MS = 30 * 60 * 1000        // 30 minutes
const APPROVAL_WINDOW = 2 * 60 * 60 * 1000   // fenêtre d'action après approbation : 2h

/* ── POST /api/auth-requests ── agent crée une demande ─────────────────── */
export async function createRequest(req, res) {
  try {
    const { ficheId, action, motif } = req.body
    if (!ficheId || !action) return res.status(400).json({ error: 'ficheId et action requis.' })

    const fiche = await Fiche.findById(ficheId).lean()
    if (!fiche) return res.status(404).json({ error: 'Fiche introuvable.' })

    // Vérifier qu'une demande en attente n'existe pas déjà
    const existing = await AuthRequest.findOne({
      fiche: ficheId,
      requestedBy: req.user._id,
      action,
      status: 'en_attente',
    })
    if (existing) return res.status(409).json({ error: 'Une demande est déjà en attente pour cette fiche.' })

    const ficheNom = [fiche.nom, fiche.prenoms].filter(Boolean).join(' ') || 'Sans nom'
    const requestedByName = [req.user.prenom, req.user.nom].filter(Boolean).join(' ') || req.user.matricule

    const request = await AuthRequest.create({
      fiche: ficheId, ficheNom, action, motif,
      requestedBy: req.user._id, requestedByName,
    })
    broadcastRealtime('auth-requests:changed', { action: 'create', requestId: request._id.toString() })
    res.status(201).json(request)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

/* ── GET /api/auth-requests ── superadmin voit toutes les demandes ──────── */
export async function listRequests(req, res) {
  try {
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    // Agent voit seulement ses propres demandes
    if (req.user.role === 'agent') filter.requestedBy = req.user._id

    const requests = await AuthRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
    res.json(requests)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

/* ── PUT /api/auth-requests/:id ── superadmin approuve ou rejette ───────── */
export async function processRequest(req, res) {
  try {
    const { status } = req.body   // 'approuvee' | 'rejetee'
    if (!['approuvee','rejetee'].includes(status))
      return res.status(400).json({ error: 'Status invalide.' })

    const request = await AuthRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ error: 'Demande introuvable.' })
    if (request.status !== 'en_attente')
      return res.status(400).json({ error: 'Demande déjà traitée.' })

    request.status       = status
    request.approvedBy   = req.user._id
    request.approvedByName = [req.user.prenom, req.user.nom].filter(Boolean).join(' ') || req.user.matricule
    request.approvedAt   = new Date()
    if (status === 'approuvee')
      request.expiresAt = new Date(Date.now() + APPROVAL_WINDOW)

    await request.save()
    broadcastRealtime('auth-requests:changed', { action: status, requestId: request._id.toString() })
    res.json(request)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

/* ── Utilitaire : vérifier si un agent peut agir sur une fiche ─────────── */
export async function canAgentAct(userId, ficheId, action, ficheCreatedAt) {
  const limit = action === 'modifier' ? MODIFY_LIMIT_MS : DELETE_LIMIT_MS
  const age   = Date.now() - new Date(ficheCreatedAt).getTime()
  if (age <= limit) return true   // dans la fenêtre normale

  // Hors fenêtre : chercher une autorisation approuvée valide
  const approved = await AuthRequest.findOne({
    fiche: ficheId,
    requestedBy: userId,
    action,
    status: 'approuvee',
    expiresAt: { $gt: new Date() },
  })
  return !!approved
}

export { MODIFY_LIMIT_MS, DELETE_LIMIT_MS }
