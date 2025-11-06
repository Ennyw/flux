# Setup Guide

Complete setup instructions for Flux streaming platform.

## Prerequisites

- Node.js 18+ and npm
- A free TMDB API key ([get one here](https://www.themoviedb.org/settings/api))

## Installation

```bash
# Clone the repository
git clone https://github.com/Ennyw/flux.git
cd flux

# Install dependencies (auto-creates .env file)
npm install
```

## API Keys Setup

### Required: TMDB API Key

1. Go to https://www.themoviedb.org/settings/api
2. Create an account (free)
3. Request an API key
4. Copy your API key
5. Open `.env` file (created automatically)
6. Replace `your_tmdb_api_key_here` with your actual key:

```env
VITE_TMDB_API_KEY=your_actual_key_here
```

### Optional: Sports Features

If you want sports streaming features:

1. Get a free key from https://www.thesportsdb.com/api.php
2. Add to `.env`:
```env
VITE_SPORTSDB_API_KEY=your_sportsdb_key_here
```

**Note:** The free API key has rate limits (30 requests/minute). For production, consider upgrading to a premium key.

## Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build for Production

```bash
npm run build
npm run preview
```

## Troubleshooting

**API Key Warning Banner:**
- Make sure `.env` file exists
- Check that `VITE_TMDB_API_KEY` is set correctly
- Restart the dev server after changing `.env`

**CORS Errors:**
- These are normal for TheSportsDB API (uses proxy automatically)
- TMDB API doesn't have CORS issues

**Port Already in Use:**
- Change port in `vite.config.ts` or use `npm run dev -- --port 3001`

