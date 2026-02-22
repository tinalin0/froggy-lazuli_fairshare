import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SYSTEM_PROMPT = `You are a receipt parser. The user will send you a receipt image.
Extract all information and return a JSON object:
{
  "description": string,   // merchant name or most prominent item (max 40 chars)
  "items": [{ "name": string, "quantity": number, "price": number | null }],
  "subtotal": number | null,
  "tax": number | null,
  "tip": number | null,
  "total": number          // the final total charged; required
}
Rules:
- List every individual line item in the items array.
- "price" is the total for that line (quantity x unit price).
- All amounts must be positive numbers with at most 2 decimal places.
- If a field is not present on the receipt, set it to null.
- Use an empty array for items if none can be identified.
- Return ONLY valid JSON — no markdown, no extra text.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
      },
    });
  }

  // Read key inside the handler so secret updates take effect without redeployment
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!GEMINI_API_KEY) {
    return json({ error: "GEMINI_API_KEY not configured." }, 500);
  }

  const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  let base64Image: string;
  let mimeType: string;

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) return json({ error: "No image provided." }, 400);

    mimeType = file.type || "image/jpeg";
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    base64Image = btoa(binary);
  } catch {
    return json({ error: "Failed to read image." }, 400);
  }

  const geminiRes = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          parts: [
            { text: "Parse this receipt." },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    return json({ error: `Gemini error: ${err}` }, 502);
  }

  const geminiData = await geminiRes.json();
  const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let parsed: Record<string, unknown>;
  try {
    const clean = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(clean);
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
