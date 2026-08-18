import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  serverTimestamp,
  arrayUnion,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { synchronizeDualBasket } from '@/lib/dualBasket/sync';
import { SYSTEM_CATEGORIES, type AIRecipe } from '@/types';

// ---------------------------------------------------------------------------
// Alimentos y modelos de Air Fryer (catálogo compartido, colecciones raíz)
// ---------------------------------------------------------------------------

export async function listAirFryerModels() {
  const snap = await getDocs(collection(db, 'airFryerModels'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
}

export async function listFoods(filters: { q?: string; category?: string; frozenOnly?: boolean; freshOnly?: boolean } = {}) {
  const snap = await getDocs(collection(db, 'foods'));
  let foods = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
  if (filters.q) foods = foods.filter((f) => f.name.toLowerCase().includes(filters.q!.toLowerCase()));
  if (filters.category) foods = foods.filter((f) => f.category === filters.category);
  if (filters.frozenOnly) foods = foods.filter((f) => f.canCookFrozen);
  if (filters.freshOnly) foods = foods.filter((f) => !f.canCookFrozen);
  return foods.sort((a, b) => a.name.localeCompare(b.name));
}

/** Perfiles de referencia para el validador de recetas de IA. */
export async function getReferenceFoodProfiles() {
  const foods = await listFoods();
  return foods
    .filter((f) => f.cookingProfile)
    .map((f) => ({
      name: f.name,
      category: f.category,
      tempC: f.cookingProfile.tempC,
      minTimeMin: f.cookingProfile.minTimeMin,
      maxTimeMin: f.cookingProfile.maxTimeMin,
      isRawProtein: f.isRawProtein,
      safeInternalTempC: f.safeInternalTempC ?? undefined
    }));
}

// ---------------------------------------------------------------------------
// Usuario y preferencias — documento único users/{uid}
// ---------------------------------------------------------------------------

const DEFAULT_PREFERENCE = {
  defaultServings: 4,
  maxCookTimeMinutes: null as number | null,
  difficultyLevel: 'MEDIA',
  excludedIngredients: [] as string[],
  allergies: [] as string[],
  dietaryPreferences: [] as string[]
};

export async function ensureUserDoc(uid: string, name: string) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      name,
      airFryerModelId: null,
      preference: DEFAULT_PREFERENCE,
      categories: [...SYSTEM_CATEGORIES],
      createdAt: serverTimestamp()
    });
  }
}

export async function getUserDoc(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as any) : null;
}

export async function updatePreferences(uid: string, patch: Record<string, unknown>) {
  const ref = doc(db, 'users', uid);
  const current = await getUserDoc(uid);
  await updateDoc(ref, { preference: { ...(current?.preference ?? DEFAULT_PREFERENCE), ...patch } });
}

export async function setAirFryerModel(uid: string, airFryerModelId: string) {
  await updateDoc(doc(db, 'users', uid), { airFryerModelId });
}

export async function addCategory(uid: string, name: string) {
  await updateDoc(doc(db, 'users', uid), { categories: arrayUnion(name) });
}

// ---------------------------------------------------------------------------
// Despensa — users/{uid}/pantry/{itemId}
// ---------------------------------------------------------------------------

