# Project Specification: Split Web App MVP

## 1. Project Overview
**Goal:** A student-friendly expense splitting app focused purely on fast input and easy settlement. 

---

## 2. Tech Stack Requirements
* **Frontend:** Next.js (App Router) with React
    * Tailwind CSS for rapid, mobile-first styling.
    * shadcn/ui (optional but recommended) for pre-built, clean UI components.
    * Native mobile camera integration using HTML5 `<input type="file" accept="image/*" capture="environment">`.
* **Backend / Storage:** Supabase 
    * Postgres database for relational data.
    * Supabase Storage for receipt images.
    * Next.js API Routes (Server Actions) to securely handle the LLM/OCR API calls without exposing API keys.
    * Anonymous/Local auth to start.

---

## 3. Core Functionality (In-Scope)
1.  **Group Management:**
    * Create a group.
    * Add members to the group.
2.  **Expense Entry:**
    * **Manual Entry:** Input payer, total amount, and participants.
    * **Receipt Scan:** Mobile browser camera capture → Next.js API Route → OCR → LLM extraction (auto-fills total, tax, tip).
3.  **Split Options:**
    * Equal split.
    * Custom dollar amounts.
    * Custom percentages.
4.  **Balance Tracking & Settlement:**
    * Real-time balance tracking per member within a group.
    * “Settle” screen generating minimal payment instructions (e.g., "Alice pays Bob $12.40").
    * Ability to mark payments as settled (in-app state change only).

---

## 4. Strict Non-Goals (Out-of-Scope)
* **NO** item-level splitting.
* **NO** real payment processing (Stripe, Plaid, etc.).
* **NO** blockchain or crypto integrations.
* **NO** complex user login systems (stick to device-based/local/anonymous auth).

---

## 5. Receipt Processing Pipeline
When implementing the receipt scanner, follow this flow:
1.  **Capture:** User taps the camera button (`<input type="file" accept="image/*" capture="environment">`).
2.  **Upload & OCR:** Image is sent to a Next.js API route/Server Action, where text is extracted using a cloud OCR API.
3.  **LLM Post-Processing:** Pass the raw OCR text to an LLM securely on the server.
    * *Prompt requirement:* Instruct the LLM to convert the raw text into structured JSON.
    * *Extraction targets:* `subtotal`, `tax`, `tip`, `total`.
4.  **Validation:** Return the JSON to the frontend and present the extracted data to the user for manual confirmation/editing before saving.

---

## 6. Data Models
Create schemas based on the following relational structure:

* **Groups**
    * `id` (UUID, PK)
    * `name` (String)
    * `created_at` (Timestamp)
* **Members**
    * `id` (UUID, PK)
    * `group_id` (UUID, FK -> Groups)
    * `name` (String)
* **Expenses**
    * `id` (UUID, PK)
    * `group_id` (UUID, FK -> Groups)
    * `payer_id` (UUID, FK -> Members)
    * `description` (String)
    * `total_amount` (Decimal)
    * `receipt_image_url` (String, optional)
    * `created_at` (Timestamp)
* **Expense_Shares (Computed/Saved Splits)**
    * `id` (UUID, PK)
    * `expense_id` (UUID, FK -> Expenses)
    * `member_id` (UUID, FK -> Members)
    * `amount_owed` (Decimal)
    * `is_settled` (Boolean, default: false)

---

## 7. Instructions for Cursor AI
Please act as an expert Next.js developer. Execute the build in the following phases. Wait for my approval after completing each phase.

* **Phase 1:** Initialize the Next.js project with Tailwind CSS. Set up a mobile-first, responsive layout shell.
* **Phase 2:** Set up the Supabase client and create the database models based on the Data Models section. Create basic CRUD Server Actions.
* **Phase 3:** Build the UI and logic for creating Groups and adding Members.
* **Phase 4:** Build the Manual Expense entry flow and the Split Logic (Equal, Amount, Percentage).
* **Phase 5:** Build the Settle Screen logic (calculating who owes whom and minimizing transactions).
* **Phase 6:** Implement the HTML5 Camera input and build the Next.js API route for the OCR + LLM receipt scanning pipeline.

