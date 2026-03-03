import "dotenv/config"
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ── Seed data ─────────────────────────────────────────────────────────────────
// sortOrder groups by category; within a group, lower = more prominent.
// All prices are in USD — the most common currency for these services.

const SERVICES = [
  // AI Tools (1–19)
  { name: "ChatGPT",               category: "AI Tools",     defaultCurrency: "USD", defaultTariff: "Plus",               sortOrder: 1   },
  { name: "Claude",                category: "AI Tools",     defaultCurrency: "USD", defaultTariff: "Pro",                sortOrder: 2   },
  { name: "Midjourney",            category: "AI Tools",     defaultCurrency: "USD", defaultTariff: "Basic",              sortOrder: 3   },
  { name: "GitHub Copilot",        category: "AI Tools",     defaultCurrency: "USD", defaultTariff: "Individual",         sortOrder: 4   },
  { name: "Perplexity",            category: "AI Tools",     defaultCurrency: "USD", defaultTariff: "Pro",                sortOrder: 5   },

  // Music (20–39)
  { name: "Spotify",               category: "Music",        defaultCurrency: "USD", defaultTariff: "Premium Individual", sortOrder: 20  },
  { name: "Apple Music",           category: "Music",        defaultCurrency: "USD", defaultTariff: "Individual",         sortOrder: 21  },
  { name: "YouTube Music",         category: "Music",        defaultCurrency: "USD", defaultTariff: "Individual",         sortOrder: 22  },
  { name: "Tidal",                 category: "Music",        defaultCurrency: "USD", defaultTariff: "HiFi",               sortOrder: 23  },
  { name: "Deezer",                category: "Music",        defaultCurrency: "EUR", defaultTariff: null,                 sortOrder: 24  },

  // Video (40–59)
  { name: "Netflix",               category: "Video",        defaultCurrency: "USD", defaultTariff: "Standard",           sortOrder: 40  },
  { name: "YouTube Premium",       category: "Video",        defaultCurrency: "USD", defaultTariff: "Individual",         sortOrder: 41  },
  { name: "Disney+",               category: "Video",        defaultCurrency: "USD", defaultTariff: "Standard",           sortOrder: 42  },
  { name: "HBO Max",               category: "Video",        defaultCurrency: "USD", defaultTariff: null,                 sortOrder: 43  },
  { name: "Amazon Prime",          category: "Video",        defaultCurrency: "USD", defaultTariff: null,                 sortOrder: 44  },
  { name: "Apple TV+",             category: "Video",        defaultCurrency: "USD", defaultTariff: null,                 sortOrder: 45  },

  // Gaming (60–79)
  { name: "Xbox",                  category: "Gaming",       defaultCurrency: "USD", defaultTariff: "Game Pass Ultimate", sortOrder: 60  },
  { name: "PlayStation",           category: "Gaming",       defaultCurrency: "USD", defaultTariff: "Plus Essential",     sortOrder: 61  },
  { name: "EA Play",               category: "Gaming",       defaultCurrency: "USD", defaultTariff: null,                 sortOrder: 62  },
  { name: "Nintendo Switch Online",category: "Gaming",       defaultCurrency: "USD", defaultTariff: "Individual",         sortOrder: 63  },

  // Productivity (80–99)
  { name: "Notion",                category: "Productivity", defaultCurrency: "USD", defaultTariff: "Plus",               sortOrder: 80  },
  { name: "Figma",                 category: "Productivity", defaultCurrency: "USD", defaultTariff: "Professional",       sortOrder: 81  },
  { name: "Adobe Creative Cloud",  category: "Productivity", defaultCurrency: "USD", defaultTariff: "All Apps",           sortOrder: 82  },
  { name: "Canva",                 category: "Productivity", defaultCurrency: "USD", defaultTariff: "Pro",                sortOrder: 83  },
  { name: "Dropbox",               category: "Productivity", defaultCurrency: "USD", defaultTariff: "Plus",               sortOrder: 84  },
  { name: "Microsoft 365",         category: "Productivity", defaultCurrency: "USD", defaultTariff: "Personal",           sortOrder: 85  },

  // Education (100–119)
  { name: "Duolingo",              category: "Education",    defaultCurrency: "USD", defaultTariff: "Plus",               sortOrder: 100 },
] as const

// ── Seed users (CLIENT role, fixed UUIDs for idempotent re-seeding) ──────────

const SEED_USERS = [
  { id: "00000001-0000-0000-0000-000000000001", handle: "@alex_spb" },
  { id: "00000001-0000-0000-0000-000000000002", handle: "@marianna_k" },
  { id: "00000001-0000-0000-0000-000000000003", handle: "@dmitry_dev" },
  { id: "00000001-0000-0000-0000-000000000004", handle: "@nastya_photo" },
  { id: "00000001-0000-0000-0000-000000000005", handle: "@pavel_23" },
  { id: "00000001-0000-0000-0000-000000000006", handle: "@ivan_music" },
  { id: "00000001-0000-0000-0000-000000000007", handle: "@olga_b" },
  { id: "00000001-0000-0000-0000-000000000008", handle: "@tanya_design" },
  { id: "00000001-0000-0000-0000-000000000009", handle: "@sergei_m" },
] as const

// ── Seed orders (canonical dev/QA test data, linked to SEED_USERS) ──────────
// originalPrice stored with 4 decimal places (schema: Decimal(12,4)).
// requiredRub / paidRub stored with 2 decimal places (schema: Decimal(12,2)).

