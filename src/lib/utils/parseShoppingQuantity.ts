/**
 * Strip leading quantity + unit from a shopping item name so it's suitable
 * for Kroger product search.
 *
 * Recipe → shopping imports produce names like "2 cups flour" or
 * "1 lb chicken breast". Kroger's product search expects the noun
 * ("flour", "chicken breast") — sending the quantity-prefixed string
 * either returns nothing or matches the wrong SKU.
 *
 * Note: we deliberately do NOT auto-translate the parsed quantity into
 * Kroger cart quantity, because cooking measurements (cups, tbsp) don't
 * map to retail packaging (you don't buy 2 cups of flour — you buy 1
 * bag). Cart quantity stays at 1; the parsed quantity is surfaced to the
 * user as context.
 */

const MEASUREMENT_WORDS = new Set([
  'cup', 'cups', 'c',
  'tbsp', 'tbsps', 'tablespoon', 'tablespoons', 't', 'tb',
  'tsp', 'tsps', 'teaspoon', 'teaspoons',
  'oz', 'ounce', 'ounces',
  'lb', 'lbs', 'pound', 'pounds',
  'g', 'gram', 'grams',
  'kg', 'kilogram', 'kilograms',
  'ml', 'milliliter', 'milliliters',
  'l', 'liter', 'liters',
  'pinch', 'pinches', 'dash', 'dashes',
  'clove', 'cloves',
  'can', 'cans', 'jar', 'jars', 'package', 'packages', 'pkg',
  'slice', 'slices', 'piece', 'pieces',
  'stick', 'sticks',
  'qt', 'quart', 'quarts', 'pt', 'pint', 'pints', 'gal', 'gallon', 'gallons',
  'bunch', 'bunches', 'head', 'heads',
]);

// Numeric quantity at start of line:
//   "2", "1.5", "1 1/2", "1/2", "¼"
const QUANTITY_RE =
  /^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+|[¼½¾⅓⅔⅛⅜⅝⅞])\s+(.+)$/;

export interface ParsedShoppingQuantity {
  /** Cleaned name suitable for product search (no quantity, no unit). */
  name: string;
  /** Original full text. */
  original: string;
  /** Quantity literal as it appeared, e.g. "2", "1 1/2", "½". */
  quantity?: string;
  /** Lowercased unit if a measurement word followed the quantity. */
  unit?: string;
}

export function parseShoppingQuantity(text: string): ParsedShoppingQuantity {
  const original = text.trim();
  const match = original.match(QUANTITY_RE);
  if (!match) return { name: original, original };

  const quantity = match[1]!.trim();
  let rest = match[2]!.trim();

  // Optional measurement-word unit ("cups", "lb", etc.).
  const tokens = rest.split(/\s+/);
  const firstToken = tokens[0]?.toLowerCase().replace(/[.,:]$/, '');
  let unit: string | undefined;
  if (firstToken && MEASUREMENT_WORDS.has(firstToken)) {
    unit = firstToken;
    rest = tokens.slice(1).join(' ').trim();
  }

  // Strip a leading "of " ("2 cups of flour" → "flour").
  rest = rest.replace(/^of\s+/i, '').trim();

  return {
    name: rest || original,
    original,
    quantity,
    unit,
  };
}
