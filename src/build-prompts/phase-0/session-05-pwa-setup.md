# Session 5: PWA Foundation & Project Setup

**Artifact:** `pwa/` folder with Next.js 15 project, Docker, local dev configuration

**Context needed:** Sessions 1-4 artifacts + Project structure doc + Phase 0 spec

**What to build:**
- `pwa/package.json` — Node dependencies, scripts
- `pwa/tsconfig.json` — TypeScript configuration
- `pwa/.eslintrc.json` — Linting rules
- `pwa/next.config.js` — Next.js configuration
- `pwa/tailwind.config.ts` — Tailwind CSS setup with earth tones
- `pwa/Dockerfile` — Multi-stage Docker build
- `pwa/src/` folder structure (from PWA_SRC_STRUCTURE.md)
- `pwa/.env.local.example` — Environment variables template
- `pwa/README.md` — Setup and development guide

**Success:**
- `npm install` installs all dependencies
- `npm run dev` starts dev server on localhost:3000
- `npm run build` produces optimized production build
- `docker build -t recipe-pwa .` builds Docker image successfully
- ESLint passes with `npm run lint`
- TypeScript passes with `npm run typecheck`

---

## Prompt

```
Task: Set up Phase 0 PWA project with Next.js 15

You are creating the Next.js frontend foundation for Phase 0.

Requirements:
- Framework: Next.js 15 with App Router
- Language: TypeScript
- Styling: Tailwind CSS with custom earth tone palette
- State: Zustand for client state
- Design: Feature-organized folder structure (from pwa/SRC_STRUCTURE.md)
- Environment: Docker, local dev, production config

Deliverables:

1. pwa/package.json
   - Dependencies:
     * next@15, react@19, react-dom@19
     * typescript, @types/react, @types/node
     * tailwindcss, postcss, autoprefixer
     * zustand (state management)
     * axios (API client)
     * next-intl or i18next (localization)
     * lucide-react (icons)
   - Scripts:
     * dev: next dev -p 3000
     * build: next build
     * start: next start
     * lint: next lint
     * typecheck: tsc --noEmit
     * format: prettier --write .

2. pwa/tsconfig.json
   - Target: ES2020
   - Module: esnext
   - JSX: preserve
   - baseUrl: .
   - Path aliases: @/* → src/*
   - Strict mode enabled
   - skipLibCheck: true

3. pwa/.eslintrc.json
   - Extends: next/core-web-vitals
   - Rules: enforce naming conventions (kebab-case files, PascalCase exports)

4. pwa/next.config.js
   - images.domains: [] (API domain for images, added in Phase 2)
   - compress: true
   - reactStrictMode: true
   - swcMinify: true

5. pwa/tailwind.config.ts
   - Colors (earth tones):
     * sage-green: #4B5D4D (primary)
     * terracotta: #B25E4C (accent)
     * cream: #FDF8ED (background)
     * charcoal: #2D312E (text)
   - Extend with custom spacing, typography
   - Plugins: @tailwindcss/forms (better form inputs)

6. pwa/postcss.config.js
   - Tailwind CSS plugin
   - Autoprefixer plugin

7. pwa/.eslintignore
   - .next, node_modules, dist, build, .env*

8. pwa/.prettierrc.json
   - semi: true
   - singleQuote: true
   - trailingComma: 'es5'
   - printWidth: 100

9. pwa/Dockerfile
   - Multi-stage build:
     * Stage 1 (build): Node 22 alpine, npm ci, npm run build
     * Stage 2 (runtime): Node 22 alpine, copy from build, expose 3000
   - Health check: curl http://localhost:3000/health || exit 1

10. pwa/.dockerignore
    - .next, node_modules, .git, .env*, coverage, dist

11. pwa/src/ folder structure (from pwa/SRC_STRUCTURE.md)
    - app/ (layout.tsx, page.tsx root)
    - components/ (by feature: identity, capture, hints, discovery, planner, common)
    - hooks/ (custom React hooks)
    - store/ (Zustand stores)
    - lib/ (utilities, API client, helpers)
    - locales/ (i18n files - English only for now)
    - styles/ (globals.css for Tailwind)
    - types/ (TypeScript interfaces)

12. pwa/src/app/layout.tsx
    - Configure metadata (title, description)
    - Set up globals.css with Tailwind
    - Set body class for dark/light mode (optional for Phase 0)

13. pwa/src/app/page.tsx
    - Placeholder home page
    - Navigation to /onboarding
    - Simple welcome message

14. pwa/src/styles/globals.css
    - Tailwind @import directives
    - Custom CSS variables for earth tone palette
    - Reset styles

15. pwa/.env.local.example
    - NEXT_PUBLIC_API_URL=http://localhost:5000
    - NEXT_PUBLIC_ENVIRONMENT=development

16. pwa/README.md
    - Installation: npm install
    - Development: npm run dev, open http://localhost:3000
    - Build: npm run build
    - Production: npm start
    - Docker: docker build -t recipe-pwa . && docker run -p 3000:3000 recipe-pwa
    - Troubleshooting: Clear .next cache if issues

Guidelines:
- Use TypeScript for all code (strict mode)
- Feature-organized file structure for scalability
- Earth tone colors in all UI
- No hardcoded API URLs (use .env)
- Type-safe API client setup (axios configured in lib/api.ts)
- ESLint + Prettier for code quality

Target:
- Dev server starts without errors
- Build succeeds with no warnings
- Docker image builds and runs successfully
- TypeScript compilation passes
- ESLint passes all files
```

---

## What to Expect

After this session:
- ✅ Next.js 15 project ready for feature development
- ✅ TypeScript, Tailwind, and state management configured
- ✅ Docker build pipeline working
- ✅ Folder structure in place for Sessions 6-10

## Next Steps

1. Run `npm install && npm run dev` to verify setup
2. Test build: `npm run build`
3. Commit: `git commit -m "session 5: PWA foundation and project setup"`
4. Move to Session 6
