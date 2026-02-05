# Mission Control Dashboard

A real-time multi-agent project management dashboard built with Next.js and Supabase.

## Features

- 📊 **Project Overview** - View all projects with status, PM assignments, and deadlines
- 🎯 **Sprint Management** - Track sprints with detailed acceptance criteria
- 📋 **Kanban Board** - Drag-and-drop task management
- 🤖 **Agent Registry** - View all PM and specialist agents
- ⚡ **Real-time Updates** - Live task status changes via Supabase subscriptions

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Real-time**: Supabase Realtime

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase project (already configured)

### Installation

1. Install dependencies:
   ```bash
   cd dashboard
   npm install
   ```

2. Configure environment (already done):
   - `.env.local` contains Supabase credentials

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main dashboard
│   │   ├── layout.tsx            # Root layout
│   │   └── projects/
│   │       └── [id]/
│   │           └── page.tsx      # Project detail + Kanban
│   └── lib/
│       └── supabase.ts           # Supabase client + helpers
├── .env.local                    # Environment variables
└── package.json
```

## Database Schema

The dashboard connects to these Supabase tables:
- `projects` - Project metadata
- `sprints` - Sprint definitions with acceptance criteria
- `tasks` - Task items with status tracking
- `agents` - PM and specialist agent registry
- `activity_log` - Audit trail

## Development

### Adding New Features

1. Update types in `src/lib/supabase.ts`
2. Add new API helpers as needed
3. Create new pages in `src/app/`

### Real-time Subscriptions

Example:
```typescript
import { subscribeToTasks } from '@/lib/supabase';

useEffect(() => {
  const sub = subscribeToTasks(projectId, (task) => {
    // Handle updated task
  });
  return () => sub.unsubscribe();
}, [projectId]);
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Environment Variables

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

**Discord Notifications (optional):**
- `DISCORD_TOKEN` - Bot token for channel-based notifications with @mentions (preferred)
- `DISCORD_WEBHOOK_URL` - Fallback webhook URL if DISCORD_TOKEN not set

**Note:** Channel-based notifications (`notify_channel` in project settings) require `DISCORD_TOKEN`. 
Webhook-based notifications work without it but don't support @mentions.

## License

Private - DiscClaude Project