const SEED_ORDERS = [
  {
    id: "a1b2c3d4-0001-0000-0000-000000000001",
    userId: "00000001-0000-0000-0000-000000000001", // @alex_spb
    serviceName: "Spotify",
    tariff: "Premium Individual",
    originalPrice: "10.99",
    originalCurrency: "EUR",
    requiredRub: "1299.00",
    paidRub: "1299.00",
    status: "FULLY_PAID",
    createdAt: new Date("2026-02-25"),
  },
  {
    id: "b2c3d4e5-0002-0000-0000-000000000002",
    userId: "00000001-0000-0000-0000-000000000002", // @marianna_k
    serviceName: "Netflix",
    tariff: "Standard",
    originalPrice: "6.99",
    originalCurrency: "USD",
    requiredRub: "1099.00",
    paidRub: "500.00",
    status: "PARTIALLY_PAID",
    createdAt: new Date("2026-02-26"),
  },
  {
    id: "c3d4e5f6-0003-0000-0000-000000000003",
    userId: "00000001-0000-0000-0000-000000000003", // @dmitry_dev
    serviceName: "ChatGPT",
    tariff: "Plus",
    originalPrice: "20.00",
    originalCurrency: "USD",
    requiredRub: "2299.00",
    paidRub: "0.00",
    status: "WAITING_PAYMENT",
    createdAt: new Date("2026-02-27"),
  },
  {
    id: "d4e5f6a7-0004-0000-0000-000000000004",
    userId: "00000001-0000-0000-0000-000000000004", // @nastya_photo
    serviceName: "Adobe Creative Cloud",
    tariff: "Photography Plan",
    originalPrice: "9.99",
    originalCurrency: "USD",
    requiredRub: "1399.00",
    paidRub: "0.00",
    status: "WAITING_ADMIN_APPROVAL",
    createdAt: new Date("2026-02-28"),
  },
  {
    id: "e5f6a7b8-0005-0000-0000-000000000005",
    userId: "00000001-0000-0000-0000-000000000005", // @pavel_23
    serviceName: "Duolingo",
    tariff: "Plus",
    originalPrice: null,
    originalCurrency: null,
    requiredRub: "0.00",
    paidRub: "0.00",
    status: "NEEDS_CLARIFICATION",
    createdAt: new Date("2026-03-01"),
  },
  {
    id: "f6a7b8c9-0006-0000-0000-000000000006",
    userId: "00000001-0000-0000-0000-000000000006", // @ivan_music
    serviceName: "YouTube Premium",
    tariff: "Individual",
    originalPrice: "13.99",
    originalCurrency: "USD",
    requiredRub: "1799.00",
    paidRub: "1799.00",
    status: "DELIVERED",
    createdAt: new Date("2026-02-20"),
  },
  {
    id: "a7b8c9d0-0007-0000-0000-000000000007",
    userId: "00000001-0000-0000-0000-000000000007", // @olga_b
    serviceName: "Microsoft 365",
    tariff: "Personal",
    originalPrice: "6.99",
    originalCurrency: "USD",
    requiredRub: "1099.00",
    paidRub: "1099.00",
    status: "CLOSED",
    createdAt: new Date("2026-02-15"),
  },
  {
    id: "b8c9d0e1-0008-0000-0000-000000000008",
    userId: "00000001-0000-0000-0000-000000000008", // @tanya_design
    serviceName: "Canva Pro",
    tariff: null,
    originalPrice: "12.99",
    originalCurrency: "USD",
    requiredRub: "0.00",
    paidRub: "0.00",
    status: "DRAFT",
    createdAt: new Date("2026-03-01"),
  },
  {
    id: "c9d0e1f2-0009-0000-0000-000000000009",
    userId: "00000001-0000-0000-0000-000000000009", // @sergei_m
    serviceName: "Spotify Premium",
    tariff: "Premium Family",
    originalPrice: "17.99",
    originalCurrency: "EUR",
    requiredRub: "2099.00",
    paidRub: "0.00",
    status: "REJECTED",
    createdAt: new Date("2026-02-22"),
  },
] as const

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Users ────────────────────────────────────────────────────────────────
  console.log(`Seeding ${SEED_USERS.length} users…`)
  for (const user of SEED_USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { handle: user.handle },
      create: { id: user.id, role: "CLIENT", handle: user.handle, isDemo: true },
    })
  }

  // ── 2. Orders ───────────────────────────────────────────────────────────────
  console.log(`Seeding ${SEED_ORDERS.length} orders…`)
  for (const order of SEED_ORDERS) {
    await prisma.order.upsert({
      where: { id: order.id },
      update: {}, // never overwrite real state on re-seed
      create: {
        id: order.id,
        userId: order.userId,
        serviceName: order.serviceName,
        tariff: order.tariff,
        originalPrice: order.originalPrice,
        originalCurrency: order.originalCurrency,
        requiredRub: order.requiredRub,
        paidRub: order.paidRub,
        status: order.status,
        createdAt: order.createdAt,
      },
    })
  }

  // ── 3. Service suggestions ──────────────────────────────────────────────────
  // Delete all first so renamed entries don't accumulate as stale rows.
  await prisma.serviceSuggestion.deleteMany({})
  console.log(`Seeding ${SERVICES.length} service suggestions…`)
  for (const service of SERVICES) {
    await prisma.serviceSuggestion.create({ data: service })
  }

  console.log("Done.")
}

// tsx runs seed.ts as CJS; top-level await is not supported in that mode.
// The IIFE below is functionally identical — suppress S7785 if your linter flags it.
void (async () => { // NOSONAR typescript:S7785
  try {
    await main()
  } catch (err) {
    console.error(err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()
