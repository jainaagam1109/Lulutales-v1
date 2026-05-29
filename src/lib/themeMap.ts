// themeMap.ts
// Source of truth for story theme dropdowns and habit-bar mapping.
// Used in: PersonalisedStoryForm (dropdown), BedtimeStoryForm (dropdown),
//          Insights page (habit bar derivation).
//
// HABIT_BUCKETS — the 7 categories shown as progress bars on Insights.
// Each theme belongs to exactly one bucket. The bucket key is stored
// alongside the theme value so Insights can group without string-matching.
export type HabitBucket =
  | "healthy-eating"
  | "sleep-calm"
  | "sharing-kindness"
  | "courage-resilience"
  | "curiosity-learning"
  | "emotions-empathy"
  | "family-belonging";

export const HABIT_BUCKET_LABELS: Record<HabitBucket, string> = {
  "healthy-eating":     "Healthy eating",
  "sleep-calm":         "Sleep & calm",
  "sharing-kindness":   "Sharing & kindness",
  "courage-resilience": "Courage & resilience",
  "curiosity-learning": "Curiosity & learning",
  "emotions-empathy":   "Emotions & empathy",
  "family-belonging":   "Family & belonging",
};

export interface ThemeOption {
  value: string;
  label: string;
  habit: HabitBucket;
}

