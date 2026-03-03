import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { anonymous, magicLink } from "better-auth/plugins"
import { apiKey } from "@better-auth/api-key"
import nodemailer from "nodemailer"
import { prisma } from "@/lib/db/prisma"

// ── SMTP transport (self-hosted) ──────────────────────────────────────────────

const smtpTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth:
    process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
})

// ── Auth instance ─────────────────────────────────────────────────────────────

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  advanced: {
    database: {
      // Use standard UUID v4 instead of BetterAuth's default nano-ID format,
      // keeping all IDs consistent across User, Session, Account, Verification.
      generateId: () => crypto.randomUUID(),
    },
  },

  plugins: [
    magicLink({
      // Only send to the configured admin address — non-matching emails are silently
      // dropped so the login form returns the same generic "check your email" message
      // regardless (prevents email enumeration).
      sendMagicLink: async ({ email, url }) => {
        if (email !== process.env.ADMIN_EMAIL) return
        await smtpTransport.sendMail({
          from: process.env.SMTP_FROM ?? "no-reply@localhost",
          to: email,
          subject: "Admin sign-in link",
          text: `Sign in to the admin panel:\n\n${url}\n\nThis link expires in 10 minutes.`,
          html: `<p>Click the link below to sign in to the admin panel:</p>
<p><a href="${url}">${url}</a></p>
<p>This link expires in 10 minutes. If you did not request this, ignore this email.</p>`,
        })
      },
      expiresIn: 600, // 10 minutes
    }),
    apiKey({
      rateLimit: {
        enabled: false, // key secrecy is the auth mechanism — per-request counting
                        // would lock the bot out after 10 calls/day (plugin default)
      },
      // No defaultExpiresIn here — the creation UI always passes expiresIn explicitly,
      // so "No expiry" keys are genuinely perpetual rather than silently getting 1 year.
    }),
    anonymous({
      // When an anonymous user links a real auth method, transfer their data to the
      // new account. BetterAuth auto-deletes the anonymous user after this runs.
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await prisma.$transaction([
          prisma.order.updateMany({
            where: { userId: anonymousUser.user.id },
            data:  { userId: newUser.user.id },
          }),
          // Wallet userId is @unique — reassign instead of merging.
          // If the new user already has a wallet, this will fail; that edge case
          // (anonymous user topped up before linking) is extremely unlikely and
          // can be resolved manually via an ADJUSTMENT WalletTransaction.
          prisma.wallet.updateMany({
            where: { userId: anonymousUser.user.id },
            data:  { userId: newUser.user.id },
          }),
        ])
      },
    }),
  ],

  // Elevate the admin user's role in our schema right after Better Auth creates them.
  // On subsequent sign-ins the user already exists, so this hook is not re-triggered.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (user.email === process.env.ADMIN_EMAIL) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: "ADMIN" },
            })
          }
        },
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
