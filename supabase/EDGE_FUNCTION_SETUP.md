# Edge Function Setup — scan-receipt

## 1. Install Supabase CLI

```bash
npm install -g supabase
```

## 2. Link your project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```
(Your project ref is the part of your Supabase URL after `https://` and before `.supabase.co`)

## 3. Set the OpenAI secret

```bash
supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here
```

## 4. Deploy the function

```bash
supabase functions deploy scan-receipt
```

## 5. Verify

The function will be live at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/scan-receipt
```

The app calls it automatically when you tap the camera button on the Add Expense screen.

## Storage bucket for receipts (optional)

If you want to store receipt images, create a public bucket called `receipts`
in your Supabase dashboard under Storage → New bucket → name: `receipts` → Public.
