export type BucketMeta = { badgeLabel: string; emoji: string };

export const BUCKET_CONFIG: Record<string, BucketMeta> = {
  "Courage & Bravery": { badgeLabel: "Brave Heart", emoji: "🦁" },
  "Self-Worth & Resilience": { badgeLabel: "Bounce-Back Star", emoji: "🌟" },
  "Frustration Tolerance & Persistence": { badgeLabel: "Never Gives Up", emoji: "🧗" },
  "Empathy & Kindness": { badgeLabel: "Kindness Keeper", emoji: "💛" },
  "Sharing, Turn-Taking & Fairness": { badgeLabel: "Fair & Sharing", emoji: "🤝" },
  "Belonging & Friendship": { badgeLabel: "True Friend", emoji: "👫" },
  "Emotions & Feelings": { badgeLabel: "Feelings Explorer", emoji: "🎭" },
  "Sleep & Calm": { badgeLabel: "Calm & Cosy", emoji: "🌙" },
  "Healthy Habits": { badgeLabel: "Healthy Hero", emoji: "🥗" },
  "Curiosity & Learning": { badgeLabel: "Little Explorer", emoji: "🔭" },
  "Doing the Right Thing": { badgeLabel: "Good Compass", emoji: "🧭" },
  "Caring for the Planet": { badgeLabel: "Earth Guardian", emoji: "🌍" },
  "Identity & Culture": { badgeLabel: "Proud Roots", emoji: "🌳" },
};

export const getBucketMeta = (bucket: string): BucketMeta =>
  BUCKET_CONFIG[bucket] ?? { badgeLabel: bucket, emoji: "🎨" };
