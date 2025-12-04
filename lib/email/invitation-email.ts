// Servicio de Email para Invitaciones
// Envía emails de invitación para acceso compartido

import { PendingInvitation } from "@/types/models"
import { createLogger } from "@/lib/logger"
import { getEmailService } from "@/lib/email/email-service"

const logger = createLogger("InvitationEmail")

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

// Template HTML para el email de invitación
function getInvitationEmailHTML(invitation: PendingInvitation): string {
  const acceptUrl = `${BASE_URL}/invitation?token=${invitation.invitationToken}`
  const roleDescription = getRoleDescription(invitation.role)
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación - Happy Dreamers</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f9ff;
    }
    .container {
      background-color: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #4A90E2;
      margin-bottom: 10px;
    }
    .moon-emoji {
      font-size: 40px;
      margin-bottom: 20px;
    }
    h1 {
      color: #2F2F2F;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .info-box {
      background-color: #F0F7FF;
      border: 1px solid #D0E4FF;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #E0E0E0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #555;
    }
    .info-value {
      color: #333;
    }
    .role-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
    }
    .role-viewer {
      background-color: #F0F0F0;
      color: #666;
    }
    .role-caregiver {
      background-color: #E3F2FD;
      color: #1976D2;
    }
    .role-editor {
      background-color: #FFEBEE;
      color: #C62828;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 30px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #E0E0E0;
      font-size: 12px;
      color: #888;
      text-align: center;
    }
    .warning {
      background-color: #FFF3CD;
      border: 1px solid #FFC107;
      border-radius: 6px;
      padding: 10px;
      margin: 20px 0;
      font-size: 14px;
      color: #856404;
    }
    .expire-info {
      color: #FF6B6B;
      font-weight: 600;
      font-size: 14px;
      text-align: center;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="moon-emoji">🌙</div>
      <div class="logo">Happy Dreamers</div>
      <p style="color: #666; margin: 0;">Plataforma de seguimiento del sueño infantil</p>
    </div>

    <h1>¡Has recibido una invitación!</h1>
    
    <p>Hola,</p>
    
    <p><strong>${invitation.invitedByName}</strong> te ha invitado a tener acceso al perfil de sueño de <strong>${invitation.childName}</strong> en Happy Dreamers.</p>

    <div class="info-box">
      <h3 style="margin-top: 0; color: #4A90E2;">Detalles de la invitación:</h3>
      <div class="info-row">
        <span class="info-label">Niño/a:</span>
        <span class="info-value">${invitation.childName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Invitado por:</span>
        <span class="info-value">${invitation.invitedByName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Tipo de acceso:</span>
        <span class="info-value">
          <span class="role-badge role-${invitation.role}">${roleDescription}</span>
        </span>
      </div>
      ${invitation.relationshipDescription ? `
      <div class="info-row">
        <span class="info-label">Relación:</span>
        <span class="info-value">${invitation.relationshipDescription}</span>
      </div>
      ` : ""}
    </div>

    <h3 style="color: #4A90E2; margin-top: 25px;">¿Qué podrás hacer?</h3>
    <ul style="color: #555;">
      ${invitation.permissions.canViewEvents ? "<li>Ver eventos y patrones de sueño</li>" : ""}
      ${invitation.permissions.canCreateEvents ? "<li>Registrar nuevos eventos de sueño</li>" : ""}
      ${invitation.permissions.canEditEvents ? "<li>Editar eventos existentes</li>" : ""}
      ${invitation.permissions.canViewReports ? "<li>Ver reportes y estadísticas</li>" : ""}
      ${invitation.permissions.canViewPlan ? "<li>Consultar el plan de sueño personalizado</li>" : ""}
      ${invitation.permissions.canEditProfile ? "<li>Actualizar información del perfil</li>" : ""}
    </ul>

    <div class="button-container">
      <a href="${acceptUrl}" class="cta-button">Aceptar Invitación</a>
    </div>

    <div class="warning">
      <strong>⚠️ Importante:</strong> Si no tienes una cuenta en Happy Dreamers, serás redirigido para crear una nueva cuenta antes de aceptar la invitación.
    </div>

    <div class="expire-info">
      ⏰ Esta invitación expira en 7 días
    </div>

    <div class="footer">
      <p>Si no esperabas esta invitación, puedes ignorar este email.</p>
      <p>Si tienes problemas con el botón, copia y pega este enlace en tu navegador:</p>
      <p style="word-break: break-all; color: #4A90E2;">${acceptUrl}</p>
      <p style="margin-top: 20px;">© 2025 Happy Dreamers. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
  `
}

// Obtener descripción del rol
function getRoleDescription(role: string): string {
  switch (role) {
  case "viewer":
    return "Solo lectura"
  case "caregiver":
    return "Cuidador"
  case "editor":
    return "Editor completo"
  default:
    return role
  }
}

// Template de texto plano para el email
function getInvitationEmailText(invitation: PendingInvitation): string {
  const acceptUrl = `${BASE_URL}/invitation?token=${invitation.invitationToken}`
  const roleDescription = getRoleDescription(invitation.role)
  
  return `
¡Has recibido una invitación de Happy Dreamers!

${invitation.invitedByName} te ha invitado a tener acceso al perfil de sueño de ${invitation.childName}.

Detalles de la invitación:
- Niño/a: ${invitation.childName}
- Invitado por: ${invitation.invitedByName}
- Tipo de acceso: ${roleDescription}
${invitation.relationshipDescription ? `- Relación: ${invitation.relationshipDescription}` : ""}

Para aceptar la invitación, haz clic en el siguiente enlace:
${acceptUrl}

Esta invitación expira en 7 días.

Si no esperabas esta invitación, puedes ignorar este email.

© 2025 Happy Dreamers. Todos los derechos reservados.
  `
}

// Función principal para enviar email de invitación
export async function sendInvitationEmail(
  invitation: PendingInvitation
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailService = getEmailService()
    
    const subject = `${invitation.invitedByName} te ha invitado a Happy Dreamers`
    const html = getInvitationEmailHTML(invitation)
    const text = getInvitationEmailText(invitation)
    
    const sent = await emailService.sendEmail(
      invitation.email,
      subject,
      html,
      text
    )
    
    if (!sent) {
      return {
        success: false,
        error: "No se pudo enviar el email",
      }
    }
    
    logger.info(`Email de invitación enviado a ${invitation.email}`)
    return { success: true }
    
  } catch (error) {
    logger.error("Error enviando email de invitación:", error)
    return {
      success: false,
      error: "Error interno al enviar email",
    }
  }
}

// Función para reenviar una invitación existente
export async function resendInvitationEmail(
  invitation: PendingInvitation
): Promise<{ success: boolean; error?: string }> {
  return sendInvitationEmail(invitation)
}
