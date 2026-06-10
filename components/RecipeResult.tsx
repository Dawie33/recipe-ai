'use client';

import { useState } from 'react';
import { Recipe } from '@/types/recipe';

const DIFFICULTY_STYLES: Record<string, string> = {
  débutant: 'bg-herb-50 text-herb border-herb-100',
  intermédiaire: 'bg-amber-50 text-amber-700 border-amber-100',
  chef: 'bg-clay-50 text-clay border-clay-100',
};

const NUTRITION = [
  { key: 'calories' as const, label: 'kcal', bg: 'bg-clay-50', text: 'text-clay' },
  { key: 'proteins' as const, label: 'protéines', bg: 'bg-blue-50', text: 'text-blue-600' },
  { key: 'carbs' as const, label: 'glucides', bg: 'bg-amber-50', text: 'text-amber-600' },
  { key: 'fat' as const, label: 'lipides', bg: 'bg-purple-50', text: 'text-purple-600' },
];

function IngredientRow({ ingredient, recipeTitle }: { ingredient: string; recipeTitle: string }) {
  const [substitutes, setSubstitutes] = useState<{ name: string; note: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function fetchSubstitutes() {
    if (substitutes) { setOpen((v) => !v); return; }
    setLoading(true); setOpen(true);
    const res = await fetch('/api/substitute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredient, recipeTitle }),
    });
    const data = await res.json();
    setSubstitutes(data.substitutes ?? []);
    setLoading(false);
  }

  return (
    <li className="space-y-1.5">
      <div className="flex items-start gap-2.5 group">
        <span className="w-1.5 h-1.5 rounded-full bg-clay mt-2 shrink-0" />
        <span className="text-sm text-stone-700 flex-1 leading-relaxed">{ingredient}</span>
        <button
          onClick={fetchSubstitutes}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-xs text-stone-400 hover:text-clay border border-stone-200 hover:border-clay-100 rounded-md px-2 py-0.5 transition-all bg-white"
        >
          substitut ?
        </button>
      </div>
      {open && (
        <div className="ml-4 pl-3 border-l-2 border-clay-100 space-y-1 animate-slide-down">
          {loading
            ? <p className="text-xs text-stone-400 italic">Recherche…</p>
            : substitutes?.map((s, i) => (
                <p key={i} className="text-xs">
                  <span className="font-semibold text-clay">{s.name}</span>
                  <span className="text-stone-500"> — {s.note}</span>
                </p>
              ))}
        </div>
      )}
    </li>
  );
}

interface RecipeResultProps {
  recipe: Recipe;
  onSave: (recipe: Recipe) => void;
  saved: boolean;
}

