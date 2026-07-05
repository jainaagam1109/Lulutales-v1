export type ChildGender = string | null | undefined;

/**
 * Returns pronouns for a child. Only uses gendered pronouns when the
 * profile has gender explicitly set to Boy or Girl; otherwise defaults
 * to singular they/them/their.
 */
export const pronounsFor = (gender: ChildGender) => {
  const g = (gender ?? "").trim().toLowerCase();
  if (g === "girl" || g === "female" || g === "f") {
    return { subject: "she", object: "her", possessive: "her", reflexive: "herself" };
  }
  if (g === "boy" || g === "male" || g === "m") {
    return { subject: "he", object: "him", possessive: "his", reflexive: "himself" };
  }
  return { subject: "they", object: "them", possessive: "their", reflexive: "themselves" };
};
