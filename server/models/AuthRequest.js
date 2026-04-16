import mongoose from 'mongoose'

const AuthRequestSchema = new mongoose.Schema({
  fiche: { type: mongoose.Schema.Types.ObjectId, ref: 'Fiche', required: true },
  ficheNom: { type: String }, // nom prenom pour affichage
  action: { type: String, enum: ['modifier', 'supprimer'], required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedByName: { type: String },
  motif: { type: String, trim: true },
  status: { type: String, enum: ['en_attente', 'approuvee', 'rejetee'], default: 'en_attente' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedByName: { type: String },
  approvedAt: { type: Date },
  expiresAt: { type: Date }, // fenetre d'action apres approbation (30 min)
}, { timestamps: true, collection: 'auth_requests' })

export default mongoose.model('AuthRequest', AuthRequestSchema)
