# Flenzr Web Application

Built with:
- Next.js 15+ (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Supabase Auth SSR Client

## Architecture
- **Public Profile / Link-in-Bio (`/[username]`)**: Server-Side Rendered (SSR) / ISR for optimal SEO and social preview indexing.
- **Creator Dashboard (`/dashboard/creator`)**: Client-side interactive studio for rates, links, analytics, and offers.
- **Brand Dashboard (`/dashboard/brand`)**: Creator discovery, shortlisting, and campaign collaboration management.

## Run locally

Run `npm run dev` here and open `http://localhost:3210`. Production preview with `npm run start` also uses port 3210.
Copy `.env.example` to `.env.local` for a new setup, then supply the existing Supabase project values. Local API requests target `http://127.0.0.1:8210/api/v1`.
