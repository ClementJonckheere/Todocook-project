/**
 * Intelligent Ingredient Matcher
 *
 * Matches scanned products to base ingredients used in recipes.
 * Uses keyword matching, category mapping, and fuzzy text similarity.
 */

// Mapping of keywords to base ingredient names
const KEYWORD_MAPPINGS: Record<string, string[]> = {
  // Viandes
  "poulet": ["poulet", "chicken", "volaille", "blanc de poulet", "filet de poulet", "escalope de poulet"],
  "boeuf": ["boeuf", "beef", "steak", "viande hachee", "hache boeuf", "entrecote", "rumsteck"],
  "porc": ["porc", "pork", "jambon", "lardons", "bacon", "saucisse", "chipolata"],
  "agneau": ["agneau", "lamb", "mouton"],
  "dinde": ["dinde", "turkey"],
  "canard": ["canard", "duck", "magret"],

  // Poissons
  "saumon": ["saumon", "salmon"],
  "thon": ["thon", "tuna"],
  "cabillaud": ["cabillaud", "cod", "morue"],
  "crevettes": ["crevette", "shrimp", "gambas"],

  // Feculents
  "riz blanc": ["riz", "rice"],
  "pates": ["pates", "pasta", "spaghetti", "tagliatelle", "penne", "fusilli", "macaroni", "nouilles"],
  "pomme de terre": ["pomme de terre", "potato", "patate", "frite", "puree"],
  "pain": ["pain", "bread", "baguette", "brioche"],

  // Legumes
  "tomate": ["tomate", "tomato", "tomates"],
  "oignon": ["oignon", "onion", "echalote", "oignons"],
  "ail": ["ail", "garlic"],
  "carotte": ["carotte", "carrot", "carottes"],
  "courgette": ["courgette", "zucchini"],
  "poivron": ["poivron", "pepper", "poivrons"],
  "salade": ["salade", "laitue", "lettuce", "mesclun", "roquette", "mache"],
  "champignons": ["champignon", "mushroom", "champignons"],
  "haricots verts": ["haricot", "haricots verts", "green bean"],
  "brocoli": ["brocoli", "broccoli"],
  "epinards": ["epinard", "spinach", "epinards"],
  "aubergine": ["aubergine", "eggplant"],

  // Produits laitiers
  "lait": ["lait", "milk"],
  "beurre": ["beurre", "butter"],
  "creme fraiche": ["creme", "cream", "creme fraiche"],
  "fromage rape": ["fromage", "cheese", "emmental", "gruyere", "parmesan", "mozzarella", "cheddar"],
  "yaourt": ["yaourt", "yogourt", "yogurt"],
  "oeuf": ["oeuf", "egg", "oeufs", "eggs"],

  // Huiles et condiments
  "huile d'olive": ["huile olive", "olive oil", "huile d'olive"],
  "huile": ["huile", "oil"],
  "vinaigre": ["vinaigre", "vinegar"],
  "moutarde": ["moutarde", "mustard"],
  "mayonnaise": ["mayonnaise", "mayo"],
  "ketchup": ["ketchup", "sauce tomate"],
  "sauce soja": ["sauce soja", "soy sauce", "soja"],

  // Epices
  "sel": ["sel", "salt"],
  "poivre": ["poivre", "pepper"],
  "herbes de provence": ["herbes", "thym", "romarin", "laurier", "origan"],
  "curry": ["curry"],
  "paprika": ["paprika"],
  "cumin": ["cumin"],

  // Fruits
  "pomme": ["pomme", "apple"],
  "banane": ["banane", "banana"],
  "orange": ["orange"],
  "citron": ["citron", "lemon"],

  // Autres
  "farine": ["farine", "flour"],
  "sucre": ["sucre", "sugar"],
  "miel": ["miel", "honey"],
  "chocolat": ["chocolat", "chocolate", "cacao"],
};

// Category mappings from OpenFoodFacts categories to base ingredients
const CATEGORY_MAPPINGS: Record<string, string> = {
  "poultry": "poulet",
  "chicken": "poulet",
  "beef": "boeuf",
  "pork": "porc",
  "fish": "saumon",
  "salmon": "saumon",
  "tuna": "thon",
  "rice": "riz blanc",
  "pasta": "pates",
  "noodles": "pates",
  "potatoes": "pomme de terre",
  "tomatoes": "tomate",
  "onions": "oignon",
  "carrots": "carotte",
  "milk": "lait",
  "butter": "beurre",
  "cheese": "fromage rape",
  "yogurt": "yaourt",
  "eggs": "oeuf",
  "olive-oil": "huile d'olive",
  "bread": "pain",
  "flour": "farine",
  "sugar": "sucre",
};

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s]/g, " ")    // Remove special chars
    .replace(/\s+/g, " ")            // Normalize spaces
    .trim();
}

/**
 * Check if text contains any of the keywords
 */
function containsKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalizeText(text);
  return keywords.some(keyword => {
    const normalizedKeyword = normalizeText(keyword);
    return normalized.includes(normalizedKeyword);
  });
}

/**
 * Find matching base ingredients for a scanned product
 */
export function findMatchingIngredients(
  productName: string,
  productCategory?: string | null,
  productBrand?: string | null
): string[] {
  const matches: string[] = [];
  const searchText = `${productName} ${productCategory || ""} ${productBrand || ""}`;

  // Check keyword mappings
  for (const [baseIngredient, keywords] of Object.entries(KEYWORD_MAPPINGS)) {
    if (containsKeyword(searchText, keywords)) {
      matches.push(baseIngredient);
    }
  }

  // Check category mappings if we have a category
  if (productCategory) {
    const normalizedCategory = normalizeText(productCategory);
    for (const [categoryKey, baseIngredient] of Object.entries(CATEGORY_MAPPINGS)) {
      if (normalizedCategory.includes(normalizeText(categoryKey))) {
        if (!matches.includes(baseIngredient)) {
          matches.push(baseIngredient);
        }
      }
    }
  }

  return matches;
}

/**
 * Calculate text similarity score (0-1)
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const s1 = normalizeText(text1);
  const s2 = normalizeText(text2);

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Simple word overlap score
  const words1 = new Set(s1.split(" ").filter(w => w.length > 2));
  const words2 = new Set(s2.split(" ").filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let overlap = 0;
  Array.from(words1).forEach(word => {
    if (words2.has(word)) overlap++;
  });

  return overlap / Math.max(words1.size, words2.size);
}

/**
 * Find best matching ingredient from database by name similarity
 */
export function findBestMatch(
  productName: string,
  ingredients: Array<{ id: number; name: string; category?: string }>
): { id: number; name: string; score: number } | null {
  let bestMatch: { id: number; name: string; score: number } | null = null;

  for (const ingredient of ingredients) {
    const score = calculateSimilarity(productName, ingredient.name);

    if (score > 0.3 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = {
        id: ingredient.id,
        name: ingredient.name,
        score,
      };
    }
  }

  return bestMatch;
}

/**
 * Get all base ingredient names that could be matched
 */
export function getAllBaseIngredientNames(): string[] {
  return Object.keys(KEYWORD_MAPPINGS);
}
