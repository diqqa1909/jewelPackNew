const SOURCE_URL = "https://goldpricesrilanka.com/";
const CARATS = ["18", "19", "20", "21", "22", "24"] as const;

export type GoldCarat = (typeof CARATS)[number];
export type GoldRatesByCarat = Partial<Record<GoldCarat, string>>;
export type GoldPricesResult = {
  ok: boolean;
  sourceUrl: string;
  fetchedAt?: string;
  unit: "LKR_PER_8G";
  rates: GoldRatesByCarat;
  error?: string;
};

function decodeEntities(value: string) {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&#8377;/g, "Rs.");
}

function pageText(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
  );
}

function toAmount(raw: string) {
  const amount = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function per8gFromContext(amount: number, context: string) {
  if (amount <= 0) return 0;
  if (/\b(?:gram|grams|per\s*g|\/g)\b/i.test(context)) return amount * 8;
  if (/\b(?:pavan|sovereign|8\s*g|8g|per\s*8)\b/i.test(context)) return amount;
  return amount < 100000 ? amount * 8 : amount;
}

function parseGoldRates(html: string): GoldRatesByCarat {
  const text = pageText(html);
  const rates: GoldRatesByCarat = {};

  for (const carat of CARATS) {
    const labels = [`${carat}\\s*(?:K|KT|CARAT)`, `(?:K|KT|CARAT)\\s*${carat}`];

    for (const label of labels) {
      const matches = text.matchAll(new RegExp(`${label}.{0,260}`, "gi"));
      for (const match of matches) {
        const context = match[0] ?? "";
        const amounts = context.match(/(?:Rs\.?|LKR)\s*[0-9][0-9,\s]*(?:\.\d+)?/gi) ?? [];
        const fallbackAmounts = amounts.length > 0 ? amounts : context.match(/[0-9][0-9,\s]{3,}(?:\.\d+)?/g) ?? [];

        for (const rawAmount of fallbackAmounts) {
          const amount = toAmount(rawAmount);
          if (amount < 1000) continue;
          const per8g = per8gFromContext(amount, context);
          if (per8g > 0) {
            rates[carat] = per8g.toFixed(2);
            break;
          }
        }
        if (rates[carat]) break;
      }
      if (rates[carat]) break;
    }
  }

  const pure24 = Number(rates["24"] ?? 0);
  if (pure24 > 0) {
    for (const carat of CARATS) {
      if (!rates[carat]) rates[carat] = ((pure24 * Number(carat)) / 24).toFixed(2);
    }
  }

  return rates;
}

export async function fetchGoldPrices(): Promise<GoldPricesResult> {
  try {
    const res = await fetch(SOURCE_URL, {
      cache: "no-store",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36"
      },
      signal: AbortSignal.timeout(10000)
    });

    const html = await res.text();
    if (!res.ok) {
      return { ok: false, sourceUrl: SOURCE_URL, unit: "LKR_PER_8G", rates: {}, error: `Gold price source returned ${res.status}` };
    }

    if (/verifying that you are not a robot|cf-browser-verification|cloudflare/i.test(html)) {
      return { ok: false, sourceUrl: SOURCE_URL, unit: "LKR_PER_8G", rates: {}, error: "Gold price source blocked automated access." };
    }

    const rates = parseGoldRates(html);
    if (Object.keys(rates).length === 0) {
      return { ok: false, sourceUrl: SOURCE_URL, unit: "LKR_PER_8G", rates: {}, error: "Unable to read gold prices from source." };
    }

    return { ok: true, sourceUrl: SOURCE_URL, fetchedAt: new Date().toISOString(), unit: "LKR_PER_8G", rates };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to fetch gold prices";
    return { ok: false, sourceUrl: SOURCE_URL, unit: "LKR_PER_8G", rates: {}, error: message };
  }
}
