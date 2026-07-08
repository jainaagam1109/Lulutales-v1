// themeCatalog.ts
// SINGLE SOURCE OF TRUTH for themes, buckets, and badges.
// Replaces themeOptions.ts and themeMap.ts (both deleted).
//
// Resolver order for any story's theme -> bucket:
//   1. Exact match against KNOWN_THEMES (the 108 dropdown themes) - deterministic.
//   2. Keyword scan against BUCKET_KEYWORDS (for free-text library/admin themes).
//   3. Fallback bucket (see resolveBucket) if nothing matches.

export type BucketKey =
  | "B1"
  | "B2"
  | "B3"
  | "B4"
  | "B5"
  | "B6"
  | "B7a"
  | "B7b"
  | "B8"
  | "B9"
  | "B10"
  | "B11"
  | "B12";

export interface BucketDef {
  key: BucketKey;
  fullName: string;   // detail page / insights
  cardName: string;   // story card (short, 1 line)
  definition: string; // internal reference / tooltip
  badges: [string, string, string]; // tier 1 (1 story), tier 2 (3 stories), tier 3 (5 stories)
}

export const BUCKETS: Record<BucketKey, BucketDef> = {
  "B1": { key: "B1", fullName: "Sleep & Calm", cardName: "Sleep & Calm", definition: "Winding down, feeling safe in the dark, and letting the body rest.", badges: ["Sleepy Star", "Moon Whisperer", "Dream Captain"] },
  "B2": { key: "B2", fullName: "Healthy Eating & Body", cardName: "Healthy Eating", definition: "Eating well and caring for a growing body.", badges: ["Brave Taster", "Rainbow Plate", "Mighty Grower"] },
  "B3": { key: "B3", fullName: "Curiosity & Learning", cardName: "Curiosity", definition: "Wondering, noticing, and figuring out how the world works.", badges: ["Little Wonderer", "Question Explorer", "Master Discoverer"] },
  "B4": { key: "B4", fullName: "Sharing & Getting Along", cardName: "Sharing", definition: "Playing well with others: sharing, turn-taking, and cooperating.", badges: ["Sharing Buddy", "Team Player", "Friendship Builder"] },
  "B5": { key: "B5", fullName: "Kindness & Empathy", cardName: "Kindness", definition: "Caring about how others feel — comforting, including, being gentle.", badges: ["Kind Sprout", "Heart Helper", "Kindness Champion"] },
  "B6": { key: "B6", fullName: "Big Feelings", cardName: "Big Feelings", definition: "Naming big emotions and learning to ride them out.", badges: ["Feelings Spotter", "Storm Rider", "Feelings Master"] },
  "B7a": { key: "B7a", fullName: "Courage & Bravery", cardName: "Courage", definition: "Facing something scary or new and doing it anyway.", badges: ["Brave Cub", "Bold Lion", "Lionheart"] },
  "B7b": { key: "B7b", fullName: "Perseverance & Grit", cardName: "Grit", definition: "Sticking with hard things: trying again and bouncing back.", badges: ["Little Try-Again", "Steady Climber", "Mountain Mover"] },
  "B8": { key: "B8", fullName: "Honesty & Integrity", cardName: "Honesty", definition: "Telling the truth and doing right even when no one's watching.", badges: ["Spark of Truth", "Truth Torch", "Shining Beacon"] },
  "B9": { key: "B9", fullName: "Independence & Self", cardName: "Independence", definition: "Doing it myself, knowing my worth, becoming who I am.", badges: ["I-Can Kid", "Do-It-Myself Star", "True Me"] },
  "B10": { key: "B10", fullName: "Responsibility & Helping", cardName: "Responsibility", definition: "Doing my part and being someone others can count on.", badges: ["Little Helper", "Super Helper", "Captain Reliable"] },
  "B11": { key: "B11", fullName: "Fairness & the Wider World", cardName: "Fairness", definition: "Fairness, and caring for the wider world beyond me.", badges: ["Fair Friend", "Justice Seeker", "World Changer"] },
  "B12": { key: "B12", fullName: "Family & Belonging", cardName: "Belonging", definition: "Feeling loved and rooted — family, home, and belonging.", badges: ["Snuggle Bug", "Home Heart", "Family Anchor"] },
};

