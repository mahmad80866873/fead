/**
 * Script de création du compte administrateur initial
 * Usage : node server/scripts/createAdmin.js
 */
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') })

import mongoose from 'mongoose'
import User from '../models/User.js'

await mongoose.connect(process.env.MONGODB_URI)
console.log('✓ MongoDB connecté')

const existing = await User.findOne({ matricule: 'ADMIN' })
if (existing) {
  console.log('⚠ Compte ADMIN existe déjà. Réinitialisation du mot de passe...')
  existing.password = 'Admin@1234'
  await existing.save()
  console.log('✓ Mot de passe réinitialisé : Admin@1234')
} else {
  await User.create({
    matricule: 'ADMIN',
    password:  'Admin@1234',
    nom:       'Administrateur',
    prenom:    'Système',
    role:      'admin',
    service:   'Direction Générale',
    actif:     true,
  })
  console.log('✓ Compte admin créé')
  console.log('  Matricule : ADMIN')
  console.log('  Mot de passe : Admin@1234')
}

await mongoose.disconnect()
