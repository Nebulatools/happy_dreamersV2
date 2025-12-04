import nodemailer from "nodemailer"
import { createLogger } from "@/lib/logger"

const logger = createLogger("EmailService")

export interface EmailService {
  sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean>
}

class ConsoleEmailService implements EmailService {
  async sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
    logger.info(`
    ========================================
    📧 EMAIL (MODO DESARROLLO)
    ========================================
    Para: ${to}
    Asunto: ${subject}
    ----------------------------------------
    ${text}
    ========================================
    `)
    return true
  }
}

class SmtpEmailService implements EmailService {
  private transporter: nodemailer.Transporter
  private from: string

  constructor() {
    const host = process.env.SMTP_HOST
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const secure = process.env.SMTP_SECURE === "true" || port === 465
    this.from = process.env.EMAIL_FROM || user || "no-reply@happy-dreamers.local"

    if (!host || !user || !pass) {
      throw new Error("SMTP_HOST, SMTP_USER y SMTP_PASS son requeridos para el proveedor SMTP")
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    })
  }

  async sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      })
      logger.info(`Email enviado vía SMTP a ${to}`)
      return true
    } catch (error) {
      logger.error("Error enviando email vía SMTP:", error)
      return false
    }
  }
}

export function getEmailService(): EmailService {
  const emailProvider = process.env.EMAIL_PROVIDER || "console"

  switch (emailProvider) {
  case "sendgrid":
    logger.warn("SendGrid no implementado, usando console")
    return new ConsoleEmailService()
  case "aws":
    logger.warn("AWS SES no implementado, usando console")
    return new ConsoleEmailService()
  case "smtp":
  case "gmail":
    return new SmtpEmailService()
  default:
    return new ConsoleEmailService()
  }
}
