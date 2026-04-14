import ActivityLog from '../models/ActivityLog.js'

export async function log(user, action, { cible = '', ficheId = null, details = '', ip = '' } = {}) {
  try {
    await ActivityLog.create({
      user:     user._id,
      userName: [user.prenom, user.nom].filter(Boolean).join(' ') || user.matricule,
      userRole: user.role,
      action,
      cible,
      ficheId,
      details,
      ip,
    })
  } catch (e) {
    console.error('[logger]', e.message)
  }
}
