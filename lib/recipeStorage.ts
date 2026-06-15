import { Recipe } from '@/types/recipe';

const STORAGE_KEY = 'recipe-ai-saved';
const RECENT_TITLES_KEY = 'recipe-ai-recent-titles';
const MAX_RECENT = 30;

export function getRecentTitles(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_TITLES_KEY) ?? '[]') as string[];
  } catch { return []; }
}

export function addRecentTitles(titles: string[]): void {
  const recent = getRecentTitles();
  const updated = [...titles, ...recent.filter(t => !titles.includes(t))].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_TITLES_KEY, JSON.stringify(updated));
}

function load(): Recipe[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Recipe[];
  } catch {
    return [];
  }
}

function persist(recipes: Recipe[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

export async function getSavedRecipes(): Promise<Recipe[]> {
  return load();
}

export async function saveRecipe(recipe: Recipe): Promise<void> {
  const recipes = load();
  if (!recipes.find((r) => r.id === recipe.id)) {
    persist([recipe, ...recipes]);
  }
}

export async function updateRecipe(
  id: string,
  updates: Partial<Pick<Recipe, 'rating' | 'comment'>>
): Promise<void> {
  persist(load().map((r) => (r.id === id ? { ...r, ...updates } : r)));
}

export async function deleteRecipe(id: string): Promise<void> {
  persist(load().filter((r) => r.id !== id));
}