export interface ThemeOption {
  value: string;
  label: string;
  bucket: BucketKey;
}

export const THEMES_BY_AGE: Record<string, ThemeOption[]> = {
  "2": [
    { value: "saying goodnight", label: "Saying goodnight", bucket: "B1" },
    { value: "sharing toys", label: "Sharing toys", bucket: "B4" },
    { value: "eating vegetables", label: "Eating vegetables", bucket: "B2" },
    { value: "feeling scared", label: "Feeling scared", bucket: "B6" },
    { value: "bath time fun", label: "Bath time fun", bucket: "B1" },
    { value: "hugging mamma", label: "Hugging Mamma", bucket: "B12" },
    { value: "my first friend", label: "My first friend", bucket: "B4" },
    { value: "finding colours", label: "Finding colours", bucket: "B3" },
    { value: "baby animals", label: "Baby animals", bucket: "B3" },
    { value: "oops i spilled", label: "Oops, I spilled!", bucket: "B7b" },
    { value: "one more bite", label: "One more bite", bucket: "B2" },
    { value: "sleepy train", label: "Sleepy train", bucket: "B1" },
  ],
  "3": [
    { value: "taking turns", label: "Taking turns", bucket: "B4" },
    { value: "fruits are yummy", label: "Fruits are yummy", bucket: "B2" },
    { value: "bedtime monsters", label: "Bedtime monsters", bucket: "B1" },
    { value: "i feel angry", label: "I feel angry", bucket: "B6" },
    { value: "new baby sibling", label: "New baby sibling", bucket: "B12" },
    { value: "why is the sky blue", label: "Why is the sky blue?", bucket: "B3" },
    { value: "being brave", label: "Being brave", bucket: "B7a" },
    { value: "i can do it myself", label: "I can do it myself", bucket: "B9" },
    { value: "saying sorry", label: "Saying sorry", bucket: "B5" },
    { value: "papa comes home", label: "Papa comes home", bucket: "B12" },
    { value: "rain and puddles", label: "Rain and puddles", bucket: "B3" },
    { value: "quiet time", label: "Quiet time", bucket: "B1" },
  ],
  "4": [
    { value: "first day of school", label: "First day of school", bucket: "B7a" },
    { value: "making a new friend", label: "Making a new friend", bucket: "B4" },
    { value: "healthy lunchbox", label: "Healthy lunchbox", bucket: "B2" },
    { value: "bedtime and stars", label: "Bedtime and stars", bucket: "B1" },
    { value: "feeling left out", label: "Feeling left out", bucket: "B6" },
    { value: "bugs and butterflies", label: "Bugs and butterflies", bucket: "B3" },
    { value: "grandmas house", label: "Grandma's house", bucket: "B12" },
    { value: "being honest", label: "Being honest", bucket: "B8" },
    { value: "i fell down", label: "I fell down", bucket: "B7b" },
    { value: "mixing colours", label: "Mixing colours", bucket: "B3" },
    { value: "missing mamma", label: "Missing Mamma", bucket: "B6" },
    { value: "try one more time", label: "Try one more time", bucket: "B7b" },
  ],
  "5": [
    { value: "friendship", label: "Friendship", bucket: "B4" },
    { value: "courage", label: "Courage", bucket: "B7a" },
    { value: "healthy eating", label: "Healthy eating", bucket: "B2" },
    { value: "sleep routine", label: "Sleep routine", bucket: "B1" },
    { value: "sharing", label: "Sharing", bucket: "B4" },
    { value: "kindness", label: "Kindness", bucket: "B5" },
    { value: "curiosity", label: "Curiosity", bucket: "B3" },
    { value: "family love", label: "Family love", bucket: "B12" },
    { value: "understanding feelings", label: "Understanding feelings", bucket: "B6" },
    { value: "trying new things", label: "Trying new things", bucket: "B7a" },
    { value: "nature and seasons", label: "Nature and seasons", bucket: "B3" },
    { value: "helping at home", label: "Helping at home", bucket: "B10" },
  ],
  "6": [
    { value: "standing up for others", label: "Standing up for others", bucket: "B7a" },
    { value: "losing gracefully", label: "Losing gracefully", bucket: "B7b" },
    { value: "eating a rainbow", label: "Eating a rainbow", bucket: "B2" },
    { value: "dreams and nightmares", label: "Dreams and nightmares", bucket: "B1" },
    { value: "when friends fight", label: "When friends fight", bucket: "B4" },
    { value: "how things work", label: "How things work", bucket: "B3" },
    { value: "being responsible", label: "Being responsible", bucket: "B10" },
    { value: "different families", label: "Different families", bucket: "B12" },
    { value: "the new kid", label: "The new kid", bucket: "B4" },
    { value: "apologising properly", label: "Apologising properly", bucket: "B5" },
    { value: "plants and growing", label: "Plants and growing", bucket: "B3" },
    { value: "weekend with nana", label: "Weekend with Nana", bucket: "B12" },
  ],
  "7": [
    { value: "fairness and justice", label: "Fairness and justice", bucket: "B11" },
    { value: "trying when its hard", label: "Trying when it's hard", bucket: "B7b" },
    { value: "where food comes from", label: "Where food comes from", bucket: "B3" },
    { value: "worry at bedtime", label: "Worry at bedtime", bucket: "B1" },
    { value: "jealousy", label: "Jealousy", bucket: "B6" },
    { value: "science experiments", label: "Science experiments", bucket: "B3" },
    { value: "moving to a new place", label: "Moving to a new place", bucket: "B7a" },
    { value: "grandparent stories", label: "Grandparent stories", bucket: "B12" },
    { value: "keeping a secret vs telling", label: "Keeping a secret vs telling", bucket: "B8" },
    { value: "when i feel lonely", label: "When I feel lonely", bucket: "B6" },
    { value: "night sky and planets", label: "Night sky and planets", bucket: "B3" },
    { value: "pet care", label: "Pet care", bucket: "B10" },
  ],
  "8": [
    { value: "peer pressure", label: "Peer pressure", bucket: "B7a" },
    { value: "lying and its consequences", label: "Lying and its consequences", bucket: "B8" },
    { value: "body and food choices", label: "Body and food choices", bucket: "B2" },
    { value: "screen time at night", label: "Screen time at night", bucket: "B1" },
    { value: "bullying", label: "Bullying", bucket: "B7a" },
    { value: "how the world was made", label: "How the world was made", bucket: "B3" },
    { value: "failure and trying again", label: "Failure and trying again", bucket: "B7b" },
    { value: "working parents", label: "Working parents", bucket: "B12" },
    { value: "inclusion", label: "Inclusion", bucket: "B5" },
    { value: "mixed-up feelings", label: "Mixed-up feelings", bucket: "B6" },
    { value: "ancient civilisations", label: "Ancient civilisations", bucket: "B3" },
    { value: "traditions and culture", label: "Traditions and culture", bucket: "B12" },
  ],
  "9": [
    { value: "standing up to a friend", label: "Standing up to a friend", bucket: "B7a" },
    { value: "waste and environment", label: "Waste and environment", bucket: "B10" },
    { value: "sleep and performance", label: "Sleep and performance", bucket: "B1" },
    { value: "online kindness", label: "Online kindness", bucket: "B5" },
    { value: "grief and loss", label: "Grief and loss", bucket: "B6" },
    { value: "inventions and discoveries", label: "Inventions and discoveries", bucket: "B3" },
    { value: "identity and belonging", label: "Identity and belonging", bucket: "B9" },
    { value: "gender and stereotypes", label: "Gender and stereotypes", bucket: "B11" },
    { value: "anger management", label: "Anger management", bucket: "B6" },
    { value: "climate and responsibility", label: "Climate and responsibility", bucket: "B11" },
    { value: "distant family", label: "Distant family", bucket: "B12" },
    { value: "when adults are wrong", label: "When adults are wrong", bucket: "B7a" },
  ],
  "10": [
    { value: "ambition vs friendship", label: "Ambition vs friendship", bucket: "B11" },
    { value: "nutrition and growing", label: "Nutrition and growing", bucket: "B2" },
    { value: "stress and rest", label: "Stress and rest", bucket: "B1" },
    { value: "moral dilemmas", label: "Moral dilemmas", bucket: "B11" },
    { value: "social media pressure", label: "Social media pressure", bucket: "B6" },
    { value: "how money works", label: "How money works", bucket: "B3" },
    { value: "blended families", label: "Blended families", bucket: "B12" },
    { value: "environmental activism", label: "Environmental activism", bucket: "B11" },
    { value: "comparing yourself to others", label: "Comparing yourself to others", bucket: "B9" },
    { value: "cultural heritage", label: "Cultural heritage", bucket: "B12" },
    { value: "loyalty and honesty", label: "Loyalty and honesty", bucket: "B8" },
    { value: "becoming yourself", label: "Becoming yourself", bucket: "B9" },
  ],
};

