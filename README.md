# Kitchen Performance Platform (React + TypeScript + Supabase)

This is a TypeScript / TSX rebuild of your original kitchen dashboard, kitchen profit audit, and menu builder.

It keeps the same **core concepts and operational flow**, but restructures the project into a proper VS Code app with:

- React + TypeScript + TSX
- Vite project structure
- Protected routes
- Supabase login
- Remember me support
- Supabase cloud storage for audits and menu projects
- Shared styling and reusable components

## What stayed the same

The rebuild preserves the original ideas from your uploaded HTML files:

- dashboard entry point
- kitchen audit workflow
- commercial metrics like GP, waste, labour, and priority score
- menu costing and menu engineering
- generated report previews
- JSON / HTML exports

## What changed

- single-file HTML pages were moved into routed React pages
- shared layout and styling now lives in reusable components
- sign-in is required before the user can access dashboard pages
- data can be saved into Supabase per user
- the codebase is now much easier to extend in VS Code

## Project structure

```txt
kitchen-performance-tsx/
├─ public/
├─ src/
│  ├─ components/
│  ├─ context/
│  ├─ lib/
│  ├─ pages/
│  ├─ services/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ styles.css
│  └─ types.ts
├─ supabase/
│  └─ schema.sql
├─ .env.example
├─ package.json
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts
```

## How to run in VS Code

1. Open the folder in VS Code
2. Run:

```bash
npm install
npm run dev
```

3. Copy `.env.example` to `.env`
4. Add your Supabase project values:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Supabase setup

1. Create a Supabase project
2. Open the SQL editor
3. Run `supabase/schema.sql`
4. In **Authentication**, create the users who should be allowed to log in
5. Keep public self-signup disabled if you only want approved users to access the app

## Notes on access control

This starter is built so that:

- users must sign in first
- each user only sees their own saved audits and menu projects
- storage is protected by Row Level Security policies

## Easy next upgrades

- PDF export with a branded print layout
- photo uploads for audit evidence
- white-label branding controls
- role-based access for admin vs consultant
- action tracker with deadlines and owners
- client sharing links
