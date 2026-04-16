import AuthRequest from '../models/AuthRequest.js'
import Fiche from '../models/Fiche.js'
import { broadcastRealtime } from '../utils/realtime.js'
import {
  APPROVAL_WINDOW_MS,
  AUTH_REQUEST_ACTIONS,
  AUTH_REQUEST_STATUSES,
  DELETE_LIMIT_MS,
  getActionDelayLimit,
  getFicheDisplayName,
  MODIFY_LIMIT_MS,
} from '../utils/ficheRules.js'

export async function createRequest(req, res) {
  try {
    const { ficheId, action, motif } = req.body
    if (!ficheId || !action) {
      return res.status(400).json({ error: 'ficheId et action requis.' })
    }
    if (!AUTH_REQUEST_ACTIONS.includes(action)) {
      return res.status(400).json({ error: 'Action invalide.' })
    }

    const fiche = await Fiche.findById(ficheId).lean()
    if (!fiche) return res.status(404).json({ error: 'Fiche introuvable.' })

    const existing = await AuthRequest.findOne({
      fiche: ficheId,
      requestedBy: req.user._id,
      action,
      status: 'en_attente',
    })
    if (existing) {
      return res.status(409).json({ error: 'Une demande est deja en attente pour cette fiche.' })
    }

    const request = await AuthRequest.create({
      fiche: ficheId,
      ficheNom: getFicheDisplayName(fiche),
      action,
      motif,
      requestedBy: req.user._id,
      requestedByName: [req.user.prenom, req.user.nom].filter(Boolean).join(' ') || req.user.matricule,
    })

    broadcastRealtime('auth-requests:changed', { action: 'create', requestId: request._id.toString() })
    res.status(201).json(request)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function listRequests(req, res) {
  try {
    const filter = {}
    if (req.query.status && AUTH_REQUEST_STATUSES.includes(req.query.status)) filter.status = req.query.status
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

export async function processRequest(req, res) {
  try {
    const { status } = req.body
    if (!['approuvee', 'rejetee'].includes(status)) {
      return res.status(400).json({ error: 'Status invalide.' })
    }

    const request = await AuthRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ error: 'Demande introuvable.' })
    if (request.status !== 'en_attente') {
      return res.status(400).json({ error: 'Demande deja traitee.' })
    }

    request.status = status
    request.approvedBy = req.user._id
    request.approvedByName = [req.user.prenom, req.user.nom].filter(Boolean).join(' ') || req.user.matricule
    request.approvedAt = new Date()
    request.expiresAt = status === 'approuvee'
      ? new Date(Date.now() + APPROVAL_WINDOW_MS)
      : null

    await request.save()

    broadcastRealtime('auth-requests:changed', { action: status, requestId: request._id.toString() })
    res.json(request)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function canAgentAct(userId, ficheId, action, ficheCreatedAt) {
  const age = Date.now() - new Date(ficheCreatedAt).getTime()
  if (age <= getActionDelayLimit(action)) return true

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
