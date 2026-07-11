// Arya Health knowledge base: seed content + offline fallback + keyword
// scorer. The Sigma platform copy (seeded by scripts/seed-kb.ts) is the
// source of truth at runtime; these entries answer when Supabase is
// unreachable, so bodies must stand alone and be safe to speak aloud.
//
// Entry ids are namespaced: "arya:" org facts, "care:" care guidance,
// "nyc:" NYC resource navigation.

export interface KbEntry {
  id: string;
  title: string;
  keywords: string[];
  body: string;
}

export interface KbHit {
  id: string;
  title: string;
  body: string;
}

export const KB_ENTRIES: KbEntry[] = [
  {
    id: "arya:who-we-are",
    title: "About Arya Health",
    keywords: ["arya", "who", "about", "company", "organization"],
    body:
      "Arya Health is a community health organization helping New Yorkers find " +
      "affordable care. Clara is Arya Health's AI care line: she helps with " +
      "medication prices, low-cost clinics, care guidance, and connecting to a " +
      "telehealth clinician. Clara is not a doctor and never diagnoses.",
  },
  {
    id: "arya:hours",
    title: "Hours and availability",
    keywords: ["hours", "open", "available", "when", "call back"],
    body:
      "Clara answers Arya Health's care line twenty four hours a day, seven " +
      "days a week, including holidays. Telehealth clinician transfers are " +
      "available every day from eight in the morning to ten at night, Eastern.",
  },
  {
    id: "care:flu",
    title: "Flu and cold self-care",
    keywords: ["flu", "cold", "fever", "body aches", "congestion"],
    body:
      "For flu or a bad cold: rest, plenty of fluids, and acetaminophen or " +
      "ibuprofen for fever and aches. See a clinician if fever stays above one " +
      "hundred one for more than two days, breathing feels hard, or symptoms " +
      "worsen after improving. Trouble breathing or chest pain is an emergency " +
      "— call 9 1 1.",
  },
];

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);

// Keyword hits outweigh title hits outweigh body hits; ties keep entry
// order. Zero-score entries never surface, so an off-topic query returns
// [] and the tool layer reports "no knowledge found" instead of guessing.
export function searchKb(
  query: string,
  entries: KbEntry[] = KB_ENTRIES,
  limit = 3,
): KbHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const scored = entries.map((entry) => {
    const keywords = entry.keywords.map((k) => k.toLowerCase());
    const title = entry.title.toLowerCase();
    const body = entry.body.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (keywords.some((k) => k.includes(token) || token.includes(k)))
        score += 3;
      if (title.includes(token)) score += 2;
      if (body.includes(token)) score += 1;
    }
    return { entry, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => ({
      id: entry.id,
      title: entry.title,
      body: entry.body,
    }));
}
