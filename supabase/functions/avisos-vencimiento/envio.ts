// Envío del mail por Resend o por SMTP (Gmail con contraseña de aplicación).
import nodemailer from 'npm:nodemailer@6.10.1'
import type { Mail } from './logica.ts'

function env(nombre: string): string {
  const v = Deno.env.get(nombre)
  if (!v) throw new Error(`Falta la variable ${nombre}`)
  return v
}

// Si el proyecto de Supabase lo comparte otra app con su propia cuenta de Resend,
// esta app puede usar otra key con HABILITACIONES_RESEND_API_KEY sin pisar la de la otra.
function claveResend(): string {
  return Deno.env.get('HABILITACIONES_RESEND_API_KEY') || env('RESEND_API_KEY')
}

export async function enviarMail(para: string, mail: Mail): Promise<void> {
  const proveedor = (Deno.env.get('EMAIL_PROVIDER') ?? 'resend').toLowerCase()
  const de = env('EMAIL_FROM')

  if (proveedor === 'resend') {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${claveResend()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: de, to: para.split(',').map((s) => s.trim()), subject: mail.asunto, html: mail.html, text: mail.texto }),
    })
    if (!r.ok) throw new Error(`Resend respondió ${r.status}: ${await r.text()}`)
    return
  }

  if (proveedor === 'smtp') {
    // Supabase bloquea los puertos 25 y 587: con Gmail usar 465 (SSL).
    const puerto = Number(Deno.env.get('SMTP_PORT') ?? '465')
    const transporte = nodemailer.createTransport({
      host: Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com',
      port: puerto,
      secure: puerto === 465,
      auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
    })
    await transporte.sendMail({ from: de, to: para, subject: mail.asunto, html: mail.html, text: mail.texto })
    return
  }

  throw new Error(`EMAIL_PROVIDER desconocido: ${proveedor} (usá "resend" o "smtp")`)
}
