import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'
import mongoose from 'mongoose'
import Fiche from '../models/Fiche.js'
import AuthRequest from '../models/AuthRequest.js'
import ActivityLog from '../models/ActivityLog.js'
import User from '../models/User.js'

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') })

const uploadsDir = join(dirname(fileURLToPath(import.meta.url)), '../uploads')

async function cleanUploadsDirectory() {
  try {
    const entries = await fs.readdir(uploadsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      await fs.unlink(join(uploadsDir, entry.name))
    }
    return entries.filter(entry => entry.isFile()).length
  } catch {
    return 0
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI manquant dans server/.env')
  }

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('MongoDB connecte')

  const [fichesResult, authRequestsResult, logsResult, usersResult, uploadsDeleted] = await Promise.all([
    Fiche.deleteMany({}),
    AuthRequest.deleteMany({}),
    ActivityLog.deleteMany({}),
    User.updateMany(
      {},
      {
        $set: {
          currentSessionId: null,
          currentSessionDevice: null,
          sessionStartedAt: null,
          sessionLastSeenAt: null,
        },
      }
    ),
    cleanUploadsDirectory(),
  ])

  console.log(`Fiches supprimees: ${fichesResult.deletedCount}`)
  console.log(`Demandes supprimees: ${authRequestsResult.deletedCount}`)
  console.log(`Logs supprimes: ${logsResult.deletedCount}`)
  console.log(`Utilisateurs reinitialises: ${usersResult.modifiedCount}`)
  console.log(`Fichiers upload supprimes: ${uploadsDeleted}`)

  await mongoose.disconnect()
  console.log('Nettoyage demo termine')
}

main().catch(async err => {
  console.error('[cleanDemoData]', err.message)
  try { await mongoose.disconnect() } catch {}
  process.exit(1)
})
