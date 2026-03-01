# AI Appointment Setter

AI-powered Instagram DM appointment setter for eCommerce coaching. Automates lead qualification through 7 conversation phases (P1-P7) and books appointments via GHL calendar.

## Architecture

- **Frontend (Vercel):** Next.js 14 dashboard — leads, conversations, training, analytics
- **Backend (Railway):** Express.js API — Claude AI agent, ManyChat webhook, GHL booking
- **Database:** Supabase PostgreSQL with RLS + Realtime

## Quick Start

```bash
# Frontend
npm install
npm run dev

# Backend
cd server && npm install
npx tsx index.ts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Express.js, Node.js 20 (Railway) |
| AI | Anthropic Claude with prompt caching |
| Database | Supabase (PostgreSQL + Realtime) |
| Integrations | ManyChat (Instagram DMs), GHL (Calendar) |

## Project Structure

```
├── src/          # Shared code (services, lib, types, components)
├── server/       # Express backend (Railway)
├── docs/         # Documentation
├── sql/          # Database migrations
└── scripts/      # Utility scripts
```

## Documentation

- [Database Setup](docs/setup/DATABASE_SETUP.md)
- [Deployment Guide](docs/setup/DEPLOYMENT.md)
- [Training Setup](docs/setup/TRAINING_SETUP.md)
- [API Guide](docs/architecture/FULL_API_IMPLEMENTATION_GUIDE.md)

## Live URLs

- **Dashboard:** https://aisetter.iterio.ro
- **API:** https://ai-setter-api-production.up.railway.app
