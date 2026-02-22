# Project Report: Froggy-Lazuli fairshare 🐸

## Inspiration
Living with roommates or friends is a huge part of student life, but it often comes with a hidden cost: financial friction. Whether it is a shared grocery run or a group dinner, the process of manually calculating debts and chasing people for money can strain relationships, turning into social friction. This is especially true for students living abroad or those who don't know each other well. We built **fairshare** to remove the awkwardness of these interactions, creating a tool that encourages trust through clear and impartial documentation.

## What it does
fairshare is a mobile-first web app designed to be a student’s primary financial companion for shared living:
* **Effortless Input:** Users snap a photo of a receipt and the Gemini AI takes over. It accurately identifies totals, taxes, and tips to eliminate manual entry errors.
* **Persistent Documentation:** Through Supabase, every expense is logged in a persistent, shared ledger. This creates a single source of truth that everyone in the group can rely on, which reduces disputes and memory gaps.
* **Reducing Social Friction:** By automating the calculation and settlement instructions, the app acts as a neutral third party. This takes the emotion and discomfort out of money management.

## How we built it
Our tech stack was chosen for speed, reliability, and ease of use:
* **Frontend:** We built the interface using **React** and **Vite** for a fast, modern development experience. **Tailwind CSS** allowed us to create a clean, responsive design that looks great on any student's phone.
* **Backend & Database:** **Supabase** handles our relational data and secure user authentication. This ensures that every user's history is saved and accessible across any device.
* **AI Intelligence:** We integrated the **Gemini API** to handle receipt processing. By sending images directly to the model, the app understands the context of the receipt and extracts the data without requiring manual typing.
* **Deployment:** The project is hosted on **Netlify**, providing a stable and fast experience for our users across the country.



## Challenges we ran into
* **Building Trust through Accuracy:** In a financial app, trust is everything. We had to carefully engineer our AI prompts to ensure that the data extracted from receipts is highly accurate before the user confirms the split.
* **Persistent State Management:** Designing a system where users can belong to multiple groups while maintaining a clear personal balance sheet required a complex relational database structure in Supabase.
* **Handling Multi-Modal Data:** Learning how to effectively pass image data from a React frontend through to the Gemini API while maintaining security and speed was a significant technical hurdle.

## Accomplishments that we're proud of
* **Documentation Clarity:** We created a system that provides a clear and unalterable trail of expenses. This is the foundation of building trust between roommates.
* **The Convenience Factor:** We reduced the time it takes to log an expense from minutes of manual typing to just seconds of AI processing.
* **Persistent User Experience:** We successfully implemented a secure account system so that students' financial data is always there when they need it, regardless of the device they use.

## What we learned
* **Social Friction is a UX Problem:** We learned that the biggest barrier to settling debts isn't the payment itself, but the mental load of the math and the awkwardness of the request. Good UX can actually solve social problems.
* **The Power of Multi-Modal AI:** Using Gemini to read images allowed us to prioritize user convenience over technical complexity. This makes the app much more accessible.
* **Accountability via Persistence:** Having a persistent, logged history changes the dynamic of a group from guessing to knowing. This naturally builds social trust.

## What's next for froggy-lazuli_fairshare
The roadmap for fairshare focuses on expanding the student's financial toolkit:

* **Intelligent Itemization:** We want the AI to identify specific items so users can split bills even more accurately, like separating shared groceries from personal snacks.
* **Visual Journey & Budgeting:** We plan to implement interactive infographics that show users their spending journey over time. These visuals will help students understand their habits, identify where they can save, and take the stress out of personal budgeting.
* **Modern Settlement Infrastructure:** We are exploring the integration of Open Banking and Interac e-Transfer shortcuts to make settling up instantaneous. We also see a future for Blockchain technology to provide an even more transparent and immutable ledger for group expenses.
* **Deep-Linking & Notifications:** We are looking to implement push notifications to keep everyone updated on group balances and add shortcuts for Interac e-Transfer details.
* **Sustainability & Scaling:** We will introduce a premium tier for power users with unlimited scans while keeping the core trust-building tools free for all students.
