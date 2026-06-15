'use client';

import { useState } from 'react';
import { MealPlan, Recipe } from '@/types/recipe';
import { saveRecipe } from '@/lib/recipeStorage';
import WeeklyPlanner from '@/components/WeeklyPlanner';

const DIFFICULTY_STYLES: Record<string, string> = {
  débutant: 'bg-herb-50 text-herb',
  intermédiaire: 'bg-amber-50 text-amber-700',
  chef: 'bg-clay-50 text-clay',
};

const CATEGORY_ICONS: Record<string, string> = {
  'Viandes & Poissons': '🥩',
  'Légumes & Fruits': '🥦',
  'Produits laitiers': '🧀',
  'Épicerie & Condiments': '🫙',
  'Féculents & Céréales': '🌾',
  Surgelés: '❄️',
  Autres: '🛒',
};

interface ShoppingListResultProps {
  plan: MealPlan;
  onRegenerate?: (keptRecipes: MealPlan['recipes'], totalMeals: number) => void;
  regenerating?: boolean;
}

export default function ShoppingListResult({ plan, onRegenerate, regenerating }: ShoppingListResultProps) {
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [recipesSaved, setRecipesSaved] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [deletedIndexes, setDeletedIndexes] = useState<Set<number>>(new Set());

  function deleteRecipe(i: number) {
    setDeletedIndexes(prev => new Set([...prev, i]));
    if (expandedRecipe === i) setExpandedRecipe(null);
  }

  function handleRegenerate() {
    const keptRecipes = plan.recipes.filter((_, i) => !deletedIndexes.has(i));
    onRegenerate?.(keptRecipes, plan.numberOfMeals);
  }

  function toggleCheck(key: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleExport() {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const ml = 15, pw = 210, cw = pw - 30;
    let y = 20;

    function checkPage(needed = 8) { if (y + needed > 280) { doc.addPage(); y = 20; } }
    function sectionTitle(title: string) {
      checkPage(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(28, 25, 23);
      doc.text(title, ml, y);
      y += 5;
      doc.setDrawColor(200, 75, 49);
      doc.setLineWidth(0.4);
      doc.line(ml, y, pw - ml, y);
      y += 7;
    }

    // ── Cover header ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(28, 25, 23);
    doc.text('Plan de repas', ml, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 113, 108);
    doc.text(
      `${plan.numberOfMeals} repas · ${plan.numberOfPeople} personne${plan.numberOfPeople > 1 ? 's' : ''}${plan.filters.length ? ' · ' + plan.filters.join(', ') : ''}`,
      ml, y
    );
    y += 4;
    doc.setDrawColor(200, 75, 49);
    doc.setLineWidth(0.6);
    doc.line(ml, y, pw - ml, y);
    y += 10;

    // ── Shopping list ──
    sectionTitle('Liste de courses');
    for (const cat of plan.shoppingList) {
      checkPage(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(28, 25, 23);
      doc.text(cat.category, ml, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 55, 52);
      for (const item of cat.items) {
        checkPage(6);
        doc.setDrawColor(180, 170, 165);
        doc.setFillColor(255, 255, 255);
        doc.rect(ml, y - 3.2, 3.2, 3.2);
        const lines = doc.splitTextToSize(item, cw - 8);
        doc.text(lines, ml + 6, y);
        y += lines.length * 5 + 1;
      }
      y += 4;
    }

    // ── Recipes ──
    doc.addPage();
    y = 20;
    sectionTitle('Recettes');

    plan.recipes.forEach((recipe, i) => {
      checkPage(20);

      // Recipe title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(200, 75, 49);
      doc.text(`${i + 1}. ${recipe.title}`, ml, y);
      y += 5;

      // Meta
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(120, 113, 108);
      const meta = [recipe.duration, recipe.difficulty].filter(Boolean).join(' · ');
      doc.text(meta, ml, y);
      y += 5;

      // Nutrition
      if (recipe.nutrition) {
        doc.setTextColor(100, 95, 90);
        doc.text(
          `${recipe.nutrition.calories} kcal · Prot. ${recipe.nutrition.proteins}g · Gluc. ${recipe.nutrition.carbs}g · Lip. ${recipe.nutrition.fat}g`,
          ml, y
        );
        y += 5;
      }

      // Ingredients
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(28, 25, 23);
      doc.text('Ingrédients', ml, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 55, 52);
      for (const item of recipe.ingredients) {
        checkPage(5);
        doc.setFillColor(120, 113, 108);
        doc.circle(ml + 1.2, y - 1.2, 0.8, 'F');
        const lines = doc.splitTextToSize(item, cw - 6);
        doc.text(lines, ml + 5, y);
        y += lines.length * 4.5 + 0.5;
      }
      y += 3;

      // Steps
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(28, 25, 23);
      doc.text('Préparation', ml, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 55, 52);
      recipe.steps.forEach((step, si) => {
        checkPage(7);
        doc.setFont('helvetica', 'bold');
        doc.text(`${si + 1}.`, ml, y);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(step, cw - 8);
        doc.text(lines, ml + 7, y);
        y += lines.length * 4.5 + 1;
      });

      y += 6;
      // Separator between recipes (except last)
      if (i < plan.recipes.length - 1) {
        checkPage(4);
        doc.setDrawColor(220, 215, 210);
        doc.setLineWidth(0.3);
        doc.line(ml, y - 3, pw - ml, y - 3);
      }
    });

    doc.save(`plan-repas-${plan.numberOfMeals}-repas.pdf`);
  }

  function handleSaveRecipes() {
    const now = new Date().toISOString();
    plan.recipes.forEach((recipe) => {
      saveRecipe({ ...recipe, id: crypto.randomUUID(), filters: plan.filters, createdAt: now } as Recipe);
    });
    setRecipesSaved(true);
    setConfirmSave(false);
  }

  const totalItems = plan.shoppingList.reduce((acc, cat) => acc + cat.items.length, 0);
  const checkedCount = checkedItems.size;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="section-label mb-1">Plan généré</p>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
              {plan.numberOfMeals} repas pour {plan.numberOfPeople} personne{plan.numberOfPeople > 1 ? 's' : ''}
            </h2>
            {(plan.filters.length > 0 || plan.cuisineType) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {plan.cuisineType && <span className="chip !text-xs bg-blue-50 text-blue-600 cursor-default">{plan.cuisineType}</span>}
                {plan.filters.map((f) => <span key={f} className="chip !text-xs bg-herb-50 text-herb cursor-default">{f}</span>)}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {deletedIndexes.size > 0 && (
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="chip chip-coral !px-4 !py-2 !rounded-xl disabled:opacity-60"
              >
                {regenerating ? '⏳ Génération…' : `🔄 Régénérer (${deletedIndexes.size} recette${deletedIndexes.size > 1 ? 's' : ''} supprimée${deletedIndexes.size > 1 ? 's' : ''})`}
              </button>
            )}
            <button onClick={handleExport} className="chip chip-idle !px-4 !py-2 !rounded-xl">
              📥 Exporter (PDF)
            </button>
            {!recipesSaved && !confirmSave && (
              <button onClick={() => setConfirmSave(true)} className="chip chip-active-clay !px-4 !py-2 !rounded-xl">
                💾 Sauvegarder les recettes
              </button>
            )}
            {confirmSave && (
              <div className="flex items-center gap-2 bg-clay-50 border border-clay-100 rounded-xl px-4 py-2">
                <span className="text-sm text-stone-700">Sauvegarder les {plan.recipes.length} recettes ?</span>
                <button onClick={handleSaveRecipes} className="text-sm font-bold text-herb hover:text-herb/80">Oui</button>
                <span className="text-stone-300">·</span>
                <button onClick={() => setConfirmSave(false)} className="text-sm text-stone-400 hover:text-stone-600">Non</button>
              </div>
            )}
            {recipesSaved && (
              <span className="chip bg-herb-50 text-herb cursor-default !px-4 !py-2 !rounded-xl">
                ✓ {plan.recipes.length} recettes sauvegardées
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Shopping list */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-900 flex items-center gap-2">
            <span>🛒</span> Liste de courses
          </h3>
          <span className="text-sm text-stone-400">{checkedCount}/{totalItems} cochés</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-herb rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {plan.shoppingList.map((cat) => (
            <div key={cat.category} className="space-y-2">
              <p className="section-label flex items-center gap-1.5">
                <span>{CATEGORY_ICONS[cat.category] ?? '🛒'}</span>
                {cat.category}
              </p>
              <ul className="space-y-2">
                {cat.items.map((item) => {
                  const key = `${cat.category}-${item}`;
                  const checked = checkedItems.has(key);
                  return (
                    <li
                      key={key}
                      onClick={() => toggleCheck(key)}
                      className="flex items-start gap-2.5 cursor-pointer group"
                    >
                      <span className={`shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        checked ? 'bg-herb border-herb text-white' : 'border-stone-300 group-hover:border-herb'
                      }`}>
                        {checked && (
                          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      <span className={`text-sm transition-colors leading-relaxed ${checked ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                        {item}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly planner */}
      <WeeklyPlanner plan={plan} />

      {/* Recipes */}
      <div className="space-y-3">
        <p className="section-label px-1">Les recettes</p>
        {plan.recipes.map((recipe, i) => {
          if (deletedIndexes.has(i)) return null;
          return (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                onClick={() => setExpandedRecipe(expandedRecipe === i ? null : i)}
              >
                <span className="w-7 h-7 rounded-full bg-clay-50 text-clay text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <h4 className="font-semibold text-stone-900 truncate">{recipe.title}</h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => deleteRecipe(i)}
                  title="Supprimer cette recette"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-stone-300 hover:text-coral hover:bg-coral/10 transition-all text-lg leading-none"
                >
                  ×
                </button>
                <span
                  className="text-stone-400 text-sm cursor-pointer"
                  onClick={() => setExpandedRecipe(expandedRecipe === i ? null : i)}
                >{expandedRecipe === i ? '▲' : '▼'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="chip chip-idle cursor-default !text-xs !py-0.5">⏱ {recipe.duration}</span>
              <span className={`chip cursor-default !text-xs !py-0.5 ${DIFFICULTY_STYLES[recipe.difficulty] ?? 'bg-stone-50 text-stone-500'}`}>
                {recipe.difficulty}
              </span>
            </div>

            {recipe.nutrition && (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { l: 'kcal', v: String(recipe.nutrition.calories), bg: 'bg-clay-50', t: 'text-clay' },
                  { l: 'prot.', v: `${recipe.nutrition.proteins}g`, bg: 'bg-blue-50', t: 'text-blue-600' },
                  { l: 'gluc.', v: `${recipe.nutrition.carbs}g`, bg: 'bg-amber-50', t: 'text-amber-600' },
                  { l: 'lip.', v: `${recipe.nutrition.fat}g`, bg: 'bg-purple-50', t: 'text-purple-600' },
                ].map(({ l, v, bg, t }) => (
                  <div key={l} className={`${bg} rounded-lg p-2 text-center`}>
                    <p className="text-xs text-stone-400">{l}</p>
                    <p className={`text-xs font-bold ${t}`}>{v}</p>
                  </div>
                ))}
              </div>
            )}

            {expandedRecipe === i && (
              <div className="pt-3 border-t border-stone-100 space-y-4 animate-slide-down">
                <div>
                  <p className="section-label mb-1.5">Ingrédients</p>
                  <ul className="space-y-1">
                    {recipe.ingredients.map((item, j) => (
                      <li key={j} className="flex gap-2 text-sm text-stone-600">
                        <span className="w-1 h-1 rounded-full bg-clay mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="section-label mb-1.5">Préparation</p>
                  <ol className="space-y-2">
                    {recipe.steps.map((step, j) => (
                      <li key={j} className="flex gap-3 text-sm text-stone-700">
                        <span className="step-circle shrink-0 mt-0.5">{j + 1}</span>
                        <span className="leading-relaxed pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        );})}
      </div>
    </div>
  );
}
