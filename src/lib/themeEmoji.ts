// Theme → emoji + background colour mapping.
// Source: design spec (theme_emoji_map.html). Keyed by normalised label.

export type ThemeVisual = { emoji: string; bg: string; music: string };

const RAW: Array<{ label: string; emoji: string; bg: string; music: string }> = [
  // Age 2
  { label: "Saying goodnight", emoji: "🌙", bg: "#EEF0FF", music: "drone_gentle" },
  { label: "Sharing toys", emoji: "🧸", bg: "#FFF4EA", music: "acoustic_warm" },
  { label: "Eating vegetables", emoji: "🥦", bg: "#EEFAF3", music: "playful_light" },
  { label: "Feeling scared", emoji: "🫶", bg: "#FFF0F5", music: "tender_ambient" },
  { label: "Bath time fun", emoji: "🛁", bg: "#E6F6FF", music: "playful_light" },
  { label: "Hugging Mamma", emoji: "🤗", bg: "#FFF5F0", music: "tender_ambient" },
  { label: "My first friend", emoji: "🤝", bg: "#E8F1FF", music: "acoustic_warm" },
  { label: "Finding colours", emoji: "🌈", bg: "#FFF9E8", music: "playful_light" },
  { label: "Baby animals", emoji: "🐣", bg: "#EEFAF3", music: "playful_light" },
  { label: "Oops, I spilled!", emoji: "💧", bg: "#E6F6FF", music: "playful_light" },
  { label: "One more bite", emoji: "🍓", bg: "#FFF0F5", music: "playful_light" },
  { label: "Sleepy train", emoji: "🚂", bg: "#F0EEFF", music: "drone_gentle" },
  // Age 3
  { label: "Taking turns", emoji: "🔄", bg: "#E8F1FF", music: "acoustic_warm" },
  { label: "Fruits are yummy", emoji: "🍉", bg: "#EEFAF3", music: "playful_light" },
  { label: "Bedtime monsters", emoji: "👾", bg: "#F0EEFF", music: "drone_gentle" },
  { label: "I feel angry", emoji: "😤", bg: "#FFF4EA", music: "piano_minimal" },
  { label: "New baby sibling", emoji: "👶", bg: "#FFF0F5", music: "tender_ambient" },
  { label: "Why is the sky blue?", emoji: "☁️", bg: "#E6F6FF", music: "acoustic_bright" },
  { label: "Being brave", emoji: "⚡", bg: "#FFF4EA", music: "strings_soft" },
  { label: "I can do it myself", emoji: "💪", bg: "#EEFAF3", music: "strings_soft" },
  { label: "Saying sorry", emoji: "🙏", bg: "#FFF9EE", music: "piano_minimal" },
  { label: "Papa comes home", emoji: "🏡", bg: "#FFF0F5", music: "tender_ambient" },
  { label: "Rain and puddles", emoji: "🌧️", bg: "#E6F6FF", music: "rain_ambient" },
  { label: "Quiet time", emoji: "🤫", bg: "#F0EEFF", music: "drone_gentle" },
  // Age 4
  { label: "First day of school", emoji: "🎒", bg: "#E8F1FF", music: "gentle_hopeful" },
  { label: "Making a new friend", emoji: "🤝", bg: "#E8F1FF", music: "acoustic_warm" },
  { label: "Healthy lunchbox", emoji: "🥗", bg: "#EEFAF3", music: "playful_light" },
  { label: "Bedtime and stars", emoji: "⭐", bg: "#F0EEFF", music: "drone_gentle" },
  { label: "Feeling left out", emoji: "🫂", bg: "#FFF0F5", music: "tender_ambient" },
  { label: "Bugs and butterflies", emoji: "🦋", bg: "#EEFAF3", music: "acoustic_bright" },
  { label: "Grandma's house", emoji: "🏡", bg: "#FFF9EE", music: "tender_ambient" },
  { label: "Being honest", emoji: "🪞", bg: "#FFF9EE", music: "piano_minimal" },
  { label: "I fell down", emoji: "🌱", bg: "#EEFAF3", music: "strings_soft" },
  { label: "Mixing colours", emoji: "🎨", bg: "#FFF4EA", music: "playful_light" },
  { label: "Missing Mamma", emoji: "💛", bg: "#FFF0F5", music: "tender_ambient" },
  { label: "Try one more time", emoji: "🏅", bg: "#FFF4EA", music: "strings_soft" },
  // Age 5
  { label: "Friendship", emoji: "🤝", bg: "#E8F1FF", music: "acoustic_warm" },
  { label: "Courage", emoji: "⚡", bg: "#FFF4EA", music: "strings_soft" },
  { label: "Healthy eating", emoji: "🥗", bg: "#EEFAF3", music: "playful_light" },
  { label: "Sleep routine", emoji: "🌙", bg: "#F0EEFF", music: "drone_gentle" },
  { label: "Sharing", emoji: "🎁", bg: "#EEFAF3", music: "acoustic_warm" },
  { label: "Kindness", emoji: "💛", bg: "#FFFBE8", music: "acoustic_warm" },
  { label: "Curiosity", emoji: "🔭", bg: "#E6F6FF", music: "acoustic_bright" },
  { label: "Family love", emoji: "🏡", bg: "#FFF0F5", music: "tender_ambient" },
  { label: "Understanding feelings", emoji: "🫶", bg: "#FFF0F5", music: "piano_minimal" },
  { label: "Trying new things", emoji: "🌱", bg: "#EEFAF3", music: "strings_soft" },
  { label: "Nature and seasons", emoji: "🍃", bg: "#EEFAF3", music: "acoustic_bright" },
  { label: "Helping at home", emoji: "🧹", bg: "#FFF9EE", music: "acoustic_warm" },
  // Age 6
  { label: "Standing up for others", emoji: "🦁", bg: "#FFF4EA", music: "strings_soft" },
  { label: "Losing gracefully", emoji: "🏆", bg: "#FFF9EE", music: "piano_minimal" },
  { label: "Eating a rainbow", emoji: "🌈", bg: "#EEFAF3", music: "playful_light" },
  { label: "Dreams and nightmares", emoji: "💭", bg: "#F0EEFF", music: "drone_gentle" },
  { label: "When friends fight", emoji: "🤝", bg: "#E8F1FF", music: "piano_minimal" },
  { label: "How things work", emoji: "⚙️", bg: "#E6F6FF", music: "acoustic_bright" },
  { label: "Being responsible", emoji: "✅", bg: "#EEFAF3", music: "acoustic_warm" },
  { label: "Different families", emoji: "👨‍👩‍👧", bg: "#FFF0F5", music: "tender_ambient" },
  { label: "The new kid", emoji: "🎒", bg: "#E8F1FF", music: "gentle_hopeful" },
  { label: "Apologising properly", emoji: "🙏", bg: "#FFF9EE", music: "piano_minimal" },
  { label: "Plants and growing", emoji: "🌿", bg: "#EEFAF3", music: "acoustic_bright" },
  { label: "Weekend with Nana", emoji: "👵", bg: "#FFF9EE", music: "tender_ambient" },
  // Age 7
  { label: "Fairness and justice", emoji: "⚖️", bg: "#E6F6FF", music: "piano_minimal" },
  { label: "Trying when it's hard", emoji: "🏅", bg: "#FFF4EA", music: "strings_soft" },
  { label: "Where food comes from", emoji: "🌾", bg: "#EEFAF3", music: "acoustic_bright" },
  { label: "Worry at bedtime", emoji: "🌙", bg: "#F0EEFF", music: "drone_gentle" },
  { label: "Jealousy", emoji: "💚", bg: "#EEFAF3", music: "piano_minimal" },
  { label: "Science experiments", emoji: "🔬", bg: "#E6F6FF", music: "acoustic_bright" },
  { label: "Moving to a new place", emoji: "📦", bg: "#FFF9EE", music: "tender_ambient" },
  { label: "Grandparent stories", emoji: "👴", bg: "#FFF9EE", music: "tender_ambient" },
  { label: "Keeping a secret vs telling", emoji: "🤐", bg: "#FFF4EA", music: "piano_minimal" },
  { label: "When I feel lonely", emoji: "🫂", bg: "#FFF0F5", music: "tender_ambient" },
  { label: "Night sky and planets", emoji: "🪐", bg: "#F0EEFF", music: "drone_gentle" },
  { label: "Pet care", emoji: "🐾", bg: "#EEFAF3", music: "acoustic_warm" },
  // Age 8
  { label: "Peer pressure", emoji: "🧭", bg: "#FFF4EA", music: "strings_soft" },
  { label: "Lying and its consequences", emoji: "🪞", bg: "#FFF9EE", music: "piano_minimal" },
  { label: "Body and food choices", emoji: "🥗", bg: "#EEFAF3", music: "playful_light" },
  { label: "Screen time at night", emoji: "📵", bg: "#F0EEFF", music: "drone_gentle" },
  { label: "Bullying", emoji: "🦁", bg: "#FFF4EA", music: "strings_soft" },
  { label: "How the world was made", emoji: "🌍", bg: "#E6F6FF", music: "acoustic_bright" },
  { label: "Failure and trying again", emoji: "🌱", bg: "#EEFAF3", music: "strings_soft" },
  { label: "Working parents", emoji: "💼", bg: "#FFF9EE", music: "tender_ambient" },
  { label: "Inclusion", emoji: "🫂", bg: "#E8F1FF", music: "acoustic_warm" },
  { label: "Mixed-up feelings", emoji: "🌀", bg: "#FFF0F5", music: "piano_minimal" },
  { label: "Ancient civilisations", emoji: "🏛️", bg: "#FFF9EE", music: "acoustic_bright" },
  { label: "Traditions and culture", emoji: "🪔", bg: "#FFF4EA", music: "classical_soft" },
  // Age 9
  { label: "Standing up to a friend", emoji: "🦁", bg: "#FFF4EA", music: "strings_soft" },
  { label: "Waste and environment", emoji: "♻️", bg: "#EEFAF3", music: "acoustic_bright" },
  { label: "Sleep and performance", emoji: "🌙", bg: "#F0EEFF", music: "drone_gentle" },
  { label: "Online kindness", emoji: "💛", bg: "#FFFBE8", music: "acoustic_warm" },
  { label: "Grief and loss", emoji: "🕊️", bg: "#FFF0F5", music: "tender_ambient" },
  { label: "Inventions and discoveries", emoji: "💡", bg: "#E6F6FF", music: "acoustic_bright" },
  { label: "Identity and belonging", emoji: "🫂", bg: "#E8F1FF", music: "tender_ambient" },
  { label: "Gender and stereotypes", emoji: "🌈", bg: "#FFF0F5", music: "tender_ambient" },
  { label: "Anger management", emoji: "🌊", bg: "#E6F6FF", music: "piano_minimal" },
  { label: "Climate and responsibility", emoji: "🌍", bg: "#EEFAF3", music: "acoustic_bright" },
  { label: "Distant family", emoji: "✉️", bg: "#FFF9EE", music: "tender_ambient" },
  { label: "When adults are wrong", emoji: "⚖️", bg: "#FFF4EA", music: "piano_minimal" },
  // Age 10
  { label: "Ambition vs friendship", emoji: "🤝", bg: "#E8F1FF", music: "piano_minimal" },
  { label: "Nutrition and growing", emoji: "🥗", bg: "#EEFAF3", music: "playful_light" },
  { label: "Stress and rest", emoji: "🌿", bg: "#F0EEFF", music: "drone_gentle" },
  { label: "Moral dilemmas", emoji: "⚖️", bg: "#FFF4EA", music: "piano_minimal" },
  { label: "Social media pressure", emoji: "📱", bg: "#F0EEFF", music: "piano_minimal" },
  { label: "How money works", emoji: "🪙", bg: "#FFF9EE", music: "acoustic_warm" },
  { label: "Blended families", emoji: "🏡", bg: "#FFF0F5", music: "tender_ambient" },
  { label: "Environmental activism", emoji: "🌍", bg: "#EEFAF3", music: "acoustic_bright" },
  { label: "Comparing yourself to others", emoji: "🪞", bg: "#FFF9EE", music: "piano_minimal" },
  { label: "Cultural heritage", emoji: "🪔", bg: "#FFF4EA", music: "classical_soft" },
  { label: "Loyalty and honesty", emoji: "🤝", bg: "#E8F1FF", music: "acoustic_warm" },
  { label: "Becoming yourself", emoji: "🌱", bg: "#EEFAF3", music: "strings_soft" },
];

export const DEFAULT_THEME_VISUAL: ThemeVisual = {
  emoji: "📖",
  bg: "#F3F8FF",
  music: "acoustic_warm",
};

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const MAP = new Map<string, ThemeVisual>();
for (const t of RAW) {
  MAP.set(normalise(t.label), { emoji: t.emoji, bg: t.bg, music: t.music });
}

export function getThemeVisual(theme?: string | null): ThemeVisual {
  if (!theme) return DEFAULT_THEME_VISUAL;
  return MAP.get(normalise(theme)) ?? DEFAULT_THEME_VISUAL;
}
