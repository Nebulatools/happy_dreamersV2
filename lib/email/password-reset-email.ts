import { createLogger } from "@/lib/logger"
import { getEmailService } from "@/lib/email/email-service"

const logger = createLogger("PasswordResetEmail")

interface PasswordResetEmailParams {
  email: string
  resetUrl: string
  expiresInMinutes?: number
}

function getPasswordResetHTML({ resetUrl, expiresInMinutes = 60 }: PasswordResetEmailParams): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recupera tu contraseña - Happy Dreamers</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f9ff;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    .card {
      background-color: #ffffff;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 40px rgba(104, 161, 200, 0.15);
    }
    .header {
      text-align: center;
    }
    .logo {
      font-size: 26px;
      font-weight: 600;
      color: #4A90E2;
      margin-bottom: 8px;
    }
    .emoji {
      font-size: 44px;
      margin-bottom: 16px;
    }
    h1 {
      color: #2F2F2F;
      font-size: 22px;
      margin-bottom: 16px;
      text-align: center;
    }
    p {
      margin: 12px 0;
      color: #4a4a4a;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 28px;
      border-radius: 999px;
      font-weight: 600;
      text-decoration: none;
    }
    .secondary {
      font-size: 13px;
      color: #6b7280;
      text-align: center;
      margin-top: 24px;
    }
    .link {
      word-break: break-word;
      color: #4A90E2;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="emoji">🌙</div>
        <div class="logo">Happy Dreamers</div>
      </div>

      <h1>¿Olvidaste tu contraseña?</h1>
      <p>
        Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si fuiste tú, haz clic en el botón de abajo.
      </p>

      <div class="cta-container">
        <a class="cta-button" href="${resetUrl}">Crear nueva contraseña</a>
      </div>

      <p class="secondary">
        Este enlace es válido durante ${expiresInMinutes} minutos. Si no solicitaste este cambio, puedes ignorar este correo.
      </p>

      <p class="secondary">
        ¿El botón no funciona? Copia y pega este enlace en tu navegador:
        <br /><span class="link">${resetUrl}</span>
      </p>

      <div class="footer">
        © ${new Date().getFullYear()} Happy Dreamers. Todos los derechos reservados.
      </div>
    </div>
  </div>
</body>
</html>
  `
}

function getPasswordResetText({ resetUrl, expiresInMinutes = 60 }: PasswordResetEmailParams): string {
  return `
Recibimos una solicitud para restablecer tu contraseña en Happy Dreamers.

Si tú hiciste la solicitud, visita el siguiente enlace para crear una nueva contraseña (válido por ${expiresInMinutes} minutos):
${resetUrl}

Si no solicitaste este cambio, puedes ignorar este correo.

© ${new Date().getFullYear()} Happy Dreamers. Todos los derechos reservados.
  `
}

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const emailService = getEmailService()
    const html = getPasswordResetHTML(params)
    const text = getPasswordResetText(params)
    const sent = await emailService.sendEmail(
      params.email,
      "Restablece tu contraseña en Happy Dreamers",
      html,
      text
    )

    if (!sent) {
      return {
        success: false,
        error: "No se pudo enviar el email de recuperación"
      }
    }

    logger.info(`Email de recuperación enviado a ${params.email}`)
    return { success: true }
  } catch (error) {
    logger.error("Error enviando email de recuperación:", error)
    return {
      success: false,
      error: "Error interno al enviar email"
    }
  }
}

