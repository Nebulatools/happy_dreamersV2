#!/usr/bin/env node

/**
 * Script para probar el envío de emails
 */

const { sendPasswordResetEmail } = require('../lib/email/password-reset-email')

async function testEmail() {
  console.log('🧪 PRUEBA DE SISTEMA DE EMAILS')
  console.log('================================')
  console.log()

  console.log('📧 Enviando email de prueba...')
  console.log(`Provider: ${process.env.EMAIL_PROVIDER}`)
  console.log(`SMTP Host: ${process.env.SMTP_HOST}`)
  console.log(`SMTP User: ${process.env.SMTP_USER}`)
  console.log(`From: ${process.env.EMAIL_FROM}`)
  console.log()

  try {
    const result = await sendPasswordResetEmail({
      email: 'jaco.12.94@gmail.com',
      resetUrl: 'https://happy-dreamers-v2.vercel.app/auth/reset-password?token=test-token-123',
      expiresInMinutes: 60
    })

    if (result.success) {
      console.log('✅ Email enviado exitosamente')
    } else {
      console.log('❌ Error al enviar email:', result.error)
    }
  } catch (error) {
    console.log('💥 Error en el sistema de emails:', error.message)
  }
}

testEmail().catch(console.error)