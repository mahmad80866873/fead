import nodemailer from 'nodemailer'

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

export async function sendOtpEmail(to, code, context = 'connexion') {
  const transport = createTransport()
  if (!transport) throw new Error('Service email non configuré. Contactez l\'administrateur.')

  const from = process.env.SMTP_FROM || process.env.MAIL_FROM || process.env.SMTP_USER
  const isReset = context === 'reset'
  const title   = isReset ? 'Réinitialisation de mot de passe' : 'Code de vérification'
  const desc    = isReset
    ? 'Utilisez ce code pour réinitialiser votre mot de passe. Il expire dans <strong>10 minutes</strong>.'
    : 'Utilisez ce code pour finaliser votre connexion. Il expire dans <strong>10 minutes</strong>.'
  const footer  = isReset
    ? 'Si vous n\'avez pas demandé une réinitialisation, ignorez cet email.'
    : 'Si vous n\'avez pas tenté de vous connecter, ignorez cet email.'
  const subject = isReset
    ? `[FAED Niger] Réinitialisation de mot de passe : ${code}`
    : `[FAED Niger] Code de vérification : ${code}`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f8f8f8;padding:0;border-radius:8px;overflow:hidden">
      <div style="background:#1C3A0E;padding:24px;text-align:center">
        <div style="color:#C49A28;font-size:20px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase">FAED Niger</div>
        <div style="color:rgba(196,154,40,0.55);font-size:10px;letter-spacing:0.15em;text-transform:uppercase;margin-top:4px">Gendarmerie Nationale</div>
      </div>
      <div style="background:white;padding:32px;text-align:center">
        <div style="font-size:13px;color:#374151;margin-bottom:8px;font-weight:600">${title}</div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:24px">${desc}</div>
        <div style="background:#f3f4f6;border:2px dashed #C49A28;border-radius:8px;padding:20px 32px;display:inline-block">
          <span style="font-size:36px;font-weight:900;letter-spacing:0.4em;color:#1C3A0E;font-family:monospace">${code}</span>
        </div>
        <div style="margin-top:24px;font-size:11px;color:#9ca3af">${footer}</div>
      </div>
      <div style="background:#f3f4f6;padding:12px;text-align:center">
        <div style="font-size:10px;color:#9ca3af">FAED Niger — Système automatique, ne pas répondre</div>
      </div>
    </div>
  `

  await transport.sendMail({ from: `"FAED Niger" <${from}>`, to, subject, html })
}
