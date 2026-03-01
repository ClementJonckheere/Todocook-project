/**
 * Intelligent Ingredient Matcher
 *
 * Matches scanned products to base ingredients used in recipes.
 * Uses keyword matching, category mapping, and fuzzy text similarity.
 */

// Mapping of keywords to base ingredient names
// IMPORTANT: Les ingrédients plus spécifiques sont définis en premier pour être matchés prioritairement
const KEYWORD_MAPPINGS: Record<string, string[]> = {
  // === VIANDES - Variantes spécifiques d'abord ===
  // Poulet - variantes spécifiques
  "filet de poulet": ["filet de poulet", "blanc de poulet", "escalope de poulet", "aiguillette de poulet", "chicken breast", "chicken fillet"],
  "cuisse de poulet": ["cuisse de poulet", "haut de cuisse", "pilon de poulet", "chicken thigh", "chicken leg", "chicken drumstick"],
  "poulet entier": ["poulet entier", "poulet roti", "whole chicken", "roast chicken"],
  "poulet": ["poulet", "chicken", "volaille"], // Fallback générique

  // Boeuf - variantes spécifiques
  "steak hache": ["steak hache", "viande hachee", "hache boeuf", "ground beef", "beef mince", "boeuf hache"],
  "steak": ["steak", "entrecote", "rumsteck", "faux-filet", "bavette", "onglet", "beef steak"],
  "boeuf": ["boeuf", "beef"], // Fallback générique

  // Porc - variantes spécifiques
  "lardons": ["lardons", "lardon", "bacon bits"],
  "jambon": ["jambon", "ham"],
  "saucisse": ["saucisse", "chipolata", "merguez", "sausage"],
  "porc": ["porc", "pork"], // Fallback générique

  "agneau": ["agneau", "lamb", "mouton"],
  "dinde": ["dinde", "turkey", "escalope de dinde", "filet de dinde"],
  "canard": ["canard", "duck", "magret", "magret de canard"],

  // === POISSONS ===
  "filet de saumon": ["filet de saumon", "pave de saumon", "salmon fillet"],
  "saumon fume": ["saumon fume", "smoked salmon"],
  "saumon": ["saumon", "salmon"], // Fallback
  "thon en boite": ["thon en boite", "thon en conserve", "canned tuna"],
  "thon": ["thon", "tuna"], // Fallback
  "cabillaud": ["cabillaud", "cod", "morue", "filet de cabillaud"],
  "crevettes": ["crevette", "shrimp", "gambas", "crevettes"],

  // === FECULENTS ===
  "riz blanc": ["riz blanc", "white rice"],
  "riz basmati": ["riz basmati", "basmati rice"],
  "riz complet": ["riz complet", "brown rice", "riz brun"],
  "riz": ["riz", "rice"], // Fallback
  "pates": ["pates", "pasta", "spaghetti", "tagliatelle", "penne", "fusilli", "macaroni", "nouilles", "linguine", "farfalle"],
  "pomme de terre": ["pomme de terre", "potato", "patate", "pommes de terre"],
  "puree": ["puree", "puree de pomme de terre", "mashed potato"],
  "frites": ["frites", "frite", "french fries", "chips"],
  "pain": ["pain", "bread", "baguette", "brioche"],

  // === LEGUMES ===
  // Tomates - variantes spécifiques AVANT tomate générique
  "sauce tomate": ["sauce tomate", "tomato sauce", "coulis de tomate", "passata", "puree de tomate"],
  "concentre de tomate": ["concentre de tomate", "tomato paste", "double concentre", "triple concentre"],
  "tomates pelees": ["tomates pelees", "tomate pelee", "peeled tomatoes", "tomates concassees"],
  "tomates cerises": ["tomates cerises", "tomate cerise", "cherry tomatoes"],
  "tomate": ["tomate", "tomato", "tomates"], // Fallback pour tomates fraîches

  "oignon": ["oignon", "onion", "oignons"],
  "echalote": ["echalote", "shallot", "echalotes"],
  "ail": ["ail", "garlic", "gousse d'ail"],
  "carotte": ["carotte", "carrot", "carottes"],
  "courgette": ["courgette", "zucchini", "courgettes"],
  "poivron": ["poivron", "pepper", "poivrons", "poivron rouge", "poivron vert", "poivron jaune"],
  "salade": ["salade", "laitue", "lettuce", "mesclun", "roquette", "mache"],
  "champignons": ["champignon", "mushroom", "champignons", "champignon de paris"],
  "haricots verts": ["haricot vert", "haricots verts", "green bean", "green beans"],
  "brocoli": ["brocoli", "broccoli"],
  "epinards": ["epinard", "spinach", "epinards"],
  "aubergine": ["aubergine", "eggplant"],

  // === PRODUITS LAITIERS ===
  "lait": ["lait", "milk"],
  "lait entier": ["lait entier", "whole milk"],
  "lait demi-ecreme": ["lait demi-ecreme", "lait demi ecreme", "semi-skimmed milk"],
  "beurre": ["beurre", "butter"],
  "creme fraiche": ["creme fraiche", "creme epaisse", "sour cream"],
  "creme liquide": ["creme liquide", "creme fluide", "liquid cream", "heavy cream"],
  "creme": ["creme", "cream"], // Fallback
  "fromage rape": ["fromage rape", "grated cheese", "emmental rape", "gruyere rape"],
  "emmental": ["emmental"],
  "parmesan": ["parmesan", "parmigiano"],
  "mozzarella": ["mozzarella", "mozza"],
  "gruyere": ["gruyere"],
  "fromage": ["fromage", "cheese", "cheddar"], // Fallback
  "yaourt": ["yaourt", "yogourt", "yogurt"],
  "oeuf": ["oeuf", "egg", "oeufs", "eggs"],

  // === HUILES ET CONDIMENTS ===
  "huile d'olive": ["huile olive", "olive oil", "huile d'olive"],
  "huile de tournesol": ["huile de tournesol", "huile tournesol", "sunflower oil"],
  "huile": ["huile", "oil"], // Fallback
  "vinaigre balsamique": ["vinaigre balsamique", "balsamic vinegar"],
  "vinaigre": ["vinaigre", "vinegar"],
  "moutarde": ["moutarde", "mustard"],
  "mayonnaise": ["mayonnaise", "mayo"],
  "ketchup": ["ketchup"],
  "sauce soja": ["sauce soja", "soy sauce", "soja"],

  // === EPICES ===
  "sel": ["sel", "salt"],
  "poivre": ["poivre", "black pepper", "poivre noir"],
  "herbes de provence": ["herbes de provence", "herbes provence"],
  "thym": ["thym", "thyme"],
  "romarin": ["romarin", "rosemary"],
  "basilic": ["basilic", "basil"],
  "persil": ["persil", "parsley"],
  "curry": ["curry"],
  "paprika": ["paprika"],
  "cumin": ["cumin"],

  // === FRUITS ===
  "pomme": ["pomme", "apple", "pommes"],
  "banane": ["banane", "banana", "bananes"],
  "orange": ["orange", "oranges"],
  "citron": ["citron", "lemon", "citrons"],

  // === AUTRES ===
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
 * Check if text contains any of the keywords and return match info
 */
function findKeywordMatch(text: string, keywords: string[]): { matched: boolean; bestKeyword: string; score: number } {
  const normalized = normalizeText(text);
  let bestMatch = { matched: false, bestKeyword: "", score: 0 };

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalized.includes(normalizedKeyword)) {
      // Score basé sur la longueur du mot-clé (plus long = plus spécifique)
      const score = normalizedKeyword.length;
      if (score > bestMatch.score) {
        bestMatch = { matched: true, bestKeyword: keyword, score };
      }
    }
  }

  return bestMatch;
}

