import mongoose from 'mongoose'

const ActivityLogSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:   { type: String },
  userRole:   { type: String },
  action:     { type: String, enum: ['login','logout','creer','modifier','supprimer','consulter'], required: true },
  cible:      { type: String },           // nom/prénom de la fiche concernée
  ficheId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Fiche' },
  details:    { type: String },           // info supplémentaire
  ip:         { type: String },
}, { timestamps: true, collection: 'activity_logs' })

ActivityLogSchema.index({ user: 1, createdAt: -1 })
ActivityLogSchema.index({ createdAt: -1 })

export default mongoose.model('ActivityLog', ActivityLogSchema)
