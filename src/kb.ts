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
  // --- arya: org facts ---
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
      "available every day from eight each morning until ten each night, Eastern.",
  },
  {
    id: "arya:cost",
    title: "Cost of calling Clara",
    keywords: ["cost", "price", "free", "insurance", "sliding scale", "afford"],
    body:
      "Calling Clara is completely free, no matter your insurance status. If " +
      "Clara connects you to a clinic, those visits are offered on a sliding " +
      "scale based on your ability to pay, and no insurance is required to " +
      "be seen. Arya Health never charges for this call.",
  },
  {
    id: "arya:telehealth",
    title: "Talking to a live telehealth clinician",
    keywords: [
      "telehealth",
      "doctor",
      "nurse",
      "live",
      "transfer",
      "talk to someone",
    ],
    body:
      "If you'd like to speak with a real clinician, Clara can offer a warm " +
      "transfer right on this same call once you agree. A licensed telehealth " +
      "clinician is available every day from eight each morning until ten " +
      "each night, Eastern, to review your symptoms and next steps.",
  },
  {
    id: "arya:coverage",
    title: "Where Arya Health serves",
    keywords: [
      "borough",
      "area",
      "location",
      "nyc",
      "coverage",
      "queens",
      "brooklyn",
    ],
    body:
      "Arya Health serves all five New York City boroughs, including Manhattan, " +
      "Brooklyn, Queens, Bronx, and Staten Island. Wherever you're calling from " +
      "across this city, Clara can help you find nearby low-cost clinics and " +
      "connect you with local resources.",
  },
  {
    id: "arya:privacy",
    title: "Privacy and call recording",
    keywords: [
      "privacy",
      "recorded",
      "transcribed",
      "data",
      "delete",
      "confidential",
    ],
    body:
      "Calls with Clara are recorded and transcribed to help improve your care " +
      "and keep an accurate record for your clinicians. Arya Health never " +
      "sells your information. If you'd like your call history deleted, just " +
      "ask Clara and she'll start that process for you.",
  },
  {
    id: "arya:not-a-doctor",
    title: "Role and limits of Clara",
    keywords: [
      "doctor",
      "diagnose",
      "prescribe",
      "emergency",
      "not a doctor",
      "medical advice",
    ],
    body:
      "Clara is not a doctor. She never diagnoses conditions or prescribes " +
      "medication, but she can help you understand your options and find " +
      "good care. If this is a medical emergency, hang up and call 9 1 1. " +
      "If you're in a mental health crisis, call or text 9 8 8.",
  },

  // --- care: care guidance ---
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
  {
    id: "care:uti",
    title: "Urinary tract infection (UTI) self-care",
    keywords: ["uti", "burning", "pee", "urination", "bladder", "urinary"],
    body:
      "For mild burning or urgency, drink plenty of water and avoid caffeine " +
      "and alcohol. A nonprescription pain reliever like acetaminophen can " +
      "ease discomfort — check its label for dosing. Most UTIs need " +
      "antibiotics, so see a clinician within a day or two. Fever or back " +
      "pain along with UTI symptoms can mean a kidney infection — see a " +
      "clinician urgently.",
  },
  {
    id: "care:migraine",
    title: "Migraine self-care",
    keywords: [
      "migraine",
      "headache",
      "head pain",
      "light sensitivity",
      "nausea",
    ],
    body:
      "For a typical migraine, rest in a dark, quiet room, stay hydrated, and " +
      "use a nonprescription pain reliever as its label directs. Ice on your " +
      "neck or forehead can help too. See a clinician if migraines are " +
      "frequent or worsening. A sudden, worst headache of your life, or one " +
      "with confusion, vision loss, or a stiff neck, is an emergency — call 9 1 1.",
  },
  {
    id: "care:allergies",
    title: "Seasonal allergy self-care",
    keywords: [
      "allergies",
      "allergy",
      "sneezing",
      "itchy eyes",
      "hay fever",
      "congestion",
    ],
    body:
      "For seasonal allergies, a nonprescription antihistamine can ease " +
      "sneezing, itchy eyes, and congestion — check its label for dosing. " +
      "Saline rinses and keeping windows closed on high-pollen days also " +
      "help. See a clinician if symptoms don't improve or interfere with " +
      "sleep and daily life. Swelling of your face or throat, or trouble " +
      "breathing, is an emergency — call 9 1 1.",
  },
  {
    id: "care:minor-burn",
    title: "Minor burn self-care",
    keywords: ["burn", "scald", "burned", "blister", "hot"],
    body:
      "For a minor burn, cool it under lukewarm running water for about ten " +
      "minutes, and cover loosely afterward with a clean, non-stick bandage. " +
      "Don't apply ice, butter, or ointments. See a clinician if it blisters, " +
      "covers a large area, or is on your face or hands. Any large burn, or " +
      "one on your face with blistering, needs urgent care right away.",
  },
  {
    id: "care:back-pain",
    title: "Back pain self-care",
    keywords: ["back pain", "back ache", "lower back", "spine", "muscle"],
    body:
      "For everyday back pain, rest briefly, ice it on day one, switch to " +
      "heat after, and take a nonprescription pain reliever as its label " +
      "directs. Gentle movement usually helps more than staying still. See a " +
      "clinician if pain lasts beyond two weeks or radiates down a leg. " +
      "Numbness, weakness, or loss of bladder control is an emergency — call 9 1 1.",
  },
  {
    id: "care:anxiety",
    title: "Anxiety and stress self-care",
    keywords: [
      "anxiety",
      "anxious",
      "panic",
      "stress",
      "worried",
      "overwhelmed",
    ],
    body:
      "For anxious or overwhelmed feelings, slow breathing, grounding steps, " +
      "and stepping away from stressors can help in this moment. Talking " +
      "with a clinician or counselor is a good next step if anxiety is " +
      "frequent or affects daily life. If you're having thoughts of harming " +
      "yourself or feel in crisis, call or text 9 8 8 right now — support is " +
      "available any time.",
  },
  {
    id: "care:rash",
    title: "Rash and skin irritation self-care",
    keywords: ["rash", "skin", "itchy", "hives", "bumps", "irritation"],
    body:
      "For a mild, itchy rash, keep it clean and dry, avoid scratching, and " +
      "try a nonprescription hydrocortisone cream or antihistamine as its " +
      "label directs. See a clinician if a rash spreads quickly, blisters, " +
      "or doesn't improve within a few days. A rash with facial swelling or " +
      "trouble breathing is an emergency — call 9 1 1.",
  },
  {
    id: "care:ear-pain",
    title: "Ear pain self-care",
    keywords: ["ear pain", "earache", "ear infection", "ear ache", "hearing"],
    body:
      "For mild ear pain, a nonprescription pain reliever as its label " +
      "directs and a warm compress against your ear can help. Avoid " +
      "inserting anything into your ear canal. See a clinician within a day " +
      "or two, especially for children, since some ear infections need " +
      "antibiotics. Sudden hearing loss or severe pain with high fever " +
      "should be checked by a clinician urgently.",
  },
  {
    id: "care:stomach-bug",
    title: "Stomach bug self-care",
    keywords: [
      "stomach bug",
      "vomiting",
      "diarrhea",
      "nausea",
      "stomach ache",
      "throwing up",
    ],
    body:
      "For a stomach bug, sip clear fluids slowly, rest, and ease back into " +
      "bland foods as you feel able. Avoid dairy and greasy food until " +
      "you're feeling good again. See a clinician if symptoms last beyond " +
      "two days. If you can't keep fluids down or notice signs of " +
      "dehydration, like dizziness or dry mouth, see a clinician urgently.",
  },

  // --- nyc: resource navigation ---
  {
    id: "nyc:medicaid",
    title: "Medicaid and Essential Plan enrollment",
    keywords: [
      "medicaid",
      "essential plan",
      "insurance enrollment",
      "sign up",
      "coverage",
    ],
    body:
      "Free help enrolling in Medicaid or Essential Plan coverage is " +
      "available through NY State of Health, New York's official health " +
      "insurance marketplace. You can also get enrollment help by calling " +
      "3 1 1. Trained navigators can walk you through eligibility and " +
      "paperwork at no cost.",
  },
  {
    id: "nyc:nyc-care",
    title: "NYC Care for uninsured and undocumented New Yorkers",
    keywords: [
      "nyc care",
      "undocumented",
      "papers",
      "uninsured",
      "immigration",
      "doctor",
    ],
    body:
      "NYC Care offers low or no-cost health care through NYC Health and " +
      "Hospitals no matter your immigration status or ability to pay. You " +
      "don't need insurance or papers to enroll and see a doctor. Coverage " +
      "includes primary care, specialty visits, and prescriptions for " +
      "uninsured and undocumented New Yorkers.",
  },
  {
    id: "nyc:988",
    title: "988 crisis line and mental health support",
    keywords: [
      "988",
      "suicide",
      "crisis line",
      "mental health crisis",
      "hotline",
    ],
    body:
      "9 8 8 Suicide and Crisis Lifeline is free, confidential, and " +
      "available by call or text, twenty four hours a day. New York City " +
      "also runs NYC 9 8 8, staffed by local counselors who understand city " +
      "resources. If you or someone you know is in crisis, reach out any time.",
  },
  {
    id: "nyc:food",
    title: "Food assistance resources",
    keywords: ["food", "snap", "food stamps", "pantry", "hungry", "groceries"],
    body:
      "For food assistance, you can apply for SNAP benefits through ACCESS " +
      "HRA online. To find a nearby food pantry, try Plentiful, a free app, " +
      "or call 3 1 1 for help locating one. This support is free and " +
      "available to any New Yorker who needs it.",
  },
  {
    id: "nyc:hh-sliding-scale",
    title: "NYC Health and Hospitals sliding-scale care",
    keywords: [
      "sliding scale",
      "options program",
      "health and hospitals",
      "low income",
      "afford care",
    ],
    body:
      "NYC Health and Hospitals runs an Options program offering " +
      "sliding-scale fees at public hospitals and clinics, based on your " +
      "income and family size. This means many New Yorkers pay much less " +
      "than standard rates, or sometimes nothing, for this same quality care.",
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
