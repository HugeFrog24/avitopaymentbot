import { XMLParser } from "fast-xml-parser"
import { Decimal } from "@prisma/client/runtime/client"

const CBR_URL = "https://www.cbr.ru/scripts/XML_daily_eng.asp"

// ── Types ────────────────────────────────────────────────────────────────────

export interface RateResult {
  rate: Decimal // rubles per 1 unit of foreign currency
  timestamp: Date // when the rate was fetched (freeze moment)
  source: string // e.g. "CBR 28.02.2026"
}

export interface ConversionResult extends RateResult {
  originalAmount: Decimal
  originalCurrency: string
  amountRub: Decimal
  serviceFeeRub: Decimal
  totalRub: Decimal
}

// Fixed service fee in rubles, added on top of the converted amount
export const SERVICE_FEE_RUB = new Decimal(500)

// ── XML parsing ──────────────────────────────────────────────────────────────

interface CbrValute {
  CharCode: string
  Nominal: number
  Value: string // e.g. "88,1234" — Russian locale comma decimal
  VunitRate: string
}

interface CbrResponse {
  ValCurs?: {
    "@_Date"?: string
    Valute?: CbrValute[]
  }
}

function parseDecimalRu(value: string): Decimal {
  // CBR uses comma as decimal separator
  return new Decimal(value.replaceAll(",", "."))
}

// ── Core fetch ───────────────────────────────────────────────────────────────

/**
 * Fetches the current CBR daily rate for a given ISO currency code.
 * Returns rubles per 1 unit of the foreign currency.
 *
 * Accepts an optional `fetcher` for testing (default: global fetch).
 * Throws if the currency is not found or the request fails.
 */
export async function fetchRate(
  currencyCode: string,
  fetcher: typeof fetch = fetch,
): Promise<RateResult> {
  const upperCode = currencyCode.toUpperCase()

  const response = await fetcher(CBR_URL, {
    // No caching — we always want the latest rate
    cache: "no-store",
    headers: { Accept: "application/xml" },
  })

  if (!response.ok) {
    throw new Error(`CBR rate fetch failed: ${response.status} ${response.statusText}`)
  }

  const xml = await response.text()

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" })
  const parsed = parser.parse(xml) as CbrResponse

  const valutes = parsed.ValCurs?.Valute
  if (!Array.isArray(valutes)) {
    throw new TypeError("CBR response has unexpected structure")
  }

  const entry = valutes.find((v) => v.CharCode === upperCode)
  if (!entry) {
    throw new Error(
      `Currency "${upperCode}" not found in CBR daily rates. ` +
        `Check https://www.cbr.ru/scripts/XML_daily_eng.asp for available codes.`,
    )
  }

  // VunitRate is already normalized to 1 unit (Value / Nominal)
  const rate = parseDecimalRu(entry.VunitRate)
  const dateLabel = parsed.ValCurs?.["@_Date"] ?? "unknown date"

  return {
    rate,
    timestamp: new Date(),
    source: `CBR ${dateLabel}`,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Converts a foreign-currency amount to rubles using the live CBR rate,
 * then appends the service fee.
 *
 * The rate is frozen at call time and should be stored on the Order so the
 * client is always billed the quoted amount regardless of later rate moves.
 *
 * `fee` defaults to SERVICE_FEE_RUB but callers should pass the per-order
 * snapshot (Order.serviceFeeRub) so existing orders are unaffected by
 * future fee changes.
 *
 * Accepts an optional `fetcher` for testing (default: global fetch).
 */
export async function convertToRub(
  amount: Decimal | number | string,
  currencyCode: string,
  fee: Decimal | number = SERVICE_FEE_RUB,
  fetcher: typeof fetch = fetch,
): Promise<ConversionResult> {
  const originalAmount = new Decimal(amount)
  const serviceFeeRub = new Decimal(fee)
  const rateResult = await fetchRate(currencyCode, fetcher)

  const amountRub = originalAmount.mul(rateResult.rate).toDecimalPlaces(2)
  const totalRub = amountRub.add(serviceFeeRub)

  return {
    ...rateResult,
    originalAmount,
    originalCurrency: currencyCode.toUpperCase(),
    amountRub,
    serviceFeeRub,
    totalRub,
  }
}
