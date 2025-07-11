# Booster Card Battle Game

A Next.js application featuring card collection, booster packs, and an online battle arena with card staking mechanics.

## Features

- **Card Collection**: Collect humanoid and weapon cards
- **Booster Packs**: Open time-gated booster packs to get new cards
- **Battle Arena**: Challenge other players in online battles
- **Card Staking**: Risk your cards in battles to win opponents' cards

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account

### Development Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser.

### Database Setup

After logging in to the application:

1. Navigate to `/admin/setup`
2. Click the "Setup Database Schema" button to create all necessary tables

Alternatively, you can run the SQL schema manually in your Supabase SQL editor.

## Deploying to Vercel

### Option 1: Deploy from GitHub

1. Push your code to a GitHub repository
2. Go to [Vercel](https://vercel.com/new)
3. Import your GitHub repository
4. Configure the following environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy!

### Option 2: Deploy Using Vercel CLI

1. Install Vercel CLI:

```bash
npm i -g vercel
```

2. Login to Vercel:

```bash
vercel login
```

3. Deploy the application:

```bash
vercel
```

4. Follow the prompts to configure your project.

### After Deployment

1. After deploying, navigate to your application URL
2. Log in to the application
3. Go to `/admin/setup` and set up the database schema
4. You're all set!

## Key Technologies

- Next.js 15.x
- Supabase (Auth, Database, Real-time)
- TailwindCSS
- Framer Motion for animations
