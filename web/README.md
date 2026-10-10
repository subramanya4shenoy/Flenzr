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