export async function listPantry(uid: string) {
  const snap = await getDocs(collection(db, 'users', uid, 'pantry'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
}

export async function upsertPantryItem(uid: string, name: string, category: string, status = 'DISPONIBLE') {
  const id = slugify(name);
  await setDoc(doc(db, 'users', uid, 'pantry', id), { name, category, status, updatedAt: serverTimestamp() });
  return id;
}

export async function updatePantryStatus(uid: string, id: string, status: string) {
  await updateDoc(doc(db, 'users', uid, 'pantry', id), { status, updatedAt: serverTimestamp() });
}

export async function deletePantryItem(uid: string, id: string) {
  await deleteDoc(doc(db, 'users', uid, 'pantry', id));
}

// ---------------------------------------------------------------------------
// Recetas — colección raíz `recipes` (compartible/reutilizable) +
// `users/{uid}/userRecipes/{recipeId}` (recetario personal, denormalizado
// para que listar el recetario sea una sola lectura de colección)
// ---------------------------------------------------------------------------

export async function getRecipe(recipeId: string) {
  const snap = await getDoc(doc(db, 'recipes', recipeId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function persistGeneratedRecipe(
  recipe: AIRecipe,
  opts: { uid: string; airFryerModelId: string | null; saveToRecetario?: boolean }
) {
  let zones: any[] = [];
  if (recipe.is_dual_zone && recipe.dual_zone_plan && recipe.dual_zone_plan.length === 2) {
    const plan = synchronizeDualBasket(
      recipe.dual_zone_plan.map((z) => ({ zone: z.zone, foodLabel: z.food_label, tempC: z.temp_c, timeMin: z.time_min }))
    );
    zones = plan.zones.map((z, idx) => ({
      zone: z.zone,
      foodLabel: z.foodLabel,
      tempC: z.tempC,
      timeMin: z.timeMin,
      startOffsetMin: z.startOffsetMin,
      order: idx
    }));
  }

  const recipeDoc = {
    name: recipe.name,
    description: recipe.description,
    servingsBase: recipe.servings_base,
    difficulty: recipe.difficulty,
    totalTimeMin: recipe.total_time_min,
    airFryerTimeMin: recipe.air_fryer_time_min,
    cuisineType: recipe.cuisine_type ?? null,
    source: 'AI_GENERATED',
    isDualZone: recipe.is_dual_zone,
    safetyNotes: recipe.safety_notes ?? null,
    airFryerModelId: opts.airFryerModelId,
    createdByUserId: opts.uid,
    createdAt: serverTimestamp(),
    ingredients: recipe.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, group: i.group })),
    steps: recipe.steps.map((s) => ({
      stepNumber: s.step_number,
      instruction: s.instruction,
      tempC: s.temp_c ?? null,
      timeMin: s.time_min ?? null,
      zone: s.zone,
      requiresShaking: s.requires_shaking,
      requiresFlipping: s.requires_flipping
    })),
    zones
  };

  const ref = await addDoc(collection(db, 'recipes'), recipeDoc);

  if (opts.saveToRecetario !== false) {
    await saveToRecetario(opts.uid, ref.id, recipeDoc);
  }

  return { id: ref.id, ...recipeDoc };
}

async function saveToRecetario(uid: string, recipeId: string, recipeSummary: any) {
  await setDoc(
    doc(db, 'users', uid, 'userRecipes', recipeId),
    {
      recipeId,
      isFavorite: false,
      personalServings: null,
      categories: [] as string[],
      ratings: [] as any[],
      notes: [] as any[],
      savedAt: serverTimestamp(),
      summary: {
        name: recipeSummary.name,
        description: recipeSummary.description,
        difficulty: recipeSummary.difficulty,
        totalTimeMin: recipeSummary.totalTimeMin,
        airFryerTimeMin: recipeSummary.airFryerTimeMin,
        servingsBase: recipeSummary.servingsBase,
        isDualZone: recipeSummary.isDualZone
      }
    },
    { merge: true }
  );
}

export async function listUserRecipes(
  uid: string,
  filters: { favoritesOnly?: boolean; category?: string; q?: string } = {}
) {
  const snap = await getDocs(collection(db, 'users', uid, 'userRecipes'));
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
  if (filters.favoritesOnly) rows = rows.filter((r) => r.isFavorite);
  if (filters.category) rows = rows.filter((r) => (r.categories ?? []).includes(filters.category));
  if (filters.q) rows = rows.filter((r) => r.summary?.name?.toLowerCase().includes(filters.q!.toLowerCase()));
  return rows.sort((a, b) => (b.savedAt?.seconds ?? 0) - (a.savedAt?.seconds ?? 0));
}

export async function getUserRecipeMeta(uid: string, recipeId: string): Promise<any> {
  const snap = await getDoc(doc(db, 'users', uid, 'userRecipes', recipeId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function ensureUserRecipe(uid: string, recipeId: string) {
  const existing = await getUserRecipeMeta(uid, recipeId);
  if (existing) return existing;
  const recipe = await getRecipe(recipeId);
  await saveToRecetario(uid, recipeId, recipe ?? {});
  return getUserRecipeMeta(uid, recipeId);
}

export async function toggleFavorite(uid: string, recipeId: string) {
  const meta = await ensureUserRecipe(uid, recipeId);
  const next = !meta?.isFavorite;
  const categories = new Set(meta?.categories ?? []);
  if (next) categories.add('Favoritas');
  await updateDoc(doc(db, 'users', uid, 'userRecipes', recipeId), {
    isFavorite: next,
    categories: Array.from(categories)
  });
  return next;
}

export async function setRating(uid: string, recipeId: string, rating: string) {
  await ensureUserRecipe(uid, recipeId);
  await updateDoc(doc(db, 'users', uid, 'userRecipes', recipeId), {
    ratings: arrayUnion({ rating, createdAt: new Date().toISOString() })
  });
}

export async function addNote(
  uid: string,
  recipeId: string,
  note: string,
  adjustmentType?: string,
  adjustmentValue?: string
) {
  await ensureUserRecipe(uid, recipeId);
  await updateDoc(doc(db, 'users', uid, 'userRecipes', recipeId), {
    notes: arrayUnion({
      note,
      adjustmentType: adjustmentType ?? null,
      adjustmentValue: adjustmentValue ?? null,
      createdAt: new Date().toISOString()
    })
  });

  if (adjustmentType && adjustmentValue) {
    const recipe = await getRecipe(recipeId);
    await addDoc(collection(db, 'users', uid, 'derivedPreferences'), {
      subject: `${(recipe as any)?.name ?? 'receta'} · ${adjustmentType}`,
      insight: `El usuario suele ajustar "${(recipe as any)?.name}" — ${adjustmentType.toLowerCase()}: ${adjustmentValue}`,
      confidence: 0.5,
      createdAt: serverTimestamp()
    });
  }
}

export async function toggleCategory(uid: string, recipeId: string, category: string, add: boolean) {
  await ensureUserRecipe(uid, recipeId);
  await addCategory(uid, category);
  const meta = await getUserRecipeMeta(uid, recipeId);
  const categories = new Set(meta?.categories ?? []);
  add ? categories.add(category) : categories.delete(category);
  await updateDoc(doc(db, 'users', uid, 'userRecipes', recipeId), { categories: Array.from(categories) });
}

export async function listDerivedPreferences(uid: string) {
  const snap = await getDocs(query(collection(db, 'users', uid, 'derivedPreferences'), fsLimit(10)));
  return snap.docs.map((d) => d.data() as any);
}

// ---------------------------------------------------------------------------
// Conversaciones del Chef IA — users/{uid}/conversations/{id}/messages/{id}
// ---------------------------------------------------------------------------

export async function createConversation(uid: string, title: string) {
  const ref = await addDoc(collection(db, 'users', uid, 'conversations'), { title, createdAt: serverTimestamp() });
  return ref.id;
}

export async function appendMessage(
  uid: string,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  structuredJson?: string
) {
  await addDoc(collection(db, 'users', uid, 'conversations', conversationId, 'messages'), {
    role,
    content,
    structuredJson: structuredJson ?? null,
    createdAt: serverTimestamp()
  });
}

export async function listMessages(uid: string, conversationId: string) {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'))
  );
  return snap.docs.map((d) => d.data() as any);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
