// Utilidades para manejo de emails
// NOTA: Implementación temporal mientras no tengamos servicio de email configurado

interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

// Función temporal para simular envío de email de reseteo de contraseña
export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  // En desarrollo, mostrar el link en consola
  if (process.env.NODE_ENV === "development") {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("🔑 LINK DE RESETEO DE CONTRASEÑA")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Email:", email)
    console.log("Link:", resetUrl)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Este link es válido por 1 hora")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  }

  // TODO: Implementar servicio de email real cuando esté configurado
  // Opciones sugeridas:
  // 1. SendGrid: https://sendgrid.com/
  // 2. Resend: https://resend.com/
  // 3. Postmark: https://postmarkapp.com/
  // 4. Amazon SES: https://aws.amazon.com/ses/
  
  // Ejemplo de implementación con Resend:
  /*
  import { Resend } from 'resend';
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: 'Happy Dreamers <noreply@happydreamers.app>',
    to: email,
    subject: 'Resetea tu contraseña - Happy Dreamers',
    html: `
      <h2>Solicitud de reseteo de contraseña</h2>
      <p>Has solicitado resetear tu contraseña en Happy Dreamers.</p>
      <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
      <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Resetear Contraseña
      </a>
      <p>Este enlace expirará en 1 hora.</p>
      <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
    `
  });
  */
  
  return Promise.resolve()
}

// Función genérica para envío de emails (futura implementación)
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, text, html } = options
  
  if (process.env.NODE_ENV === "development") {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("📧 EMAIL SIMULADO")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("Para:", to)
    console.log("Asunto:", subject)
    console.log("Contenido:", text || html)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  }
  
  // TODO: Implementar servicio de email real
  return Promise.resolve()
}