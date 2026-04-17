# What's for Supper — PWA

Next.js 15 progressive web app for the What's for Supper meal planning system.

## Tech stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS with earth tone palette
- **State**: Zustand
- **API client**: Axios
- **Icons**: Lucide React
- **i18n**: next-intl (English + French)

## Getting started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment

Copy the example env file and adjust as needed:

```bash
cp .env.local.example .env.local
```

| Variable                  | Default                 | Description          |
| ------------------------- | ----------------------- | -------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5000` | Frontend API base URL |
| `API_INTERNAL_URL`        | `http://api:5000`       | Internal Backend URL  |
| `NEXT_PUBLIC_ENVIRONMENT`   | `development`           | Runtime environment   |

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

### Type check

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

## Docker

Build and run the production image:

```bash
docker build -t recipe-pwa .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_BASE_URL=http://api:5000 recipe-pwa
```

The image exposes port 3000 and includes a health check at `/health`.

## Project structure

```
pwa/
├── src/
│   ├── app/          # Next.js App Router pages and layouts
│   ├── components/   # Feature-organized UI components
│   ├── hooks/        # Custom React hooks
│   ├── store/        # Zustand stores
│   ├── lib/          # API client, utilities, constants
│   ├── locales/      # i18n translation files (en, fr)
│   ├── types/        # TypeScript types
│   └── proxy.ts      # Route proxy (identity redirect)
└── public/           # Static assets and PWA manifest
```

See [SRC_STRUCTURE.md](./SRC_STRUCTURE.md) for the full folder reference.

## Troubleshooting

**Dev server won't start / stale cache**

```bash
rm -rf .next && npm run dev
```

**Type errors after pulling**

```bash
npm install && npm run typecheck
```
