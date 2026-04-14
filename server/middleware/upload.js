import multer from 'multer'
import path   from 'path'
import fs     from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')

/* Créer le dossier uploads si inexistant */
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext   = path.extname(file.originalname)
    const base  = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
    const name  = `${Date.now()}-${base}${ext}`
    cb(null, name)
  },
})

const fileFilter = (_req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowed.includes(ext)) cb(null, true)
  else cb(new Error(`Type de fichier non autorisé : ${ext}`))
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },  // 10 Mo max par fichier
})
