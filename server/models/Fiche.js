import mongoose from 'mongoose'

/* ── Sous-schéma pièce jointe ───────────────────────────────────────────── */
const PieceSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  storedName:   { type: String, required: true },   // nom sur disque / S3
  mimetype:     { type: String },
  size:         { type: Number },
  url:          { type: String },                   // chemin relatif ou URL
}, { _id: false })

/* ── Schéma principal Fiche FAED ────────────────────────────────────────── */
const FicheSchema = new mongoose.Schema({

  /* Type de fiche */
  pn:  { type: Boolean, default: false },
  gn:  { type: Boolean, default: false },
  gnn: { type: Boolean, default: false },

  /* Identité */
  nom:               { type: String, trim: true },
  prenoms:           { type: String, trim: true },
  epouse:            { type: String, trim: true },
  sexe:              { type: String, enum: ['M', 'F', ''] },
  dateNaissance:     { type: String },
  filDe:             { type: String, trim: true },
  etDe:              { type: String, trim: true },
  nee:               { type: String, trim: true },
  natNigerienne:     { type: Boolean, default: false },
  autreNationalite:  { type: Boolean, default: false },
  nationaliteAutre:  { type: String, trim: true },

  /* Naissance */
  lieuNaissance: { type: String, trim: true },
  region:        { type: String, trim: true },
  departement:   { type: String, trim: true },
  formule:       { type: String, trim: true },

  /* Motifs / Fiche */
  motifs:         { type: String, trim: true },
  nCliche:        { type: String, trim: true },
  maisonArret:    { type: Boolean, default: false },
  palmaire:       { type: Boolean, default: false },
  ficheEtabliePar:{ type: String, trim: true },
  ficheLe:        { type: String },
  nIU:            { type: String, trim: true },
  nProcedure:     { type: String, trim: true },
  sansProcedure:  { type: Boolean, default: false },
  service:        { type: String, trim: true },
  serviceRequerant:{ type: String, trim: true },
  noDossier:      { type: String, trim: true },

  /* État civil */
  residence:  { type: String, trim: true },
  profession: { type: String, trim: true },

  /* Signalement physique */
  taille:       { type: String },
  typeEthnique: { type: String, trim: true },
  teint:        { type: String, trim: true },
  corpulence:   { type: String, trim: true },

  /* Yeux */
  yeuxBleu:          { type: Boolean, default: false },
  yeuxMarronClair:   { type: Boolean, default: false },
  yeuxVert:          { type: Boolean, default: false },
  yeuxMarronFonce:   { type: Boolean, default: false },
  yeuxLunette:       { type: Boolean, default: false },
  yeuxParticularite: { type: String, trim: true },

  /* Front */
  frontLongval:  { type: String },
  frontLangval:  { type: String },
  frontInclinval:{ type: String },
  frontParticul: { type: String, trim: true },

  /* Voix / Accent */
  voix:   { type: String, trim: true },
  accent: { type: String, trim: true },

  /* Nez */
  nezLongval:  { type: String },
  nezLangval:  { type: String },
  nezInclinval:{ type: String },
  nezParticul: { type: String, trim: true },

  /* Cheveux */
  cheveuxBlond:      { type: Boolean, default: false },
  cheveuxChatain:    { type: Boolean, default: false },
  cheveuxRoux:       { type: Boolean, default: false },
  cheveuxNoir:       { type: Boolean, default: false },
  cheveuxDroits:     { type: Boolean, default: false },
  cheveuxOndes:      { type: Boolean, default: false },
  cheveuxFrises:     { type: Boolean, default: false },
  cheveuxCrepus:     { type: Boolean, default: false },
  cheveuxBarbe:      { type: Boolean, default: false },
  cheveuxMoustache:  { type: Boolean, default: false },
  cheveuxParticularite: { type: String, trim: true },
  coiffure:          { type: String, trim: true },
  particulariteVisage: { type: String, trim: true },

  /* Marques particulières */
  visageCicatrices:       { type: String, trim: true },
  visageMarquesEthniques: { type: String, trim: true },
  visageTatouages:        { type: String, trim: true },
  visageAmputation:       { type: String, trim: true },
  troncCicatrices:        { type: String, trim: true },
  troncMarquesEthniques:  { type: String, trim: true },
  troncTatouages:         { type: String, trim: true },
  troncAmputation:        { type: String, trim: true },
  membresCicatrices:      { type: String, trim: true },
  membresMarquesEthniques:{ type: String, trim: true },
  membresTatouages:       { type: String, trim: true },
  membresAmputation:      { type: String, trim: true },

  /* Empreintes — Main Droite */
  pouceDroitCode:      { type: String },
  indexDroitCode:      { type: String },
  mediusDroitCode:     { type: String },
  annulaireDroitCode:  { type: String },
  auriculaireDroitCode:{ type: String },
  commentaireDroit1:   { type: String, trim: true },
  commentaireDroit2:   { type: String, trim: true },
  commentaireDroit3:   { type: String, trim: true },

  /* Empreintes — Main Gauche */
  pouceGaucheCode:      { type: String },
  indexGaucheCode:      { type: String },
  mediusGaucheCode:     { type: String },
  annulaireGaucheCode:  { type: String },
  auriculaireGaucheCode:{ type: String },
  commentaireGauche1:   { type: String, trim: true },
  commentaireGauche2:   { type: String, trim: true },
  commentaireGauche3:   { type: String, trim: true },

  /* Simultanées / Sticker / Pouces */
  simultaneGaucheCode: { type: String },
  stickerCode:         { type: String },
  simultaneDroitCode:  { type: String },
  pouceGaucheAppose:   { type: String },
  pouceDroitAppose:    { type: String },

  /* Signalement */
  dateSignalement:  { type: String },
  agentSaisie: { type: String, trim: true },
  observations:     { type: String, trim: true },

  /* Photos */
  photoProfilDroit:  { type: String },
  photoFace:         { type: String },
  photoQuartGauche:  { type: String },

  /* Fichiers */
  pieces: [PieceSchema],

  /* Auteur */
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: { type: String, trim: true },

  /* Corbeille */
  deleted:       { type: Boolean, default: false },
  deletedAt:     { type: Date },
  deletedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedByName: { type: String, trim: true },

}, {
  timestamps: true,   // ajoute createdAt + updatedAt automatiquement
  collection: 'fiches',
})

/* Index pour la recherche */
FicheSchema.index({ nom: 'text', prenoms: 'text', service: 'text', noDossier: 'text' })
FicheSchema.index({ createdAt: -1 })

export default mongoose.model('Fiche', FicheSchema)
