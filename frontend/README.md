# MadFlix Frontend

A modern, dark, fully responsive React UI for the MadFlix TMDB-powered API.

## Features
- Home highlights for trending and top-rated titles
- Dedicated Movies and Shows hubs with filters, genre pickers, and paging
- Full-page details with streaming player, cast, and recommended titles
- Season and episode navigation for shows
- Global multi-search

## Getting Started
1. Start the Django API at `http://127.0.0.1:8000/`.
2. Install dependencies:

```bash
cd frontend
npm install
```

3. Run the dev server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173/`.

## Environment
Optional: override the API base URL.

```bash
VITE_API_BASE=http://127.0.0.1:8000/api
```

## Build

```bash
npm run build
```
