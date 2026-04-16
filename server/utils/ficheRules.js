export const AUTH_REQUEST_ACTIONS = ['modifier', 'supprimer']
export const AUTH_REQUEST_STATUSES = ['en_attente', 'approuvee', 'rejetee']

export const MODIFY_LIMIT_MS = 60 * 60 * 1000
export const DELETE_LIMIT_MS = 60 * 60 * 1000
export const APPROVAL_WINDOW_MS = 30 * 60 * 1000

export function getFicheDisplayName(fiche = {}) {
  return [fiche.nom, fiche.prenoms].filter(Boolean).join(' ') || 'Sans nom'
}

export function getActionDelayLimit(action) {
  return action === 'modifier' ? MODIFY_LIMIT_MS : DELETE_LIMIT_MS
}

export function getActionDelayLabel(action) {
  if (action === 'modifier') return 'modification'
  if (action === 'supprimer') return 'suppression'
  return 'action'
}

export function buildDelayExceededMessage(action) {
  return `Delai de ${getActionDelayLabel(action)} depasse (1h). Demandez une autorisation au Super Admin.`
}