// Groupes d'ingrédients liés - pour éviter les doublons entre variantes
const INGREDIENT_GROUPS: Record<string, string[]> = {
  "poulet": ["filet de poulet", "cuisse de poulet", "poulet entier", "poulet"],
  "boeuf": ["steak hache", "steak", "boeuf"],
  "porc": ["lardons", "jambon", "saucisse", "porc"],
  "saumon": ["filet de saumon", "saumon fume", "saumon"],
  "thon": ["thon en boite", "thon"],
  "riz": ["riz blanc", "riz basmati", "riz complet", "riz"],
  "tomate": ["sauce tomate", "concentre de tomate", "tomates pelees", "tomates cerises", "tomate"],
  "creme": ["creme fraiche", "creme liquide", "creme"],
  "fromage": ["fromage rape", "emmental", "parmesan", "mozzarella", "gruyere", "fromage"],
  "lait": ["lait entier", "lait demi-ecreme", "lait"],
  "huile": ["huile d'olive", "huile de tournesol", "huile"],
  "vinaigre": ["vinaigre balsamique", "vinaigre"],
};

/**
 * Find matching base ingredients for a scanned product
 * Priorise les matchs les plus spécifiques et évite les doublons de variantes
 */
export function findMatchingIngredients(
  productName: string,
  productCategory?: string | null,
  productBrand?: string | null
): string[] {
  const searchText = `${productName} ${productCategory || ""} ${productBrand || ""}`;

  // Collecter tous les matchs avec leur score de spécificité
  const matchesWithScores: Array<{ ingredient: string; score: number }> = [];

  // Check keyword mappings
  for (const [baseIngredient, keywords] of Object.entries(KEYWORD_MAPPINGS)) {
    const matchInfo = findKeywordMatch(searchText, keywords);
    if (matchInfo.matched) {
      matchesWithScores.push({
        ingredient: baseIngredient,
        score: matchInfo.score
      });
    }
  }

  // Trier par score décroissant (plus spécifique en premier)
  matchesWithScores.sort((a, b) => b.score - a.score);

  // Filtrer pour garder seulement le match le plus spécifique par groupe
  const finalMatches: string[] = [];
  const usedGroups = new Set<string>();

  for (const match of matchesWithScores) {
    // Trouver le groupe de cet ingrédient
    let ingredientGroup: string | null = null;
    for (const [group, members] of Object.entries(INGREDIENT_GROUPS)) {
      if (members.includes(match.ingredient)) {
        ingredientGroup = group;
        break;
      }
    }

    // Si l'ingrédient appartient à un groupe déjà utilisé, le sauter
    if (ingredientGroup && usedGroups.has(ingredientGroup)) {
      continue;
    }

    // Ajouter le match et marquer le groupe comme utilisé
    finalMatches.push(match.ingredient);
    if (ingredientGroup) {
      usedGroups.add(ingredientGroup);
    }
  }

  // Check category mappings if we have a category (seulement si pas déjà matché)
  if (productCategory) {
    const normalizedCategory = normalizeText(productCategory);
    for (const [categoryKey, baseIngredient] of Object.entries(CATEGORY_MAPPINGS)) {
      if (normalizedCategory.includes(normalizeText(categoryKey))) {
        // Vérifier que cet ingrédient ou son groupe n'est pas déjà présent
        let shouldAdd = !finalMatches.includes(baseIngredient);

        if (shouldAdd) {
          for (const [group, members] of Object.entries(INGREDIENT_GROUPS)) {
            if (members.includes(baseIngredient) && usedGroups.has(group)) {
              shouldAdd = false;
              break;
            }
          }
        }

        if (shouldAdd) {
          finalMatches.push(baseIngredient);
        }
      }
    }
  }

  return finalMatches;
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
