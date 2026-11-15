# E Workers — Local Services Marketplace (Hyderabad & Jamshoro)

Full-stack local services marketplace connecting CNIC-verified electricians, plumbers, AC technicians, solar installers, carpenters, and painters in **Hyderabad** and **Jamshoro**, Pakistan.

## Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, React Router, English / Urdu / Sindhi (LTR & RTL)
- **Backend**: Express, WebSockets (`ws`) for real-time chat & notifications, JWT httpOnly cookies, `bcryptjs`
- **Database**: Embedded **SQLite** (`better-sqlite3`, auto-initialized and seeded on boot in `data/eworkers.db`) with binary image persistence (`uploaded_files`) + PostgreSQL/Supabase RLS schema blueprint in `supabase/schema.sql`
- **Static Assets**: Committed in `public/images/` and `src/assets/images/` so Vite dev and `npm run build` (`dist/images/`) serve all images reliably on GitHub/production deployments.

## Quick Start
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
NODE_ENV=production npm start
```