export default function RecipeResult({ recipe, onSave, saved }: RecipeResultProps) {
  const [copied, setCopied] = useState(false);

  async function handleExportPDF() {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const ml = 15, pw = 210, cw = pw - 30;
    let y = 20;

    function checkPage(needed = 8) { if (y + needed > 280) { doc.addPage(); y = 20; } }

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(28, 25, 23);
    doc.text(recipe.title, ml, y);
    y += 8;

    // Meta
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 113, 108);
    const meta = [recipe.duration, recipe.difficulty, recipe.cuisineType, ...recipe.filters].filter(Boolean).join(' · ');
    doc.text(meta, ml, y);
    y += 4;
    doc.setDrawColor(200, 75, 49);
    doc.setLineWidth(0.5);
    doc.line(ml, y, pw - ml, y);
    y += 8;

    // Nutrition
    if (recipe.nutrition) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(28, 25, 23);
      doc.text('Valeurs nutritionnelles (par portion)', ml, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 55, 52);
      doc.text(
        `${recipe.nutrition.calories} kcal  ·  Protéines : ${recipe.nutrition.proteins}g  ·  Glucides : ${recipe.nutrition.carbs}g  ·  Lipides : ${recipe.nutrition.fat}g`,
        ml, y
      );
      y += 8;
    }

    // Ingredients
    checkPage(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(28, 25, 23);
    doc.text('Ingrédients', ml, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 55, 52);
    for (const item of recipe.ingredients) {
      checkPage(6);
      doc.setDrawColor(180, 170, 165);
      doc.circle(ml + 1.5, y - 1.5, 1, 'F');
      const lines = doc.splitTextToSize(item, cw - 6);
      doc.text(lines, ml + 6, y);
      y += lines.length * 5 + 1;
    }
    y += 4;

    // Steps
    checkPage(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(28, 25, 23);
    doc.text('Préparation', ml, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 55, 52);
    recipe.steps.forEach((step, i) => {
      checkPage(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}.`, ml, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(step, cw - 8);
      doc.text(lines, ml + 8, y);
      y += lines.length * 5 + 2;
    });

    const slug = recipe.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    doc.save(`${slug}.pdf`);
  }

  function handleShare() {
    const text = `🍳 ${recipe.title}
${recipe.duration} · ${recipe.difficulty}${recipe.cuisineType ? ` · ${recipe.cuisineType}` : ''}

📋 Ingrédients:
${recipe.ingredients.map((i) => `• ${i}`).join('\n')}

👨‍🍳 Préparation:
${recipe.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

—
Créé avec Recipe AI 🌟`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="card p-7 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          <h2 className="text-2xl font-bold text-stone-900 leading-tight tracking-tight">{recipe.title}</h2>
          <div className="flex flex-wrap gap-2">
            <span className="chip chip-idle cursor-default !text-stone-500">⏱ {recipe.duration}</span>
            <span className={`chip cursor-default border ${DIFFICULTY_STYLES[recipe.difficulty] ?? 'bg-stone-50 text-stone-500 border-stone-100'}`}>
              {recipe.difficulty}
            </span>
            {recipe.cuisineType && (
              <span className="chip cursor-default bg-blue-50 text-blue-600 border-blue-100">{recipe.cuisineType}</span>
            )}
            {recipe.filters.map((f) => (
              <span key={f} className="chip cursor-default bg-herb-50 text-herb border-herb-100">{f}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={handleExportPDF}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all"
          >
            📥 PDF
          </button>
          <button
            onClick={handleShare}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all"
          >
            {copied ? '✓ Copié !' : '📤 Partager'}
          </button>
          <button
            onClick={() => onSave(recipe)}
            disabled={saved}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
              saved
                ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                : 'bg-clay text-white border-clay hover:bg-clay-700 shadow-sm hover:shadow-md'
            }`}
          >
            {saved ? '✓ Sauvegardée' : '💾 Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Nutrition */}
      {recipe.nutrition && (
        <div className="grid grid-cols-4 gap-3 stagger">
          {NUTRITION.map(({ key, label, bg, text }) => (
            <div key={key} className={`${bg} rounded-xl p-3 text-center animate-fade-up`}>
              <p className="text-xs font-medium text-stone-400 mb-0.5">{label}</p>
              <p className={`text-base font-bold ${text}`}>
                {recipe.nutrition![key]}{key === 'calories' ? '' : 'g'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-stone-100" />

      {/* Ingredients */}
      <div>
        <p className="section-label mb-3">Ingrédients</p>
        <ul className="space-y-2">
          {recipe.ingredients.map((item, i) => (
            <IngredientRow key={i} ingredient={item} recipeTitle={recipe.title} />
          ))}
        </ul>
        <p className="text-xs text-stone-400 mt-2.5 italic">Survolez un ingrédient pour voir les substituts</p>
      </div>

      <div className="h-px bg-stone-100" />

      {/* Steps */}
      <div>
        <p className="section-label mb-3">Préparation</p>
        <ol className="space-y-4">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-3.5">
              <span className="step-circle shrink-0 mt-0.5">{i + 1}</span>
              <span className="text-sm text-stone-700 leading-relaxed pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
