import { collection, doc, getDocs, setDoc, query, limit as fsLimit, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { synchronizeDualBasket } from '@/lib/dualBasket/sync';
import { ensureUserDoc } from './db';

interface FoodSeed {
  name: string;
  category: string;
  isRawProtein?: boolean;
  safeInternalTempC?: number;
  canCookFrozen?: boolean;
  recommendDefrost?: boolean;
  recommendedQuantity?: string;
  containerType?: string;
  notes?: string;
  profile: {
    tempC: number;
    minTimeMin: number;
    maxTimeMin: number;
    requiresPreheat?: boolean;
    requiresShaking?: boolean;
    requiresFlipping?: boolean;
  };
}

const FOODS: FoodSeed[] = [
  { name: 'Pechuga de pollo', category: 'Pollo', isRawProtein: true, safeInternalTempC: 74, recommendedQuantity: '2 pechugas (~500 g), sin amontonar', containerType: 'cesta directa', profile: { tempC: 190, minTimeMin: 12, maxTimeMin: 18, requiresFlipping: true } },
  { name: 'Contramuslos de pollo', category: 'Pollo', isRawProtein: true, safeInternalTempC: 74, recommendedQuantity: '4-6 uds (~600 g)', containerType: 'cesta directa', profile: { tempC: 190, minTimeMin: 18, maxTimeMin: 24, requiresFlipping: true } },
  { name: 'Alitas de pollo', category: 'Pollo', isRawProtein: true, safeInternalTempC: 74, canCookFrozen: true, notes: 'Si están congeladas, añade 5-8 min y evita apilarlas.', containerType: 'cesta directa', profile: { tempC: 190, minTimeMin: 20, maxTimeMin: 25, requiresFlipping: true } },
  { name: 'Pollo empanado (escalope)', category: 'Empanados', isRawProtein: true, safeInternalTempC: 74, containerType: 'cesta directa', profile: { tempC: 190, minTimeMin: 12, maxTimeMin: 16, requiresFlipping: true, requiresPreheat: true } },
  { name: 'Chuletas de cerdo', category: 'Cerdo', isRawProtein: true, safeInternalTempC: 71, containerType: 'cesta directa', profile: { tempC: 190, minTimeMin: 12, maxTimeMin: 16, requiresFlipping: true } },
  { name: 'Hamburguesas caseras', category: 'Ternera', isRawProtein: true, safeInternalTempC: 71, notes: 'Carne picada: debe alcanzar 71 ºC en el centro.', containerType: 'cesta directa', profile: { tempC: 190, minTimeMin: 10, maxTimeMin: 14, requiresFlipping: true } },
  { name: 'Filete de ternera', category: 'Ternera', isRawProtein: true, safeInternalTempC: 63, containerType: 'cesta directa', profile: { tempC: 200, minTimeMin: 8, maxTimeMin: 12, requiresFlipping: true } },
  { name: 'Salmón', category: 'Pescado', isRawProtein: true, safeInternalTempC: 63, recommendedQuantity: '2-3 lomos, con espacio entre ellos', containerType: 'bandeja perforada', notes: 'No sobrecargar la cesta: el vapor impide que quede crujiente.', profile: { tempC: 180, minTimeMin: 8, maxTimeMin: 12 } },
  { name: 'Merluza (filetes)', category: 'Pescado', isRawProtein: true, safeInternalTempC: 63, containerType: 'bandeja perforada', profile: { tempC: 180, minTimeMin: 8, maxTimeMin: 10 } },
  { name: 'Pescado empanado', category: 'Empanados', isRawProtein: true, safeInternalTempC: 63, containerType: 'cesta directa', profile: { tempC: 190, minTimeMin: 10, maxTimeMin: 14, requiresFlipping: true } },
  { name: 'Gambas', category: 'Marisco', isRawProtein: true, safeInternalTempC: 63, canCookFrozen: true, containerType: 'cesta directa', profile: { tempC: 180, minTimeMin: 6, maxTimeMin: 8, requiresShaking: true } },
  { name: 'Patatas fritas congeladas', category: 'Patatas', canCookFrozen: true, recommendDefrost: false, containerType: 'cesta directa', profile: { tempC: 200, minTimeMin: 12, maxTimeMin: 18, requiresShaking: true } },
  { name: 'Patatas gajo', category: 'Patatas', containerType: 'cesta directa', profile: { tempC: 200, minTimeMin: 16, maxTimeMin: 20, requiresShaking: true } },
  { name: 'Patatas', category: 'Patatas', notes: 'Nombre genérico: usa "Patatas gajo" o "Patatas fritas congeladas" para perfiles más precisos.', containerType: 'cesta directa', profile: { tempC: 200, minTimeMin: 15, maxTimeMin: 20, requiresShaking: true } },
  { name: 'Brócoli', category: 'Verduras', containerType: 'cesta directa', profile: { tempC: 190, minTimeMin: 8, maxTimeMin: 12, requiresShaking: true } },
  { name: 'Calabacín', category: 'Verduras', containerType: 'cesta directa', profile: { tempC: 190, minTimeMin: 8, maxTimeMin: 10, requiresShaking: true } },
  { name: 'Pimiento', category: 'Verduras', containerType: 'cesta directa', profile: { tempC: 190, minTimeMin: 8, maxTimeMin: 12, requiresShaking: true } },
  { name: 'Cebolla', category: 'Verduras', containerType: 'cesta directa', profile: { tempC: 190, minTimeMin: 8, maxTimeMin: 12, requiresShaking: true } },
  { name: 'Verduras variadas', category: 'Verduras', containerType: 'cesta directa', profile: { tempC: 190, minTimeMin: 10, maxTimeMin: 14, requiresShaking: true } },
  { name: 'Huevo', category: 'Huevos', isRawProtein: true, safeInternalTempC: 71, notes: '12 min ≈ yema jugosa; 16 min ≈ huevo duro.', containerType: 'cesta directa o molde', profile: { tempC: 135, minTimeMin: 12, maxTimeMin: 16 } },
  { name: 'Nuggets de pollo congelados', category: 'Congelados', canCookFrozen: true, notes: 'Ya precocinados: el objetivo es dorar, no cocinar por dentro.', containerType: 'cesta directa', profile: { tempC: 200, minTimeMin: 10, maxTimeMin: 14, requiresShaking: true } },
  { name: 'Croquetas congeladas', category: 'Congelados', canCookFrozen: true, containerType: 'cesta directa', profile: { tempC: 200, minTimeMin: 10, maxTimeMin: 14, requiresShaking: true } },
  { name: 'Magdalenas', category: 'Repostería', containerType: 'molde individual', profile: { tempC: 160, minTimeMin: 15, maxTimeMin: 18, requiresPreheat: true } },
  { name: 'Pan para tostar', category: 'Pan', containerType: 'cesta directa', profile: { tempC: 180, minTimeMin: 4, maxTimeMin: 6 } },
  { name: 'Garbanzos crujientes', category: 'Snacks', containerType: 'cesta directa', profile: { tempC: 200, minTimeMin: 15, maxTimeMin: 20, requiresShaking: true } }
];

const GOURMIA_ID = 'gourmia-gaf1180';

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function runInitialSeed(uid: string, displayName: string) {
  await ensureUserDoc(uid, displayName);

  await setDoc(doc(db, 'airFryerModels', GOURMIA_ID), {
    brand: 'Gourmia',
    model: 'GAF1180',
    capacityLiters: 10.4,
    basketCount: 2,
    dualZone: true,
    maxTempC: 200,
    notes: 'Double Decker Air Fryer 10.4L — dos cestas independientes con control de tiempo y temperatura por separado.'
  });

  const existingFoods = await getDocs(query(collection(db, 'foods'), fsLimit(1)));
  if (existingFoods.empty) {
    for (const f of FOODS) {
      await setDoc(doc(db, 'foods', slugify(f.name)), {
        name: f.name,
        category: f.category,
        isRawProtein: f.isRawProtein ?? false,
        safeInternalTempC: f.safeInternalTempC ?? null,
        canCookFrozen: f.canCookFrozen ?? false,
        recommendDefrost: f.recommendDefrost ?? true,
        recommendedQuantity: f.recommendedQuantity ?? null,
        containerType: f.containerType ?? null,
        dualZoneCompatible: true,
        notes: f.notes ?? null,
        cookingProfile: {
          tempC: f.profile.tempC,
          minTimeMin: f.profile.minTimeMin,
          maxTimeMin: f.profile.maxTimeMin,
          requiresPreheat: f.profile.requiresPreheat ?? false,
          requiresShaking: f.profile.requiresShaking ?? false,
          requiresFlipping: f.profile.requiresFlipping ?? false
        }
      });
    }
  }

  await setDoc(doc(db, 'users', uid), { airFryerModelId: GOURMIA_ID }, { merge: true });

  const existingRecipes = await getDocs(query(collection(db, 'recipes'), fsLimit(1)));
  if (existingRecipes.empty) {
    await seedSampleRecipes(uid);
  }

  return { seededFoods: existingFoods.empty, seededRecipes: existingRecipes.empty };
}

async function seedSampleRecipes(uid: string) {
  const plan = synchronizeDualBasket([
    { zone: 'CESTA_1', foodLabel: 'Patatas gajo', tempC: 200, timeMin: 18, requiresShaking: true, shakeAtMinute: 9 },
    { zone: 'CESTA_2', foodLabel: 'Contramuslos de pollo', tempC: 190, timeMin: 22, requiresFlipping: true, flipAtMinute: 11 }
  ]);

  const dualRecipe = {
    name: 'Patatas gajo con contramuslos de pollo a doble cesta',
    description:
      'El clásico de cena entre semana, pero con las dos cestas de la Gourmia trabajando a la vez y listas exactamente al mismo tiempo.',
    servingsBase: 4,
    difficulty: 'FACIL',
    totalTimeMin: plan.globalTotalMin + 10,
    airFryerTimeMin: plan.globalTotalMin,
    cuisineType: 'española',
    source: 'SYSTEM',
    isDualZone: true,
    safetyNotes: 'El pollo debe alcanzar 74 ºC en su parte más gruesa. Verifica con termómetro si tienes uno.',
    airFryerModelId: GOURMIA_ID,
    createdByUserId: uid,
    createdAt: serverTimestamp(),
    ingredients: [
      { name: 'Patatas gajo', quantity: 700, unit: 'g', group: 'PRINCIPAL' },
      { name: 'Contramuslos de pollo', quantity: 700, unit: 'g', group: 'PRINCIPAL' },
      { name: 'Aceite de oliva', quantity: 2, unit: 'cucharada', group: 'CONDIMENTO' },
      { name: 'Pimentón dulce', quantity: 1, unit: 'cucharadita', group: 'CONDIMENTO' },
      { name: 'Ajo en polvo', quantity: 1, unit: 'cucharadita', group: 'CONDIMENTO' },
      { name: 'Sal', quantity: 1, unit: 'pizca', group: 'CONDIMENTO' }
    ],
    steps: [
      { stepNumber: 1, instruction: 'Corta las patatas en gajos gruesos y sazona con aceite, sal y pimentón.', zone: 'CESTA_1', tempC: null, timeMin: null, requiresShaking: false, requiresFlipping: false },
      { stepNumber: 2, instruction: 'Unta los contramuslos con aceite, ajo en polvo, sal y pimienta.', zone: 'CESTA_2', tempC: null, timeMin: null, requiresShaking: false, requiresFlipping: false },
      { stepNumber: 3, instruction: 'Introduce primero el pollo en Cesta 2 a 190 ºC durante 22 min.', tempC: 190, timeMin: 22, zone: 'CESTA_2', requiresFlipping: true, requiresShaking: false },
      { stepNumber: 4, instruction: 'A los 4 min, añade las patatas en Cesta 1 a 200 ºC durante 18 min.', tempC: 200, timeMin: 18, zone: 'CESTA_1', requiresShaking: true, requiresFlipping: false },
      { stepNumber: 5, instruction: 'Comprueba que el pollo alcanza 74 ºC en su parte más gruesa antes de servir.', zone: 'NONE', tempC: null, timeMin: null, requiresShaking: false, requiresFlipping: false }
    ],
    zones: plan.zones.map((z, idx) => ({
      zone: z.zone,
      foodLabel: z.foodLabel,
      tempC: z.tempC,
      timeMin: z.timeMin,
      startOffsetMin: z.startOffsetMin,
      order: idx
    }))
  };

  const lightPlan = synchronizeDualBasket([
    { zone: 'CESTA_1', foodLabel: 'Salmón', tempC: 180, timeMin: 10 },
    { zone: 'CESTA_2', foodLabel: 'Brócoli', tempC: 190, timeMin: 10, requiresShaking: true, shakeAtMinute: 5 }
  ]);

  const lightRecipe = {
    name: 'Salmón ligero con brócoli al vapor-asado',
    description: 'Cena rápida y ligera para noches de entresemana: salmón jugoso y brócoli con un punto crujiente.',
    servingsBase: 4,
    difficulty: 'FACIL',
    totalTimeMin: 20,
    airFryerTimeMin: lightPlan.globalTotalMin,
    cuisineType: 'mediterránea',
    source: 'SYSTEM',
    isDualZone: true,
    safetyNotes: 'El salmón está listo cuando se separa fácilmente en lascas y alcanza 63 ºC en el centro.',
    airFryerModelId: GOURMIA_ID,
    createdByUserId: uid,
    createdAt: serverTimestamp(),
    ingredients: [
      { name: 'Salmón', quantity: 600, unit: 'g', group: 'PRINCIPAL' },
      { name: 'Brócoli', quantity: 400, unit: 'g', group: 'PRINCIPAL' },
      { name: 'Aceite de oliva', quantity: 1, unit: 'cucharada', group: 'CONDIMENTO' },
      { name: 'Sal', quantity: 1, unit: 'pizca', group: 'CONDIMENTO' }
    ],
    steps: [
      { stepNumber: 1, instruction: 'Sazona los lomos de salmón con sal, aceite y unas gotas de limón.', zone: 'CESTA_1', tempC: null, timeMin: null, requiresShaking: false, requiresFlipping: false },
      { stepNumber: 2, instruction: 'Aliña el brócoli con aceite y sal.', zone: 'CESTA_2', tempC: null, timeMin: null, requiresShaking: false, requiresFlipping: false },
      { stepNumber: 3, instruction: 'Introduce ambas cestas a la vez: salmón a 180 ºC y brócoli a 190 ºC, 10 min.', zone: 'AMBAS', tempC: null, timeMin: 10, requiresShaking: false, requiresFlipping: false },
      { stepNumber: 4, instruction: 'Agita el brócoli a mitad de cocción.', zone: 'CESTA_2', tempC: null, timeMin: null, requiresShaking: true, requiresFlipping: false }
    ],
    zones: lightPlan.zones.map((z, idx) => ({ zone: z.zone, foodLabel: z.foodLabel, tempC: z.tempC, timeMin: z.timeMin, startOffsetMin: z.startOffsetMin, order: idx }))
  };

  const quickPlan = synchronizeDualBasket([
    { zone: 'CESTA_1', foodLabel: 'Nuggets de pollo', tempC: 200, timeMin: 12, requiresShaking: true, shakeAtMinute: 6 },
    { zone: 'CESTA_2', foodLabel: 'Patatas fritas', tempC: 200, timeMin: 16, requiresShaking: true, shakeAtMinute: 8 }
  ]);

  const quickRecipe = {
    name: 'Nuggets crujientes con patatas fritas (menos de 20 min)',
    description: 'El comodín para cuando no hay tiempo: directo del congelador a la mesa.',
    servingsBase: 4,
    difficulty: 'FACIL',
    totalTimeMin: quickPlan.globalTotalMin + 2,
    airFryerTimeMin: quickPlan.globalTotalMin,
    cuisineType: null,
    source: 'SYSTEM',
    isDualZone: true,
    safetyNotes: null,
    airFryerModelId: GOURMIA_ID,
    createdByUserId: uid,
    createdAt: serverTimestamp(),
    ingredients: [
      { name: 'Nuggets de pollo congelados', quantity: 500, unit: 'g', group: 'PRINCIPAL' },
      { name: 'Patatas fritas congeladas', quantity: 500, unit: 'g', group: 'PRINCIPAL' }
    ],
    steps: [
      { stepNumber: 1, instruction: 'Reparte las patatas fritas congeladas en Cesta 2, sin apilar.', zone: 'CESTA_2', tempC: null, timeMin: null, requiresShaking: false, requiresFlipping: false },
      { stepNumber: 2, instruction: 'A los 4 min, añade los nuggets en Cesta 1.', zone: 'CESTA_1', tempC: null, timeMin: null, requiresShaking: false, requiresFlipping: false },
      { stepNumber: 3, instruction: 'Agita ambas cestas a mitad de su propia cocción.', zone: 'AMBAS', tempC: null, timeMin: null, requiresShaking: true, requiresFlipping: false }
    ],
    zones: quickPlan.zones.map((z, idx) => ({ zone: z.zone, foodLabel: z.foodLabel, tempC: z.tempC, timeMin: z.timeMin, startOffsetMin: z.startOffsetMin, order: idx }))
  };

  const eggsRecipe = {
    name: 'Verduras de temporada con huevo al horno',
    description: 'Opción vegetariana, ligera y con proteína del huevo. Todo en una sola cesta.',
    servingsBase: 4,
    difficulty: 'FACIL',
    totalTimeMin: 25,
    airFryerTimeMin: 15,
    cuisineType: null,
    source: 'SYSTEM',
    isDualZone: false,
    safetyNotes: 'Cocina hasta que la clara esté cuajada; para embarazo o público vulnerable, cuaja también la yema.',
    airFryerModelId: GOURMIA_ID,
    createdByUserId: uid,
    createdAt: serverTimestamp(),
    ingredients: [
      { name: 'Verduras variadas', quantity: 500, unit: 'g', group: 'PRINCIPAL' },
      { name: 'Huevo', quantity: 4, unit: 'ud', group: 'PRINCIPAL' },
      { name: 'Aceite de oliva', quantity: 1, unit: 'cucharada', group: 'CONDIMENTO' },
      { name: 'Sal', quantity: 1, unit: 'pizca', group: 'CONDIMENTO' }
    ],
    steps: [
      { stepNumber: 1, instruction: 'Corta las verduras en trozos similares y alíñalas con aceite y sal.', zone: null, tempC: null, timeMin: null, requiresShaking: false, requiresFlipping: false },
      { stepNumber: 2, instruction: 'Cocina las verduras 10 min a 190 ºC, agitando a mitad.', tempC: 190, timeMin: 10, requiresShaking: true, zone: null, requiresFlipping: false },
      { stepNumber: 3, instruction: 'Haz hueco entre las verduras y casca los huevos directamente encima.', zone: null, tempC: null, timeMin: null, requiresShaking: false, requiresFlipping: false },
      { stepNumber: 4, instruction: 'Cocina 5 min más a 160 ºC hasta que la clara esté cuajada.', tempC: 160, timeMin: 5, zone: null, requiresShaking: false, requiresFlipping: false }
    ],
    zones: []
  };

  const flagshipRef = doc(collection(db, 'recipes'));
  await setDoc(flagshipRef, dualRecipe);
  for (const r of [lightRecipe, quickRecipe, eggsRecipe]) {
    await setDoc(doc(collection(db, 'recipes')), r);
  }

  // La receta insignia se guarda ya en el recetario del usuario, como favorita.
  await setDoc(doc(db, 'users', uid, 'userRecipes', flagshipRef.id), {
    recipeId: flagshipRef.id,
    isFavorite: true,
    personalServings: null,
    categories: ['Favoritas'],
    ratings: [{ rating: 'LOVE', createdAt: new Date().toISOString() }],
    notes: [],
    savedAt: serverTimestamp(),
    summary: {
      name: dualRecipe.name,
      description: dualRecipe.description,
      difficulty: dualRecipe.difficulty,
      totalTimeMin: dualRecipe.totalTimeMin,
      airFryerTimeMin: dualRecipe.airFryerTimeMin,
      servingsBase: dualRecipe.servingsBase,
      isDualZone: dualRecipe.isDualZone
    }
  });
}
