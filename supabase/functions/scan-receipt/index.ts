import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const SYSTEM_PROMPT = `You are a receipt parser. The user will send you a receipt image.
Extract ONLY these fields from the receipt and return a JSON object:
{
  "description": string,   // merchant name or most prominent item (max 40 chars)
  "subtotal": number | null,
  "tax": number | null,
  "tip": number | null,
  "total": number          // the final total charged; required
}
Rules:
- All amounts must be positive numbers with at most 2 decimal places.
- If a field is not present on the receipt, set it to null.
- Return ONLY valid JSON — no markdown, no extra text.`;

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
      },
    });
  }

  if (!OPENAI_API_KEY) {
    return json({ error: "OPENAI_API_KEY not configured." }, 500);
  }

  let base64Image: string;
  let mimeType: string;

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) return json({ error: "No image provided." }, 400);

    mimeType = file.type || "image/jpeg";
    const buffer = await file.arrayBuffer();
    base64Image = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  } catch {
    return json({ error: "Failed to read image." }, 400);
  }

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 256,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Parse this receipt." },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: "low" },
            },
          ],
        },
      ],
    }),
  });

  if (!openaiRes.ok) {
    const err = await openaiRes.text();
    return json({ error: `OpenAI error: ${err}` }, 502);
  }

  const openaiData = await openaiRes.json();
  const raw = openaiData.choices?.[0]?.message?.content ?? "";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return json({ error: "LLM returned invalid JSON.", raw }, 422);
  }

  return json(parsed);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
