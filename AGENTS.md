<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md - Recipe AI Development Guidelines

## Project Overview

- **Tech Stack**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase, OpenAI
- **Language**: French (UI and error messages in French)
- **Strict Mode**: Enabled in TypeScript

## Build Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start
```

**No test framework is currently configured.** If adding tests, use Vitest or Jest with React Testing Library.

## Code Style Guidelines

### Imports & Path Aliases
- Use `@/*` alias for project root imports (e.g., `@/components/RecipeForm`)
- Order imports: external libs → internal modules → local components
- Use named exports for components and utilities

```typescript
// Good
import { useState } from 'react';
import { Recipe } from '@/types/recipe';
import RecipeForm from '@/components/RecipeForm';

// Bad
import RecipeForm from './RecipeForm';
```

### Component Structure
- Client components MUST have `'use client'` at the top
- Use function declarations for page components, named exports for others
- Props interfaces should be defined in the same file or in types/

```typescript
// Client component
'use client';

import { useState } from 'react';

interface Props {
  onGenerate: (params: GenerateParams) => void;
}

export default function RecipeForm({ onGenerate }: Props) {
  // ...
}
```

### Naming Conventions
- **Files**: kebab-case for utilities (`recipeStorage.ts`), PascalCase for components (`RecipeForm.tsx`)
- **Types/Interfaces**: PascalCase (`DietaryFilter`, `Recipe`)
- **Enums/Constants**: UPPER_SNAKE_CASE in French (`véritann`, `vegan`)
- **Variables**: camelCase

### TypeScript Guidelines
- Use explicit types for function parameters and return types
- Use `interface` for object shapes, `type` for unions/aliases
- Never use `any`

```typescript
// Good
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body: { ingredients: string[] } = await request.json();
  return NextResponse.json({ success: true });
}
```

### Error Handling
- Return appropriate HTTP status codes (400 for bad input, 500 for server errors)
- Use French error messages

```typescript
if (!ingredients || ingredients.length === 0) {
  return NextResponse.json({ error: 'Aucun ingrédient fourni' }, { status: 400 });
}
```

### API Routes
- Use Next.js App Router: `app/api/[feature]/route.ts`
- Export named handlers: `GET`, `POST`, `PUT`, `DELETE`
- Use `NextRequest` and `NextResponse` from `next/server`

### Tailwind CSS
- Uses Tailwind v4 (CSS-first configuration in globals.css)
- Custom theme colors defined in CSS variables
- Use utility classes for responsive design

### Database & Storage
- Supabase for auth/database (configured but may need env vars)
- Local storage for recipe persistence via `@/lib/recipeStorage`

## Project Structure

```
app/
├── api/
│   ├── generate/route.ts      # Recipe generation endpoint
│   ├── recipes/route.ts      # Saved recipes CRUD
│   ├── shopping-list/route.ts # Meal planning
│   └── substitute/route.ts   # Ingredient substitution
├── saved/page.tsx            # Saved recipes view
├── layout.tsx                # Root layout
├── page.tsx                  # Home page
└── globals.css               # Tailwind + custom styles

components/
├── RecipeForm.tsx            # Main input form
├── RecipeResult.tsx         # Recipe display
├── ShoppingListResult.tsx   # Meal plan display
├── SavedRecipesList.tsx     # Saved recipes list
├── WeeklyPlanner.tsx       # Weekly meal planner
├── SkeletonLoaders.tsx      # Loading states
└── PWAProvider.tsx          # PWA configuration

types/
└── recipe.ts                # TypeScript definitions

lib/
└── recipeStorage.ts         # Local storage utilities
```

## Environment Variables

Create a `.env.local` file with:

```env
# Supabase (optional - app works without for local storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# OpenAI (required for recipe generation)
OPENAI_API_KEY=sk-...
```

## Common Patterns

### Fetching Data in Client Components
```typescript
async function handleGenerate(params: GenerateParams) {
  setLoading(true);
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? 'Une erreur est survenue');
    return;
  }
  const data = await res.json();
  setResult(data);
}
```

### Saving Recipes
```typescript
import { saveRecipe } from '@/lib/recipeStorage';
await saveRecipe(recipe);
```

## Development Notes

1. **French-first UI**: All user-facing text is in French
2. **No tests exist**: Consider adding Vitest + React Testing Library for future tests
3. **No linting**: Add ESLint + Prettier if desired
4. **PWA**: App includes PWA support via `PWAProvider.tsx`
