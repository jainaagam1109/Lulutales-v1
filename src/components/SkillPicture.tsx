import { SKILL_ART } from "@/lib/skillArt";
import { resolveBucket } from "@/lib/themeCatalog";

/** Pick the skill key for a story: its bucket_key, else resolved from its theme. */
export const skillKeyFor = (story: { bucket_key?: string | null; theme?: string | null } | null | undefined): string => {
  const k = story?.bucket_key ?? resolveBucket(story?.theme ?? null) ?? null;
  return k && SKILL_ART[k] ? k : "B7a";
};

/** The LuluTales story picture for a skill. Fills its box; the subject stays centred. */
export const SkillPicture = ({
  skill,
  className = "",
  rounded = "",
}: {
  skill: string;
  className?: string;
  rounded?: string;
}) => {
  const a = SKILL_ART[skill] ?? SKILL_ART["B7a"];
  return (
    <svg
      viewBox="0 0 240 150"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`block h-full w-full ${rounded} ${className}`}
      style={{ background: a.bg }}
      dangerouslySetInnerHTML={{ __html: `<rect width="240" height="150" fill="${a.bg}"></rect>${a.art}` }}
    />
  );
};

export default SkillPicture;
