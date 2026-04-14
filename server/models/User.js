import mongoose from 'mongoose'
import bcrypt   from 'bcryptjs'

const UserSchema = new mongoose.Schema({
  matricule: { type: String, required: true, unique: true, trim: true, uppercase: true },
  password:  { type: String, required: true },
  nom:       { type: String, trim: true },
  prenom:    { type: String, trim: true },
  role:      { type: String, enum: ['superadmin', 'agent', 'invite'], default: 'agent' },
  service:   { type: String, trim: true },
  actif:     { type: Boolean, default: true },
  lastLogin: { type: Date },
}, { timestamps: true, collection: 'users' })

/* Hash du mot de passe avant sauvegarde */
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

/* Vérification du mot de passe */
UserSchema.methods.verifyPassword = function(plain) {
  return bcrypt.compare(plain, this.password)
}

export default mongoose.model('User', UserSchema)
