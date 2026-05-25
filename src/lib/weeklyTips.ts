// Weekly parenting tips, rotated by ISO week number.

export const WEEKLY_TIPS: string[] = [
  "Children who hear stories daily develop vocabularies up to 1.4 million words larger by age 5.",
  "Reading or listening to stories before bed lowers cortisol and helps kids fall asleep up to 20 minutes faster.",
  "Kids learn empathy more from characters in stories than from being told to 'be kind'.",
  "A 10-minute story shared with a parent activates the same bonding hormones as a long hug.",
  "Children remember lessons wrapped in stories 22x more than facts told directly.",
  "Naming feelings in a story ('he felt nervous') helps children name their own emotions.",
  "Repetition isn't boring — re-hearing the same story builds a child's sense of safety and mastery.",
  "Kids who 'finish the story' in their head develop stronger problem-solving skills.",
  "Audio stories build listening stamina — a skill that predicts reading comprehension years later.",
  "Talking about a story afterwards doubles what your child remembers and learns from it.",
  "Children process big feelings (fear, jealousy, change) more safely through characters than conversation.",
  "A predictable story routine acts like an anchor — it helps kids transition from busy day to calm night.",
  "Asking 'what would you have done?' after a story builds critical thinking and moral reasoning.",
  "Stories with diverse characters expand a child's idea of who they can become.",
  "Just 15 minutes of shared story time a day is linked to better focus at school.",
  "Children who hear stories about mistakes and recovery develop more resilience.",
  "Imagination time isn't a break from learning — it's the foundation of creative thinking.",
  "Bedtime stories help kids practice sequencing — a core skill behind math and writing.",
  "When kids hear stories about kindness, they're measurably more likely to share the next day.",
  "Stories that name body cues ('her tummy felt funny') help children build self-awareness.",
  "Calm, slow-paced audio before sleep helps regulate a child's nervous system.",
  "Hearing a parent's voice — even recorded — releases oxytocin and lowers stress in young children.",
  "Children naturally borrow language from stories — rich words today become their words tomorrow.",
  "A short daily story habit is one of the strongest predictors of lifelong reading enjoyment.",
  "Stories with gentle problem-solving help children rehearse handling real-life challenges.",
  "Hearing about courage in characters helps kids try slightly harder things themselves.",
  "Quiet listening time builds the same brain networks as meditation — even in young kids.",
  "Children who hear stories regularly score higher on empathy tests by age 6.",
  "A bedtime story isn't just a routine — it's micro-therapy your child looks forward to.",
  "Letting kids choose tonight's story builds autonomy and confidence in small, safe ways.",
  "Stories about friendship rehearse the exact social skills kids need at school.",
  "Imagining a calm place — like a story setting — helps children self-soothe in the real world.",
  "Children retain values longer when they're modelled by characters they love.",
  "Short, gentle stories work better than long ones for processing a hard day.",
  "Stories help kids practice patience — waiting to see what happens next is its own skill.",
  "Hearing the same story across weeks helps children notice new details as their minds grow.",
  "A story shared today becomes a memory your child carries for decades.",
  "Children who hear stories about emotions handle frustration better than peers who don't.",
  "Audio stories give kids screen-light wind-down time their growing brains need.",
  "The pause before the climax of a story builds your child's anticipation and attention span.",
  "Stories about helping others quietly teach generosity better than reminders ever can.",
  "Listening to stories side by side, without screens, is one of the rarest forms of modern connection.",
  "Children who hear stories regularly are more comfortable with quiet — a gift in a noisy world.",
  "A weekly 'story about you' helps children build a positive inner narrative about themselves.",
  "Stories featuring characters who try, fail, and try again teach growth mindset effortlessly.",
  "Just hearing the words 'once upon a time' lowers heart rate in young children — they're built for stories.",
  "Children who hear a variety of voices in stories develop better language flexibility.",
  "Story time done with calm pacing teaches kids that slowness can feel safe and good.",
  "Hearing stories about new places expands a child's sense of the world long before they travel.",
  "A nightly story is the simplest, most evidence-backed habit for raising a confident reader.",
  "Stories with a clear beginning, middle, and end help children organise their own thoughts.",
  "Hearing themes of forgiveness in stories helps children let go of small upsets faster.",
];

// ISO 8601 week number (1..53)
export const getIsoWeek = (date: Date = new Date()): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export const getWeeklyTip = (date: Date = new Date()): { week: number; tip: string } => {
  const week = getIsoWeek(date);
  const tip = WEEKLY_TIPS[(week - 1 + WEEKLY_TIPS.length * 100) % WEEKLY_TIPS.length];
  return { week, tip };
};
