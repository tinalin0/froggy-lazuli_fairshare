import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SYSTEM_PROMPT = `You are an expense parser. The user will describe an expense in natural language.
Extract all information and return a JSON object with this exact shape:
{
  "description": string,    // concise name for the overall expense, e.g. "Dinner" (max 40 chars) — infer from context if not stated (e.g. sushi + steak → "Dinner", Uber + Lyft → "Transport", groceries → "Groceries")
  "payer_name": string,     // name of the person who paid for everything upfront
  "total_amount": number,   // total amount paid (sum of all item prices unless stated otherwise)
  "items": [
    {
      "name": string,       // what the item is, e.g. "Ramen", "Beer", "Groceries"
      "price": number,      // total price for this item (positive, max 2 decimal places)
      "claimants": string[] // names of people who consumed/ordered this item (they split it equally)
    }
  ]
}
Rules:
- Each distinct thing a person mentions getting, ordering, or consuming becomes its own item.
- If multiple people share one item, list all their names in claimants — they split the cost equally.
- The payer is whoever paid for everyone else upfront.
- total_amount = sum of all item prices (unless the user states a different total).
- Normalise spoken numbers: "ten" → 10, "ten fifty" → 10.50, "ten dollars and fifty cents" → 10.50.
- If the speaker refers to themselves using "I", "me", "myself", or any first-person pronoun, always use the name "me" (lowercase) for that person.
- If no items are distinguishable, return a single item with the total price and all participants as claimants.
- Return ONLY valid JSON — no markdown, no extra text.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return json(null, 200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    });
  }

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!GEMINI_API_KEY) {
    return json({ error: "GEMINI_API_KEY not configured." }, 500);
  }

  const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  let transcript: string;
  try {
    const body = await req.json();
    transcript = body.transcript ?? "";
    if (!transcript.trim()) return json({ error: "No transcript provided." }, 400);
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const geminiRes = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: transcript }] }],
      generationConfig: { maxOutputTokens: 1024 },
    }),
  });

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    return json({ error: `Gemini error: ${err}` }, 502);
  }

  const geminiData = await geminiRes.json();
  const parts: { text?: string }[] = geminiData.candidates?.[0]?.content?.parts ?? [];

  // Try each part — thinking models put the real answer in a later part
  let parsed: Record<string, unknown> | null = null;
  for (const part of parts) {
    const text = part.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) continue;
    try {
      parsed = JSON.parse(match[0]);
      break;
    } catch {
      continue;
    }
  }

  if (!parsed) {
    const raw = parts.map((p) => p.text ?? "").join("\n");
    return json({ error: "LLM returned invalid JSON.", raw }, 422);
  }

  return json(parsed);
});

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders,
    },
  });
}
