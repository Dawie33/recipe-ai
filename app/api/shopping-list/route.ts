import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { DietaryFilter, CuisineType, Difficulty, MaxDuration, Season } from '@/types/recipe';

const client = new OpenAI();

export async function POST(request: NextRequest) {
  const {
    numberOfMeals,
    numberOfPeople,
    filters,
    cuisineTypes,
    platTypes,
    difficulty,
    maxDuration,
    season,
    existingRecipes,
    recentTitles,
  }: {
    numberOfMeals: number;
    numberOfPeople: number;
    filters: DietaryFilter[];
    cuisineTypes?: CuisineType[];
    platTypes?: string[];
    difficulty?: Difficulty;
    maxDuration?: MaxDuration;
    season?: Season;
    existingRecipes?: { title: string; ingredients: string[] }[];
    recentTitles?: string[];
  } = await request.json();

  const constraints: string[] = [];
  if (season) constraints.push(`Saison : ${season} — privilégie les produits de saison correspondants pour tous les repas`);
  if (filters.length > 0) constraints.push(`Contraintes alimentaires : ${filters.join(', ')}`);
  if (platTypes && platTypes.length > 0) constraints.push(`Type(s) de plat : ${platTypes.join(' ou ')}`);
  if (cuisineTypes && cuisineTypes.length > 0) constraints.push(`Type(s) de cuisine : ${cuisineTypes.join(' ou ')}`);
  if (difficulty) constraints.push(`Niveau de difficulté : ${difficulty}`);
  if (maxDuration) constraints.push(`Temps de préparation maximum par repas : ${maxDuration}`);
  if (recentTitles && recentTitles.length > 0) constraints.push(`Recettes déjà proposées récemment à NE PAS reproduire : ${recentTitles.slice(0, 20).join(', ')}`);

  const constraintsText = constraints.length > 0 ? constraints.join('. ') + '.' : '';

  const existingTitles = existingRecipes && existingRecipes.length > 0
    ? `\nCes repas sont déjà planifiés, ne les duplique pas : ${existingRecipes.map(r => r.title).join(', ')}.`
    : '';

  const existingIngredients = existingRecipes && existingRecipes.length > 0
    ? `\nInclus aussi dans la liste de courses les ingrédients de ces recettes existantes (pour ${numberOfPeople} personne(s)) : ${existingRecipes.flatMap(r => r.ingredients).join(', ')}.`
    : '';

  const prompt = `Tu es un chef cuisinier expert et nutritionniste. Planifie ${numberOfMeals} repas différents et variés pour ${numberOfPeople} personne(s).
${constraintsText}${existingTitles}

Règles importantes pour l'équilibre du plan :
- Au moins la moitié des repas doivent inclure une source de protéine principale (viande, poisson, volaille, œufs, légumineuses).
- Chaque plat doit être complet et rassasiant : si c'est une viande ou un poisson, inclus un accompagnement (féculent, légumes cuisinés, sauce…).
- Maximum 1 salade ou plat froid sur l'ensemble du plan.
- Varie les féculents (pâtes, riz, pommes de terre, légumineuses) et les modes de cuisson.

Pour chaque recette, inclus une estimation des valeurs nutritionnelles par portion.
Consolide tous les ingrédients en une liste de courses regroupée par catégorie, quantités adaptées pour ${numberOfPeople} personne(s).${existingIngredients}

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans bloc de code) dans ce format exact :
{
  "recipes": [
    {
      "title": "Nom de la recette",
      "ingredients": ["ingrédient 1 avec quantité pour ${numberOfPeople} personne(s)", "ingrédient 2"],
      "steps": ["Étape 1", "Étape 2"],
      "duration": "30 minutes",
      "difficulty": "débutant",
      "nutrition": { "calories": 450, "proteins": 32, "carbs": 48, "fat": 14 }
    }
  ],
  "shoppingList": [
    { "category": "Viandes & Poissons", "items": ["200g de poulet"] },
    { "category": "Légumes & Fruits", "items": ["3 tomates", "1 oignon"] }
  ]
}

Difficulté : "débutant", "intermédiaire" ou "chef".
Catégories possibles : Viandes & Poissons, Légumes & Fruits, Produits laitiers, Épicerie & Condiments, Féculents & Céréales, Surgelés, Autres.
Consolide les ingrédients communs entre les recettes.`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 1.1,
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    return NextResponse.json({ error: 'Réponse inattendue du modèle' }, { status: 500 });
  }

  return NextResponse.json(JSON.parse(content));
}
