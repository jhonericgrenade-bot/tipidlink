# TIPIDLINK: Shared Family Budget Management Platform 🇵🇭

> *"Habang nagtitipid, gumiginhawa ang buhay."*  
> (As you save, life becomes more comfortable.)

**TipidLink** is a modern, responsive, family-centered financial web application designed specifically for Filipino households. It brings breadwinners, parents, working students, and family members together into a single, transparent, and collaborative budget space.

---

## 🌟 Key Features

1. **Supabase Authentication & Multi-Persona Session Persistence**
   - Secure registration and login connected to Supabase Auth (`auth.users` & `public.profiles`).
   - Interactive Demo Mode with pre-populated Filipino household personas (**Maria Santos - Budget Manager**, **Juan Santos - Breadwinner**, **Angela Santos - Working Student**).

2. **Household & Family Member Management**
   - Create households with customized monthly spending targets.
   - Join existing households via unique invite codes (e.g., `SANTOS2026`).
   - Role-based access control: `owner`, `admin`, and `member`.
   - Strict household-level data isolation using PostgreSQL Row Level Security (RLS).

3. **Income & Expense Tracking (Transactions)**
   - Add, edit, filter, search, and delete transactions.
   - Categorization (Palengke & Groceries, Meralco Electric, Maynilad Water, Converge Fiber, Tricycle/Jeep commute, School Baon, Salary, Sari-Sari Store profits, Remittance/OFW padala).
   - Export filtered transactions to CSV with a single click.

4. **Category & Overall Monthly Budgets**
   - Set monthly spending ceilings per category and for the entire household.
   - Real-time progress meters showing percentage used, spent balance, and remaining funds.
   - Prominent overspending warning banners when expenses exceed target allocations.

5. **Household Bills & Partial/Full Payments**
   - Track biller names, account numbers, amounts, due dates, and frequencies.
   - Automatically computes statuses: `unpaid`, `partially_paid`, `paid`, and `overdue`.
   - Record payment installments (GCash, Maya, Bank Transfer, Bayad Center Cash) with reference numbers and payment history ledger.

6. **Savings Goals (Pondong Pang-ipit)**
   - Set target savings goals (Emergency funds, holiday Noche Buena, inverter appliances, tuition).
   - Record family contributions and monitor completion percentages and milestone achievements.

7. **Executive Fintech Dashboard**
   - Real-time KPI summary cards (Total Income, Total Expenses, Remaining Budget, Unpaid / Overdue Bills).
   - Monthly period selectors (Month & Year).
   - Dynamic spending breakdown donut chart using Recharts.
   - Upcoming bill deadlines countdown and recent family transaction feed.

---

## 🏗️ Technology Stack

- **Frontend:** React 19, Vite 8, Tailwind CSS v4, Lucide React, Recharts
- **Backend / Database:** Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS)
- **Formatting:** Philippine Peso currency formatting (`₱`), localized date helpers, and non-recursive SQL helper functions.
- **Testing:** Node.js native test runner (`node --test`).

---

## 🗄️ Database Architecture & Schema

The PostgreSQL schema is completely normalized and includes primary keys, foreign keys, timestamps, indexes, triggers, and Row Level Security policies.

The complete SQL migration is located in:
```bash
supabase/migrations/001_initial_schema.sql
```

### Core Tables:
- `public.profiles`: Extends `auth.users` with `full_name`, `avatar_url`, and contact details.
- `public.households`: Household profile, invite codes, currency (`PHP`), and monthly budget targets.
- `public.household_members`: Junction table connecting users to households with roles (`owner`, `admin`, `member`).
- `public.categories`: Standard Filipino household expense & income categories + custom household categories.
- `public.transactions`: Complete income and expense ledger.
- `public.budgets`: Monthly period-based spending limits per category and overall household.
- `public.bills`: Scheduled and recurring utility dues with automatic status computation.
- `public.bill_payments`: Payment transaction records tied to specific bills.
- `public.savings_goals`: Target savings goals with progress tracking.
- `public.savings_contributions`: Individual contributions to savings goals.

### 🛡️ Non-Recursive Row Level Security (RLS) Design:
To eliminate recursive policy lookups while enforcing strict data isolation between households, the schema defines a `SECURITY DEFINER` helper function:
```sql
CREATE OR REPLACE FUNCTION public.get_user_household_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT household_id 
    FROM public.household_members 
    WHERE user_id = user_uuid;
$$;
```
All tables use this function to ensure users can **only read and write records belonging to households where they are registered members**.

---

## 🚀 Getting Started & Local Development

### 1. Prerequisites
- Node.js (v18 or newer)
- npm (v9 or newer)

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Fill in your Supabase project credentials (obtainable from Supabase Dashboard > Project Settings > API):
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-publishable-key
```
> **Note:** If `.env` is empty, TipidLink automatically activates **Interactive Demo Mode**, allowing instant evaluation with realistic Filipino family records without requiring immediate database setup.

### 4. Running the Database Migration
In your Supabase project dashboard:
1. Navigate to the **SQL Editor**.
2. Open `supabase/migrations/001_initial_schema.sql`.
3. Paste the contents into the SQL Editor and click **Run**.
4. Enable Email Authentication in **Authentication > Providers > Email**.

### 5. Running the Application
Start the development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Running Automated Tests
Run unit tests for Philippine Peso currency formatting, date parsing, and due date calculators:
```bash
npm test
```

### 7. Building for Production
```bash
npm run build
```

---

## 👥 Project Presentation Team Credits
- **Kevin Palaca** — Project Lead
- **Jhon Eric Granada** — UI/UX & Design
- **Miguel James Laput** — Programmer
- **Wiljune Baisac** — Marketing & Quality Assurance
- **Jhon Carlo Puclay** — Finance & Business Services
