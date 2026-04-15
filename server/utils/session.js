import crypto from 'crypto'
import User from '../models/User.js'
import { log } from './logger.js'

export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000
const SESSION_TOUCH_INTERVAL_MS = 30 * 1000

export function createSession(deviceLabel = '') {
  const now = new Date()
  return {
    currentSessionId: crypto.randomUUID(),
    currentSessionDevice: (deviceLabel || '').trim().slice(0, 160) || 'unknown',
    sessionStartedAt: now,
    sessionLastSeenAt: now,
  }
}

export function clearSessionFields() {
  return {
    currentSessionId: null,
    currentSessionDevice: null,
    sessionStartedAt: null,
    sessionLastSeenAt: null,
  }
}

export function isSessionExpired(user) {
  const lastSeen = user?.sessionLastSeenAt ? new Date(user.sessionLastSeenAt).getTime() : 0
  return !lastSeen || (Date.now() - lastSeen > SESSION_IDLE_TIMEOUT_MS)
}

export function shouldTouchSession(user) {
  const lastSeen = user?.sessionLastSeenAt ? new Date(user.sessionLastSeenAt).getTime() : 0
  return !lastSeen || (Date.now() - lastSeen >= SESSION_TOUCH_INTERVAL_MS)
}

export function sessionError(message = 'Session expirée.') {
  return { error: message, code: 'SESSION_EXPIRED' }
}

export async function expireSession(user, sessionId, ip = '') {
  if (!user?._id || !sessionId) return
  await User.updateOne({ _id: user._id, currentSessionId: sessionId }, { $set: clearSessionFields() })
  await log(user, 'logout', { details: 'Deconnexion automatique apres 15 minutes d inactivite', ip })
}