export const THEMES_BY_AGE: Record<string, ThemeOption[]> = {
  "2": [
    { value: "saying goodnight",   label: "Saying goodnight",    habit: "sleep-calm" },
    { value: "sharing toys",       label: "Sharing toys",         habit: "sharing-kindness" },
    { value: "eating vegetables",  label: "Eating vegetables",    habit: "healthy-eating" },
    { value: "feeling scared",     label: "Feeling scared",       habit: "emotions-empathy" },
    { value: "bath time fun",      label: "Bath time fun",        habit: "sleep-calm" },
    { value: "hugging mamma",      label: "Hugging Mamma",        habit: "family-belonging" },
    { value: "my first friend",    label: "My first friend",      habit: "sharing-kindness" },
    { value: "finding colours",    label: "Finding colours",      habit: "curiosity-learning" },
    { value: "baby animals",       label: "Baby animals",         habit: "curiosity-learning" },
    { value: "oops i spilled",     label: "Oops, I spilled!",     habit: "emotions-empathy" },
    { value: "one more bite",      label: "One more bite",        habit: "healthy-eating" },
    { value: "sleepy train",       label: "Sleepy train",         habit: "sleep-calm" },
  ],
  "3": [
    { value: "taking turns",       label: "Taking turns",         habit: "sharing-kindness" },
    { value: "fruits are yummy",   label: "Fruits are yummy",     habit: "healthy-eating" },
    { value: "bedtime monsters",   label: "Bedtime monsters",     habit: "sleep-calm" },
    { value: "i feel angry",       label: "I feel angry",         habit: "emotions-empathy" },
    { value: "new baby sibling",   label: "New baby sibling",     habit: "family-belonging" },
    { value: "why is the sky blue",label: "Why is the sky blue?", habit: "curiosity-learning" },
    { value: "being brave",        label: "Being brave",          habit: "courage-resilience" },
    { value: "i can do it myself", label: "I can do it myself",   habit: "courage-resilience" },
    { value: "saying sorry",       label: "Saying sorry",         habit: "sharing-kindness" },
    { value: "papa comes home",    label: "Papa comes home",      habit: "family-belonging" },
    { value: "rain and puddles",   label: "Rain and puddles",     habit: "curiosity-learning" },
    { value: "quiet time",         label: "Quiet time",           habit: "sleep-calm" },
  ],
  "4": [
    { value: "first day of school",  label: "First day of school",  habit: "courage-resilience" },
    { value: "making a new friend",  label: "Making a new friend",  habit: "sharing-kindness" },
    { value: "healthy lunchbox",     label: "Healthy lunchbox",     habit: "healthy-eating" },
    { value: "bedtime and stars",    label: "Bedtime and stars",    habit: "sleep-calm" },
    { value: "feeling left out",     label: "Feeling left out",     habit: "emotions-empathy" },
    { value: "bugs and butterflies", label: "Bugs and butterflies", habit: "curiosity-learning" },
    { value: "grandmas house",       label: "Grandma's house",      habit: "family-belonging" },
    { value: "being honest",         label: "Being honest",         habit: "sharing-kindness" },
    { value: "i fell down",          label: "I fell down",          habit: "courage-resilience" },
    { value: "mixing colours",       label: "Mixing colours",       habit: "curiosity-learning" },
    { value: "missing mamma",        label: "Missing Mamma",        habit: "emotions-empathy" },
    { value: "try one more time",    label: "Try one more time",    habit: "courage-resilience" },
  ],
  "5": [
    { value: "friendship",              label: "Friendship",               habit: "sharing-kindness" },
    { value: "courage",                 label: "Courage",                  habit: "courage-resilience" },
    { value: "healthy eating",          label: "Healthy eating",           habit: "healthy-eating" },
    { value: "sleep routine",           label: "Sleep routine",            habit: "sleep-calm" },
    { value: "sharing",                 label: "Sharing",                  habit: "sharing-kindness" },
    { value: "kindness",                label: "Kindness",                 habit: "sharing-kindness" },
    { value: "curiosity",               label: "Curiosity",                habit: "curiosity-learning" },
    { value: "family love",             label: "Family love",              habit: "family-belonging" },
    { value: "understanding feelings",  label: "Understanding feelings",   habit: "emotions-empathy" },
    { value: "trying new things",       label: "Trying new things",        habit: "courage-resilience" },
    { value: "nature and seasons",      label: "Nature and seasons",       habit: "curiosity-learning" },
    { value: "helping at home",         label: "Helping at home",          habit: "family-belonging" },
  ],
  "6": [
    { value: "standing up for others",  label: "Standing up for others",  habit: "sharing-kindness" },
    { value: "losing gracefully",       label: "Losing gracefully",        habit: "courage-resilience" },
    { value: "eating a rainbow",        label: "Eating a rainbow",         habit: "healthy-eating" },
    { value: "dreams and nightmares",   label: "Dreams and nightmares",    habit: "sleep-calm" },
    { value: "when friends fight",      label: "When friends fight",       habit: "emotions-empathy" },
    { value: "how things work",         label: "How things work",          habit: "curiosity-learning" },
    { value: "being responsible",       label: "Being responsible",        habit: "courage-resilience" },
    { value: "different families",      label: "Different families",       habit: "family-belonging" },
    { value: "the new kid",             label: "The new kid",              habit: "sharing-kindness" },
    { value: "apologising properly",    label: "Apologising properly",     habit: "emotions-empathy" },
    { value: "plants and growing",      label: "Plants and growing",       habit: "curiosity-learning" },
    { value: "weekend with nana",       label: "Weekend with Nana",        habit: "family-belonging" },
  ],
  "7": [
    { value: "fairness and justice",    label: "Fairness and justice",     habit: "sharing-kindness" },
    { value: "trying when its hard",    label: "Trying when it's hard",    habit: "courage-resilience" },
    { value: "where food comes from",   label: "Where food comes from",    habit: "healthy-eating" },
    { value: "worry at bedtime",        label: "Worry at bedtime",         habit: "sleep-calm" },
    { value: "jealousy",                label: "Jealousy",                 habit: "emotions-empathy" },
    { value: "science experiments",     label: "Science experiments",      habit: "curiosity-learning" },
    { value: "moving to a new place",   label: "Moving to a new place",    habit: "courage-resilience" },
    { value: "grandparent stories",     label: "Grandparent stories",      habit: "family-belonging" },
    { value: "keeping vs telling",      label: "Keeping a secret vs telling", habit: "sharing-kindness" },
    { value: "when i feel lonely",      label: "When I feel lonely",       habit: "emotions-empathy" },
    { value: "night sky and planets",   label: "Night sky and planets",    habit: "curiosity-learning" },
    { value: "pet care",                label: "Pet care",                 habit: "family-belonging" },
  ],
  "8": [
    { value: "peer pressure",            label: "Peer pressure",            habit: "courage-resilience" },
    { value: "lying and consequences",   label: "Lying and its consequences",habit: "sharing-kindness" },
    { value: "body and food choices",    label: "Body and food choices",    habit: "healthy-eating" },
    { value: "screen time at night",     label: "Screen time at night",     habit: "sleep-calm" },
    { value: "bullying",                 label: "Bullying",                 habit: "emotions-empathy" },
    { value: "how the world was made",   label: "How the world was made",   habit: "curiosity-learning" },
    { value: "failure and trying again", label: "Failure and trying again", habit: "courage-resilience" },
    { value: "working parents",          label: "Working parents",          habit: "family-belonging" },
    { value: "inclusion",                label: "Inclusion",                habit: "sharing-kindness" },
    { value: "mixed-up feelings",        label: "Mixed-up feelings",        habit: "emotions-empathy" },
    { value: "ancient civilisations",    label: "Ancient civilisations",    habit: "curiosity-learning" },
    { value: "traditions and culture",   label: "Traditions and culture",   habit: "family-belonging" },
  ],
  "9": [
    { value: "standing up to a friend",  label: "Standing up to a friend", habit: "courage-resilience" },
    { value: "waste and environment",    label: "Waste and environment",    habit: "healthy-eating" },
    { value: "sleep and performance",    label: "Sleep and performance",    habit: "sleep-calm" },
    { value: "online kindness",          label: "Online kindness",          habit: "sharing-kindness" },
    { value: "grief and loss",           label: "Grief and loss",           habit: "emotions-empathy" },
    { value: "inventions and discoveries",label:"Inventions and discoveries",habit: "curiosity-learning" },
    { value: "identity and belonging",   label: "Identity and belonging",   habit: "family-belonging" },
    { value: "gender and stereotypes",   label: "Gender and stereotypes",   habit: "sharing-kindness" },
    { value: "anger management",         label: "Anger management",         habit: "emotions-empathy" },
    { value: "climate and responsibility",label:"Climate and responsibility",habit: "curiosity-learning" },
    { value: "distant family",           label: "Distant family",           habit: "family-belonging" },
    { value: "when adults are wrong",    label: "When adults are wrong",    habit: "courage-resilience" },
  ],
  "10": [
    { value: "ambition vs friendship",   label: "Ambition vs friendship",   habit: "sharing-kindness" },
    { value: "nutrition and growing",    label: "Nutrition and growing",    habit: "healthy-eating" },
    { value: "stress and rest",          label: "Stress and rest",          habit: "sleep-calm" },
    { value: "moral dilemmas",           label: "Moral dilemmas",           habit: "courage-resilience" },
    { value: "social media pressure",    label: "Social media pressure",    habit: "emotions-empathy" },
    { value: "how money works",          label: "How money works",          habit: "curiosity-learning" },
    { value: "blended families",         label: "Blended families",         habit: "family-belonging" },
    { value: "environmental activism",   label: "Environmental activism",   habit: "curiosity-learning" },
    { value: "comparing yourself",       label: "Comparing yourself to others", habit: "emotions-empathy" },
    { value: "cultural heritage",        label: "Cultural heritage",        habit: "family-belonging" },
    { value: "loyalty and honesty",      label: "Loyalty and honesty",      habit: "sharing-kindness" },
    { value: "becoming yourself",        label: "Becoming yourself",        habit: "courage-resilience" },
  ],
};
