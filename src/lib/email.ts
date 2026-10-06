import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  if (!resend) {
    // Dev fallback: no RESEND_API_KEY set yet, so just log the link instead
    // of failing. Lets you test the full signup -> verify flow locally
    // before wiring up a real Resend account.
    console.log(`[dev] Verification email for ${to}: ${verifyUrl}`)
    return false
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Anchor <no-reply@anchor.bank>",
    to,
    subject: "Verify your Anchor account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0B1F3A;">Verify your email</h2>
        <p>Thanks for signing up for Anchor. Click below to verify your email address:</p>
        <p>
          <a href="${verifyUrl}" style="display: inline-block; background: #0B1F3A; color: #F5F1E8; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            Verify email
          </a>
        </p>
        <p style="color: #5B6478; font-size: 13px;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
      </div>
    `,
  })
  if (error) throw new Error(`Verification email failed: ${error.message}`)
  return true
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!resend) {
    console.log(`[dev] Password reset email for ${to}: ${resetUrl}`)
    return
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Anchor <no-reply@anchor.bank>",
    to,
    subject: "Reset your Anchor password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0B1F3A;">Reset your password</h2>
        <p>We received a request to reset your Anchor password. Click below to choose a new one:</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #0B1F3A; color: #F5F1E8; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            Reset password
          </a>
        </p>
        <p style="color: #5B6478; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can ignore this email and your password will stay the same.</p>
      </div>
    `,
  })
  if (error) throw new Error(`Password reset email failed: ${error.message}`)
}
