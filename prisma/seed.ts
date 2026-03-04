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

// ── Privacy Policy ────────────────────────────────────────────────────────────

const PP_V1 = {
  version: "1.0",
  isActive: true,
  content: `Политика конфиденциальности

Настоящая политика описывает, какие данные собирает Сервис, как они используются и как защищаются. Используя Сервис, вы соглашаетесь с условиями данной политики.

1. Какие данные мы собираем

При создании заявки и работе с Сервисом мы собираем:
• имя пользователя Telegram (если предоставлено);
• адрес электронной почты (при регистрации через веб-интерфейс);
• данные заявки: название сервиса, тариф, сумма, валюта;
• историю платежей и операций с балансом;
• IP-адрес и данные сессии (технические журналы).

Мы не запрашиваем и не храним: номера банковских карт, пароли от сторонних сервисов, паспортные данные.

2. Как используются данные

Собранные данные используются исключительно для:
• обработки и исполнения заявок клиентов;
• ведения финансового учёта и аудита операций;
• поддержки клиентов при возникновении спорных ситуаций;
• обеспечения безопасности и предотвращения мошенничества.

Мы не продаём и не передаём ваши данные третьим лицам в коммерческих целях.

3. Хранение и защита данных

Данные хранятся на защищённых серверах. Доступ к персональным данным ограничен и предоставляется только уполномоченным сотрудникам. Технические и организационные меры защиты соответствуют общепринятым стандартам безопасности.

4. Передача данных третьим лицам

Данные могут быть переданы:
• платёжным системам и банкам — в объёме, необходимом для проведения расчётов;
• государственным органам — по законному требованию.

5. Права пользователей

Вы вправе в любое время:
• запросить информацию о хранящихся данных;
• потребовать исправления или удаления своих данных (в рамках, предусмотренных законодательством);
• отозвать согласие на обработку данных, направив запрос оператору.

6. Cookies и технические данные

Сервис использует файлы cookie для обеспечения работы сессии аутентификации. Cookies не используются для рекламной слежки.

7. Изменение политики

Оператор вправе обновить настоящую политику в любое время, опубликовав новую версию. Продолжение использования Сервиса означает согласие с актуальной версией.`,
}

// ── Terms of Service ──────────────────────────────────────────────────────────

const TOS_V1 = {
  version: "1.0",
  isActive: true,
  content: `Условия использования сервиса

Настоящие условия регулируют использование сервиса помощи в оплате зарубежных цифровых подписок и товаров (далее — «Сервис»). Использование Сервиса означает ваше согласие с данными условиями.

1. Область применения

Сервис предоставляет посреднические услуги по оплате цифровых подписок и иных цифровых товаров у зарубежных провайдеров. Оператор Сервиса не является официальным партнёром, дистрибьютором или представителем каких-либо упоминаемых платформ.

2. Что входит в услугу

Сервис оказывает помощь исключительно в части оплаты уже выбранного клиентом продукта. В услугу не входят:
• консультации по выбору тарифов и сервисов;
• техническая поддержка третьих лиц;
• восстановление доступа к аккаунтам;
• смена региона аккаунта или иные действия, не связанные непосредственно с оплатой.

3. Обязанности клиента

Перед оформлением заявки клиент обязан самостоятельно убедиться в наличии полного доступа к целевому аккаунту (логин, пароль, доступ к привязанной почте). Заявки, для выполнения которых требуется восстановление доступа или иные сторонние действия, не принимаются.

4. Расчёты и оплата

Итоговая сумма к оплате формируется на основании курса валют, зафиксированного на момент создания предложения. Оператор не несёт ответственности за последующее изменение курса. В сумму включён сервисный сбор оператора. Оплата производится путём самостоятельного перевода клиентом указанной суммы на реквизиты оператора; факт зачисления подтверждается оператором вручную.

5. Возврат средств

Возврат производится в случае, если оператор не смог исполнить принятую заявку. Услуга считается оказанной с момента передачи клиенту реквизитов оплаченного продукта; после этого возврат не производится.

6. Ограничения ответственности

Оператор не несёт ответственности за действия или бездействие третьих лиц (платёжных систем, зарубежных сервисов), перебои в работе платформ, а также за последствия нарушения клиентом правил использования оплачиваемых сервисов.

7. Изменение условий

Оператор вправе в любое время изменить настоящие условия, опубликовав новую версию. Продолжение использования Сервиса означает согласие с актуальной версией. Оператор вправе отказать в оказании услуги без объяснения причин.`,
}

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

  // ── 3. Privacy Policy ───────────────────────────────────────────────────────
  console.log("Seeding Privacy Policy v1…")
  await prisma.privacyPolicy.upsert({
    where: { version: PP_V1.version },
    update: {},
    create: PP_V1,
  })

  // ── 4. Terms of Service ─────────────────────────────────────────────────────
  console.log("Seeding ToS v1…")
  await prisma.tosVersion.upsert({
    where: { version: TOS_V1.version },
    update: {},
    create: TOS_V1,
  })

  // ── 5. Service suggestions ──────────────────────────────────────────────────
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