// Flat lookup: exact theme value (lowercased) -> bucket. Built from THEMES_BY_AGE.
export const KNOWN_THEME_BUCKET: Record<string, BucketKey> = Object.fromEntries(
  Object.values(THEMES_BY_AGE).flat().map((t) => [t.value.toLowerCase(), t.bucket])
);

export const CUSTOM_THEME_VALUE = "__custom";

export function getThemeOptions(age: number | string): ThemeOption[] {
  const n = typeof age === "number" ? age : parseInt(String(age), 10);
  if (!Number.isFinite(n)) return [];
  return THEMES_BY_AGE[String(n)] ?? [];
}

// --- Keyword rules for FREE-TEXT themes (library + admin manual uploads). ---
// Order matters: first matching rule wins. Add new keywords here as new phrasings appear.
export const BUCKET_KEYWORDS: Array<{ bucket: BucketKey; keywords: string[] }> = [
  { bucket: "B1", keywords: ["sleep", "bedtime", "goodnight", "rest", "screen time at night", "stress and rest"] },
  { bucket: "B2", keywords: ["food", "eating", "nutrition", "lunchbox", "vegetable", "fruit", "body"] },
  { bucket: "B3", keywords: ["curio", "naming the world", "sensory", "science", "discover", "invention", "how things work", "nature"] },
  { bucket: "B4", keywords: ["sharing", "turn-taking", "turn taking", "waiting", "togetherness", "joining", "not always first", "credit", "cooperat"] },
  { bucket: "B5", keywords: ["empath", "kindness", "kind", "comfort", "gentle", "inclusion", "include", "noticing feelings", "softening the guard", "across difference"] },
  { bucket: "B6", keywords: ["big feeling", "calm down", "disappoint", "managing 'no'", "jealous", "jealousy", "missing someone", "grief", "loss", "anger", "lonely", "worry"] },
  { bucket: "B7a", keywords: ["brave", "bravery", "courage", "fear", "scared", "fright", "standing up", "peer pressure", "bully", "moral courage"] },
  { bucket: "B7b", keywords: ["persever", "persist", "patience", "patient", "try again", "frustration", "resilien", "setback", "instant skill", "finish"] },
  { bucket: "B8", keywords: ["honest", "honesty", "integrity", "truth", "lying", "lie", "promise", "loyal", "cheat", "own up", "confess"] },
  { bucket: "B9", keywords: ["autonomy", "do-it-myself", "do it myself", "self-worth", "self worth", "identity", "becoming yourself", "own value", "agency", "saying what you want", "asking for help"] },
  { bucket: "B10", keywords: ["responsib", "helping", "helper", "contribution", "trusted", "level-headed", "leadership", "pet care", "chore"] },
  { bucket: "B11", keywords: ["fairness", "fair", "unfair", "justice", "climate", "environment", "waste", "gender", "stereotype", "activism", "moral dilemma"] },
  { bucket: "B12", keywords: ["reunion", "object permanence", "belonging", "family", "sibling", "separation", "leaning on others", "distant family"] },
];

const FALLBACK_BUCKET: BucketKey = "B6"; // Big Feelings - safest generic default

/**
 * Resolve any story theme string to a bucket.
 * 1. Exact match against the known 108-theme catalog.
 * 2. Keyword scan for free text (library / admin uploads).
 * 3. Fallback bucket.
 */
export function resolveBucket(theme: string | null | undefined): BucketKey {
  if (!theme) return FALLBACK_BUCKET;
  const t = theme.trim().toLowerCase();
  if (KNOWN_THEME_BUCKET[t]) return KNOWN_THEME_BUCKET[t];
  for (const rule of BUCKET_KEYWORDS) {
    if (rule.keywords.some((kw) => t.includes(kw))) return rule.bucket;
  }
  return FALLBACK_BUCKET;
}
