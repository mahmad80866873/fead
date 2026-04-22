import User from '../models/User.js'

/* ── GET /api/users ─────────────────────────────────────────────────────── */
export async function listUsers(req, res) {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean()
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
}

/* ── POST /api/users ────────────────────────────────────────────────────── */
export async function createUser(req, res) {
  try {
    const { matricule, password, nom, prenom, role, service, email, telephone } = req.body
    if (!matricule || !password) return res.status(400).json({ error: 'Matricule et mot de passe requis.' })
    const user = await User.create({ matricule, password, nom, prenom, role, service, email, telephone, actif: true })
    const { password: _, twoFactorSecret: __, ...safe } = user.toObject()
    res.status(201).json(safe)
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Ce matricule existe déjà.' })
    res.status(400).json({ error: err.message })
  }
}

/* ── PUT /api/users/:id ─────────────────────────────────────────────────── */
export async function updateUser(req, res) {
  try {
    const { nom, prenom, role, service, actif, password, email, telephone } = req.body
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' })

    if (nom       !== undefined) user.nom       = nom
    if (prenom    !== undefined) user.prenom    = prenom
    if (role      !== undefined) user.role      = role
    if (service   !== undefined) user.service   = service
    if (email     !== undefined) user.email     = email
    if (telephone !== undefined) user.telephone = telephone
    if (actif     !== undefined) user.actif     = actif
    if (password)                user.password  = password

    await user.save()
    const { password: _, twoFactorSecret: __, ...safe } = user.toObject()
    res.json(safe)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

/* ── DELETE /api/users/:id ──────────────────────────────────────────────── */
export async function deleteUser(req, res) {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' })
    await User.findByIdAndDelete(req.params.id)
    res.json({ message: 'Utilisateur supprimé.' })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
}
