// Arya Health knowledge base: seed content + offline fallback + keyword
// scorer. The Sigma platform copy (seeded by scripts/seed-kb.ts) is the
// source of truth at runtime; these entries answer when Supabase is
// unreachable, so bodies must stand alone and be safe to speak aloud.
//
// Entry ids are namespaced: "arya:" org facts, "care:" care guidance,
// "nyc:" NYC resource navigation. Titles are frozen once seeded — the
// platform seeder upserts by exact title match, so renaming a title here
// creates a duplicate document instead of updating the existing one.

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
      "Arya Health is a community health organization built to close the gap " +
      "between New Yorkers and the care they actually need. The team started " +
      "this care line because too many people were putting off simple, " +
      "treatable problems out of fear of a bill they couldn't predict, a " +
      "clinic they couldn't reach, or a system they didn't trust. Clara is " +
      "Arya Health's AI care line, built to be the first, easiest step " +
      "toward getting help, day or night, in plain language." +
      "\n\n" +
      "On a call with Clara you can ask about medication prices at nearby " +
      "pharmacies, find low-cost or sliding-scale clinics near you, talk " +
      "through symptoms and get grounded self-care guidance, or get warmly " +
      "transferred to a live telehealth clinician on the same call. Clara " +
      "works across all five boroughs and never asks about insurance or " +
      "immigration status before helping you." +
      "\n\n" +
      "Clara is not a doctor and never diagnoses a condition or prescribes " +
      "medication. Her job is to help you understand your options clearly " +
      "and connect you to a real clinician or resource as quickly as " +
      "possible. If what you're describing sounds like an emergency, Clara " +
      "will tell you plainly to call 9 1 1.",
  },
  {
    id: "arya:hours",
    title: "Hours and availability",
    keywords: ["hours", "open", "available", "when", "call back"],
    body:
      "Clara answers Arya Health's care line around the clock, twenty four " +
      "hours a day, seven days a week, including weekends and holidays. " +
      "There's no phone tree to fight through and no hold music: if you " +
      "call, Clara picks up and starts helping right away, whether it's the " +
      "middle of the afternoon or three in the morning." +
      "\n\n" +
      "That constant availability matters because health worries rarely " +
      "show up on a convenient schedule. Clara can walk you through " +
      "self-care guidance, look up medication prices, or help you find a " +
      "clinic at any hour, and she'll always start by listening to what's " +
      "going on before jumping to advice." +
      "\n\n" +
      "If you'd rather speak with a live person, Clara can offer a warm " +
      "transfer to a licensed telehealth clinician on the same call. Those " +
      "live transfers are available every day from eight each morning until " +
      "ten each night, Eastern time. Outside that window, Clara can still " +
      "triage what you're describing, share guidance, and help you plan " +
      "next steps, including pointing you to urgent or emergency care if " +
      "your symptoms sound serious.",
  },
  {
    id: "arya:cost",
    title: "Cost of calling Clara",
    keywords: ["cost", "price", "free", "insurance", "sliding scale", "afford"],
    body:
      "Calling Clara costs nothing, full stop. There's no per-minute charge, " +
      "no subscription, and no catch: Arya Health built this care line so " +
      "cost is never the reason someone skips getting help, and that " +
      "promise holds no matter your insurance status or income." +
      "\n\n" +
      "If Clara connects you to a clinic or a telehealth visit, those " +
      "services are typically offered on a sliding scale based on your " +
      "ability to pay, and many partner clinics see patients with no " +
      "insurance at all. Clara can also look up medication prices across " +
      "nearby pharmacies so you know roughly what to expect before you go, " +
      "and flag lower-cost generic options when they exist." +
      "\n\n" +
      "Money worries are one of the biggest reasons people delay care until " +
      "a small problem becomes a bigger, more expensive one. If cost is " +
      "part of what's holding you back, tell Clara directly. She can point " +
      "you toward NYC Care, Medicaid enrollment help, or sliding-scale " +
      "clinics near you, all as part of this same call, and none of it " +
      "requires proof of insurance up front.",
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
      "Sometimes talking through symptoms with Clara is enough, and " +
      "sometimes you want to hear from an actual clinician. Clara can make " +
      "that happen without hanging up: if you'd like to speak with a real " +
      "person, she'll offer a warm transfer to a licensed telehealth " +
      "clinician right on this same call, once you agree." +
      "\n\n" +
      "The handoff is designed to feel seamless. Clara shares a quick " +
      "summary of what you've already told her, so you don't have to " +
      "repeat your symptoms from scratch, and the clinician picks up the " +
      "conversation from there to ask follow-up questions, offer guidance, " +
      "and decide whether you need a prescription, a referral, or an " +
      "in-person visit." +
      "\n\n" +
      "Live telehealth clinicians are available every day from eight each " +
      "morning until ten each night, Eastern time. Outside that window, " +
      "Clara can still triage your symptoms, offer self-care guidance, and " +
      "help you plan next steps for the morning. If anything you describe " +
      "sounds like it can't wait, Clara will tell you to call 9 1 1 instead " +
      "of waiting for a transfer.",
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
      "Arya Health serves all five New York City boroughs: Manhattan, " +
      "Brooklyn, Queens, the Bronx, and Staten Island. Wherever you're " +
      "calling from across the city, Clara can help, and she tailors clinic " +
      "and resource recommendations to your specific neighborhood rather " +
      "than pointing you somewhere across town that's hard to reach." +
      "\n\n" +
      "Coverage means more than a phone number that works everywhere. Clara " +
      "keeps an up-to-date sense of low-cost clinics, urgent care options, " +
      "pharmacies, and NYC public resources borough by borough, so the " +
      "guidance she gives reflects what's actually reachable by subway, " +
      "bus, or a short walk from where you live or work." +
      "\n\n" +
      "If you're traveling within the city, staying with family in a " +
      "different borough, or just not sure what's nearby, tell Clara your " +
      "neighborhood or cross streets and she'll adjust her recommendations " +
      "accordingly. She can also connect you to a live telehealth clinician " +
      "regardless of which borough you're calling from, so location never " +
      "has to be a barrier to getting help.",
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
      "Calls with Clara are recorded and transcribed, and that's worth " +
      "being upfront about. The recording exists so Arya Health can review " +
      "how well Clara is helping people, keep an accurate record for any " +
      "clinician who picks up your case, and improve the guidance she " +
      "gives over time. It is not used for marketing, and Arya Health never " +
      "sells your information to anyone." +
      "\n\n" +
      "Your conversation stays confidential. Access to call transcripts is " +
      "limited to the people directly involved in your care and to the " +
      "small internal team responsible for quality and safety, not shared " +
      "broadly across the organization or with outside companies." +
      "\n\n" +
      "If you'd rather not have a record kept, or you want your call " +
      "history deleted after the fact, just say so. Ask Clara directly, and " +
      "she'll start the deletion process for you, no explanation required. " +
      "You're always welcome to ask what information Arya Health has on " +
      "file, and Clara can walk you through exactly what's stored and why " +
      "before you decide what you want done with it.",
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
      "Clara is not a doctor, and it's important to be clear about that up " +
      "front. She never diagnoses a condition, never prescribes medication, " +
      "and never tells you with certainty what's wrong. What she can do is " +
      "listen carefully, ask good questions, and help you understand the " +
      "range of things your symptoms might mean and what your options are " +
      "for getting checked out." +
      "\n\n" +
      "Think of Clara as a knowledgeable first stop rather than a " +
      "replacement for a clinician. She can walk you through general " +
      "self-care steps for common, mild issues, help you find a nearby " +
      "low-cost clinic, look up medication prices, or connect you to a live " +
      "telehealth clinician who can give you real medical advice on the " +
      "same call." +
      "\n\n" +
      "Safety always comes first. If anything you describe sounds like it " +
      "could be a medical emergency, Clara will tell you plainly to hang up " +
      "and call 9 1 1 rather than continuing the conversation. If you're in " +
      "a mental health crisis, she'll point you to call or text 9 8 8 right " +
      "away, any hour of the day.",
  },

  {
    id: "arya:services-overview",
    title: "What Clara can help you with",
    keywords: [
      "services",
      "help with",
      "what can you do",
      "options",
      "everything clara does",
      "capabilities",
    ],
    body:
      "Clara can help with more than most people expect from a single phone " +
      "call, and it's worth knowing the full range so you get the most out " +
      "of it. She can talk through symptoms and offer grounded self-care " +
      "guidance for common issues, look up medication prices across nearby " +
      "pharmacies so you're not surprised at the counter, and help you find " +
      "low-cost or sliding-scale clinics near wherever you're calling from." +
      "\n\n" +
      "Beyond that, Clara can connect you to a live telehealth clinician on " +
      "the same call for a real medical opinion, help you understand " +
      "insurance options like Medicaid, the Essential Plan, or NYC Care, " +
      "and point you toward NYC resources like SNAP food assistance or the " +
      "9 8 8 crisis line when a situation calls for it. She keeps track of " +
      "what you've told her earlier in the call so you're not repeating " +
      "yourself as the conversation moves between topics." +
      "\n\n" +
      "If you're not sure where to start, just describe what's going on in " +
      "your own words. Clara will ask a few clarifying questions and steer " +
      "the conversation toward whichever of these services actually fits " +
      "your situation, whether that's simple self-care advice, a clinic " +
      "referral, or an urgent transfer to a live clinician.",
  },
  {
    id: "arya:what-to-expect",
    title: "What happens when you call Clara",
    keywords: [
      "what happens",
      "first call",
      "process",
      "how it works",
      "what to expect",
      "transfer",
    ],
    body:
      "Calling Clara feels less like navigating a phone tree and more like " +
      "talking to a knowledgeable friend who happens to know a lot about " +
      "New York City health resources. When you call, Clara greets you, " +
      "asks what's going on, and lets you explain in your own words rather " +
      "than forcing you through a rigid script of questions." +
      "\n\n" +
      "From there, she'll ask a few follow-up questions to understand your " +
      "symptoms or situation more clearly, and every response is quietly " +
      "checked against a safety screen behind the scenes before Clara " +
      "replies, so genuinely urgent situations get flagged immediately " +
      "rather than waiting for the conversation to naturally get there. If " +
      "what you describe sounds serious, Clara will tell you plainly to " +
      "call 9 1 1 or 9 8 8 rather than continuing with general guidance." +
      "\n\n" +
      "For most calls, Clara will offer some combination of self-care " +
      "guidance, a nearby clinic recommendation, or medication pricing, and " +
      "she'll ask if you'd like to be transferred to a live telehealth " +
      "clinician for a real medical opinion. That transfer happens right on " +
      "the same call, with no need to hang up and dial somewhere else, and " +
      "Clara shares a quick summary with the clinician so you don't have to " +
      "repeat everything from scratch.",
  },

  // --- care: care guidance ---
  {
    id: "care:flu",
    title: "Flu and cold self-care",
    keywords: ["flu", "cold", "fever", "body aches", "congestion"],
    body:
      "Flu and bad colds share a lot of overlapping symptoms: fever, body " +
      "aches, congestion, a sore throat, and that heavy, run-down feeling " +
      "that makes it hard to do much of anything. Most cases, especially " +
      "colds, resolve on their own within about a week with rest and basic " +
      "self-care, but a few warning signs mean it's worth getting checked " +
      "out sooner." +
      "\n\n" +
      "At home, the most useful things you can do are rest, drink plenty of " +
      "fluids, and use acetaminophen or ibuprofen, following the dosing on " +
      "the label, to bring down fever and ease body aches. A humidifier or " +
      "warm shower can help loosen congestion, and honey or lozenges can " +
      "soothe a sore throat if you're old enough for them to be safe." +
      "\n\n" +
      "See a clinician if your fever stays above one hundred one for more " +
      "than two days, if breathing starts to feel genuinely hard rather " +
      "than just stuffy, or if you start improving and then take a turn for " +
      "the worse. Trouble breathing, chest pain, or bluish lips are signs " +
      "of something more serious — that combination is an emergency, so " +
      "call 9 1 1 right away instead of waiting it out.",
  },
  {
    id: "care:uti",
    title: "Urinary tract infection (UTI) self-care",
    keywords: ["uti", "burning", "pee", "urination", "bladder", "urinary"],
    body:
      "A urinary tract infection usually announces itself with a burning " +
      "feeling when you pee, a sudden urge to go even when there's not much " +
      "to go, or a dull ache low in your belly or back. It's uncomfortable " +
      "and can feel alarming the first time, but mild UTIs are common, " +
      "especially in women, and very treatable once you get in front of a " +
      "clinician." +
      "\n\n" +
      "While you're arranging care, drink plenty of water to help flush " +
      "your system, and cut back on caffeine, alcohol, and acidic drinks " +
      "that tend to irritate the bladder further. A nonprescription pain " +
      "reliever like acetaminophen, taken as its label directs, can take " +
      "the edge off the burning while you wait for an appointment." +
      "\n\n" +
      "Most UTIs need a short course of antibiotics to actually clear, so " +
      "plan to see a clinician within a day or two rather than waiting to " +
      "see if it resolves on its own — Clara can help you find a same-day " +
      "or next-day clinic. Fever, chills, or pain in your back or side " +
      "along with these symptoms can mean the infection has reached your " +
      "kidneys, which needs urgent attention, so see a clinician right away " +
      "if that combination shows up.",
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
      "A migraine is more than an ordinary headache: it often comes with " +
      "throbbing pain on one side of the head, sensitivity to light and " +
      "sound, nausea, and sometimes visual changes like flashing lights or " +
      "blind spots in the twenty minutes or so before the pain starts. If " +
      "migraines are new for you or unusually severe, it's worth getting " +
      "evaluated to rule out other causes." +
      "\n\n" +
      "For a typical migraine, the most effective first steps are getting " +
      "into a dark, quiet room, staying hydrated, and taking a " +
      "nonprescription pain reliever as early as possible, following its " +
      "label, since migraine medication generally works better the sooner " +
      "it's taken. A cold compress on your neck or forehead and short " +
      "periods of rest or sleep can also help calm an attack." +
      "\n\n" +
      "See a clinician if migraines are happening frequently, getting more " +
      "severe over time, or starting to interfere with work or daily life, " +
      "since there are prescription options that can reduce how often they " +
      "happen. A sudden, severe headache unlike any you've had before, or " +
      "one that comes with confusion, slurred speech, vision loss, or a " +
      "stiff neck, is not a typical migraine and is an emergency — call " +
      "9 1 1 immediately.",
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
      "Seasonal allergies, sometimes called hay fever, show up when pollen, " +
      "mold, or other airborne triggers set off sneezing fits, itchy or " +
      "watery eyes, a runny or stuffy nose, and sometimes an itchy throat " +
      "or ears. Symptoms tend to track with the calendar, flaring in spring " +
      "and fall, and can range from mildly annoying to genuinely disruptive " +
      "to sleep and concentration." +
      "\n\n" +
      "A nonprescription antihistamine, taken as its label directs, is " +
      "usually the most effective first step and can ease sneezing, itchy " +
      "eyes, and congestion within an hour or two. Saline nasal rinses, " +
      "keeping windows closed on high-pollen days, showering after being " +
      "outside, and running an air purifier indoors can all cut down on how " +
      "much you're exposed to in the first place." +
      "\n\n" +
      "See a clinician if symptoms don't improve with over-the-counter " +
      "options, keep interfering with sleep or daily life, or if you're not " +
      "sure whether what you're feeling is allergies versus a cold or " +
      "something else. Swelling of your face, lips, or throat, or any real " +
      "trouble breathing, is not a typical allergy symptom and is an " +
      "emergency — call 9 1 1 rather than waiting to see if it passes.",
  },
  {
    id: "care:minor-burn",
    title: "Minor burn self-care",
    keywords: ["burn", "scald", "burned", "blister", "hot"],
    body:
      "Minor burns, from a hot pan, spilled coffee, or a curling iron, " +
      "usually cause redness, pain, and sometimes a small blister, and most " +
      "heal on their own with the right first aid. The single most " +
      "important thing to do in the first few minutes is cool the burn, " +
      "not treat it with home remedies." +
      "\n\n" +
      "Hold the burned area under cool, not ice-cold, running water for " +
      "about ten minutes, or until the pain eases. Afterward, cover it " +
      "loosely with a clean, non-stick bandage and leave it alone rather " +
      "than picking at any blister that forms. Skip the butter, toothpaste, " +
      "and ice some people reach for out of habit — they can trap heat in " +
      "or damage the skin further and make healing slower." +
      "\n\n" +
      "See a clinician if the burn blisters extensively, covers an area " +
      "larger than your palm, or is on your face, hands, feet, or " +
      "genitals, since those need closer monitoring for infection and " +
      "scarring. Any large burn, a burn that goes all the way through the " +
      "skin, or one on the face with significant blistering needs urgent " +
      "care right away rather than waiting for it to look better on its " +
      "own.",
  },
  {
    id: "care:back-pain",
    title: "Back pain self-care",
    keywords: ["back pain", "back ache", "lower back", "spine", "muscle"],
    body:
      "Everyday back pain, the kind that comes from lifting something " +
      "awkwardly, sitting too long, or sleeping wrong, is extremely common " +
      "and usually improves within a couple of weeks with simple " +
      "self-care. It can still be genuinely miserable in the moment, so " +
      "it's worth treating deliberately rather than just toughing it out." +
      "\n\n" +
      "In the first day or so, ice can help calm inflammation; after that, " +
      "switching to a heating pad tends to relax tight muscles better. A " +
      "nonprescription pain reliever, taken as its label directs, can make " +
      "it easier to move around, and gentle movement like short walks " +
      "generally helps more than strict bed rest, even though staying " +
      "still feels safer." +
      "\n\n" +
      "See a clinician if pain lasts beyond two weeks, keeps you from your " +
      "normal activities, or radiates down one leg past the knee, since " +
      "that pattern can point to nerve involvement that benefits from a " +
      "proper exam. Numbness, tingling, weakness in your legs, or any loss " +
      "of bladder or bowel control alongside back pain is a red flag for a " +
      "serious spinal issue and counts as an emergency — call 9 1 1 rather " +
      "than waiting.",
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
      "Anxiety can show up as a racing mind, a tight chest, trouble " +
      "sleeping, or a sense of dread that doesn't seem tied to anything " +
      "specific, and it's one of the most common things people quietly " +
      "carry without ever bringing up to a clinician. You don't need a " +
      "crisis to justify talking about it — ongoing stress and worry are " +
      "worth addressing on their own." +
      "\n\n" +
      "In the moment, slow, deliberate breathing, grounding techniques like " +
      "naming things you can see and hear, and simply stepping away from " +
      "whatever's triggering the spiral can take the edge off a wave of " +
      "anxiety or a panic attack. Regular exercise, consistent sleep, and " +
      "cutting back on caffeine tend to help with the baseline over time, " +
      "even though none of that fixes everything on its own." +
      "\n\n" +
      "Talking with a clinician or counselor is a reasonable next step if " +
      "anxiety is frequent, intense, or getting in the way of work, " +
      "relationships, or daily functioning — Clara can help you find one. " +
      "If you're having thoughts of harming yourself or someone else, or " +
      "you feel like you're in crisis right now, call or text 9 8 8 " +
      "immediately; support is free, confidential, and available any hour " +
      "of the day.",
  },
  {
    id: "care:rash",
    title: "Rash and skin irritation self-care",
    keywords: ["rash", "skin", "itchy", "hives", "bumps", "irritation"],
    body:
      "Rashes show up for all kinds of reasons: contact with something " +
      "irritating like a new soap or plant, an allergic reaction, heat, or " +
      "a mild viral illness, and most look like red, itchy patches or " +
      "small raised bumps that come and go over a few days. Hives, in " +
      "particular, tend to be raised, intensely itchy welts that can move " +
      "around the body over hours." +
      "\n\n" +
      "Keep the area clean and dry, avoid scratching even though it's " +
      "tempting, since broken skin is more likely to get infected, and try " +
      "a nonprescription hydrocortisone cream or an oral antihistamine, " +
      "following the label, to calm itching and inflammation. Loose, " +
      "breathable clothing over the area can also help it heal without " +
      "further irritation." +
      "\n\n" +
      "See a clinician if a rash spreads quickly, blisters, oozes, or " +
      "doesn't start improving within a few days, since some rashes need a " +
      "specific treatment or turn out to be something other than simple " +
      "irritation. A rash that shows up along with facial or throat " +
      "swelling, difficulty breathing, or a sudden widespread reaction " +
      "after a new medication or food is an emergency — call 9 1 1 rather " +
      "than watching and waiting.",
  },
  {
    id: "care:ear-pain",
    title: "Ear pain self-care",
    keywords: ["ear pain", "earache", "ear infection", "ear ache", "hearing"],
    body:
      "Ear pain is especially common in kids but shows up in adults too, " +
      "often from an ear infection, fluid buildup behind the eardrum, or " +
      "irritation from water, a cold, or a change in air pressure. It can " +
      "range from a mild ache to sharp, throbbing pain that makes it hard " +
      "to focus on anything else." +
      "\n\n" +
      "A nonprescription pain reliever, taken as its label directs, and a " +
      "warm compress held gently against the outer ear can take the edge " +
      "off while you arrange care. Avoid putting cotton swabs, oil, or " +
      "anything else down into the ear canal, since that can push debris " +
      "deeper or damage the eardrum rather than help." +
      "\n\n" +
      "See a clinician within a day or two, especially for a child, since " +
      "some ear infections need antibiotics and a proper look with an " +
      "otoscope to confirm what's actually going on. Sudden hearing loss, " +
      "pain along with a high fever, fluid or blood draining from the ear, " +
      "or severe pain after a head injury should be checked by a clinician " +
      "urgently rather than waiting to see if it settles down on its own.",
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
      "A stomach bug, usually a viral infection, typically brings on some " +
      "combination of nausea, vomiting, diarrhea, and cramping, and it's " +
      "miserable but usually short-lived, clearing up within a few days on " +
      "its own. The biggest risk while you're sick isn't the bug itself so " +
      "much as getting dehydrated from fluid loss." +
      "\n\n" +
      "Sip clear fluids slowly and steadily rather than gulping them down, " +
      "rest as much as you can, and ease back into bland foods like toast, " +
      "rice, or crackers once you're able to keep liquids down. Skip dairy, " +
      "greasy food, caffeine, and alcohol until you're feeling closer to " +
      "normal, since they tend to aggravate an already irritated stomach." +
      "\n\n" +
      "See a clinician if symptoms last beyond two days, if you notice " +
      "blood in vomit or stool, or if a young child, older adult, or " +
      "someone with an existing health condition is affected, since " +
      "dehydration risk is higher for those groups. If you can't keep any " +
      "fluids down at all, or you notice signs of real dehydration like " +
      "dizziness, a racing heart, confusion, or a dry mouth with little to " +
      "no urination, see a clinician urgently rather than waiting it out at " +
      "home.",
  },

  {
    id: "care:sore-throat",
    title: "Sore throat self-care",
    keywords: [
      "sore throat",
      "throat pain",
      "scratchy throat",
      "swallowing hurts",
      "strep",
      "throat hurts",
    ],
    body:
      "A sore throat is one of the most common things people call about, " +
      "and it's usually caused by a virus, the same ones behind a cold or " +
      "flu, though it can also come from allergies, dry indoor air, or " +
      "occasionally a bacterial infection like strep throat. Pain that gets " +
      "sharply worse with swallowing, along with fever and swollen glands " +
      "in the neck, points more toward strep and is worth getting checked " +
      "rather than waiting out." +
      "\n\n" +
      "For a typical viral sore throat, warm liquids like tea with honey, " +
      "salt water gargles, and throat lozenges can ease the raw, scratchy " +
      "feeling within a day or two. A nonprescription pain reliever like " +
      "acetaminophen or ibuprofen, taken as its label directs, usually " +
      "costs just a few dollars and can make swallowing and talking " +
      "noticeably more comfortable while you rest and stay hydrated. A " +
      "cool-mist humidifier at night also helps if dry air is making things " +
      "worse." +
      "\n\n" +
      "See a clinician if a sore throat lasts more than a week, comes with " +
      "a fever above one hundred one, or shows white patches on the " +
      "tonsils, since a rapid strep test takes minutes and antibiotics " +
      "matter if it comes back positive. Severe difficulty swallowing, " +
      "drooling you can't control, or real trouble breathing alongside " +
      "throat pain is an emergency — call 9 1 1 rather than waiting for it " +
      "to pass.",
  },
  {
    id: "care:cough-covid",
    title: "Cough and COVID basics",
    keywords: [
      "cough",
      "covid",
      "coronavirus",
      "testing",
      "congestion",
      "chest cold",
    ],
    body:
      "A cough can come from dozens of things — a common cold, seasonal " +
      "allergies, COVID, or simple irritation from dry air — and figuring " +
      "out which one you're dealing with usually starts with what else is " +
      "going on alongside it. COVID often, though not always, comes with " +
      "fatigue, loss of taste or smell, fever, or body aches in addition to " +
      "the cough, but the only reliable way to know is testing." +
      "\n\n" +
      "At-home rapid tests are widely available at pharmacies and often " +
      "free through community health programs, and testing is worth doing " +
      "if you've been exposed, have classic symptoms, or need to know " +
      "before seeing someone at higher risk. While you're sick, rest, stay " +
      "hydrated, use a humidifier or warm shower for congestion, and a " +
      "nonprescription cough suppressant or expectorant, taken as its label " +
      "directs, can ease symptoms enough to get through the day or sleep " +
      "through the night." +
      "\n\n" +
      "See a clinician if a cough lasts more than three weeks, brings up " +
      "thick discolored mucus with fever, or you have an underlying lung or " +
      "heart condition that makes any respiratory illness riskier. Coughing " +
      "up blood, chest pain, or real shortness of breath, especially if " +
      "it's getting worse rather than better, is an emergency — call " +
      "9 1 1 instead of waiting to see a clinician on your own schedule.",
  },
  {
    id: "care:sprain",
    title: "Sprain self-care",
    keywords: [
      "sprain",
      "twisted ankle",
      "swollen joint",
      "rolled ankle",
      "fracture",
      "sprained wrist",
    ],
    body:
      "A sprain happens when a ligament gets stretched or torn, usually " +
      "from rolling an ankle, twisting a knee, or bending a wrist " +
      "awkwardly, and it typically causes pain, swelling, bruising, and " +
      "some difficulty putting weight on or using the joint. Most mild to " +
      "moderate sprains heal well with simple home care over one to two " +
      "weeks." +
      "\n\n" +
      "The classic approach is rest, ice, compression, and elevation: keep " +
      "weight off the joint as much as possible for the first day or two, " +
      "apply ice for about twenty minutes at a time, wrap it snugly but not " +
      "tightly with an elastic bandage, and keep it raised above heart " +
      "level when you can. A nonprescription anti-inflammatory like " +
      "ibuprofen, taken as its label directs, can help with both pain and " +
      "swelling." +
      "\n\n" +
      "See a clinician if you can't put any weight on the joint at all, if " +
      "swelling and bruising are severe, or if it isn't improving " +
      "noticeably after a few days of rest and ice. A visibly deformed " +
      "joint, a popping sound at the moment of injury followed by intense " +
      "pain, or numbness in the area beyond the injury can point to a " +
      "fracture rather than a simple sprain, and those need an X-ray — see " +
      "a clinician promptly, or go to urgent care the same day rather than " +
      "waiting.",
  },
  {
    id: "care:insomnia",
    title: "Sleep and insomnia self-care",
    keywords: [
      "insomnia",
      "can't sleep",
      "trouble sleeping",
      "sleep hygiene",
      "tired",
      "sleepless",
    ],
    body:
      "Trouble falling asleep, staying asleep, or waking up feeling like " +
      "you never really rested is something almost everyone deals with at " +
      "some point, and it's often more fixable than it feels at three in " +
      "the morning. Stress, screen time before bed, caffeine late in the " +
      "day, and an irregular schedule are some of the most common, quietly " +
      "overlooked culprits." +
      "\n\n" +
      "A few consistent habits, often called sleep hygiene, tend to help " +
      "more than anything else: going to bed and waking up at roughly the " +
      "same time every day, even on weekends, keeping your bedroom cool, " +
      "dark, and used only for sleep, and cutting off caffeine by early " +
      "afternoon and screens at least thirty minutes before bed. If your " +
      "mind is racing, writing down tomorrow's worries before turning off " +
      "the light can help quiet the loop." +
      "\n\n" +
      "See a clinician if poor sleep has been going on for more than a few " +
      "weeks, is affecting your mood, concentration, or safety during the " +
      "day, or if you notice loud snoring with gasping, which can point to " +
      "sleep apnea and deserves a proper evaluation. If sleeplessness is " +
      "tangled up with thoughts of harming yourself, that's not just an " +
      "insomnia problem — call or text 9 8 8 right away for support.",
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
      "Medicaid and the Essential Plan are two of the main ways New Yorkers " +
      "with limited income get comprehensive, low-cost or no-cost health " +
      "coverage, and a lot of people who'd qualify simply never apply " +
      "because the process sounds more complicated than it actually is. " +
      "Eligibility depends on income, household size, and a few other " +
      "factors, and it's worth checking even if you were turned down in " +
      "the past, since rules and income limits change." +
      "\n\n" +
      "Free, unbiased enrollment help is available through NY State of " +
      "Health, New York's official health insurance marketplace, where " +
      "trained navigators can walk you through eligibility and paperwork " +
      "step by step at no cost to you. You can also start that process by " +
      "calling 3 1 1, which can connect you to enrollment assistance and " +
      "answer basic questions about which programs you might qualify for." +
      "\n\n" +
      "Clara can help you get oriented before you make that call, explain " +
      "roughly what documents you'll likely need, like proof of income and " +
      "residency, and point you toward sliding-scale or free clinics you " +
      "can use in the meantime while your application is being processed, " +
      "so a coverage gap doesn't mean going without care.",
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
      "NYC Care is a program run through NYC Health and Hospitals that " +
      "guarantees low-cost or no-cost access to care for New Yorkers who " +
      "can't get traditional insurance, regardless of immigration status, " +
      "income, or whether you have documentation at all. It was built " +
      "specifically to make sure cost or paperwork never becomes the reason " +
      "someone skips seeing a doctor." +
      "\n\n" +
      "Enrolling doesn't require proof of immigration status, a Social " +
      "Security number, or insurance of any kind, and staff are trained not " +
      "to ask about status beyond what's needed to confirm you live in New " +
      "York City. Once enrolled, you get access to primary care, specialty " +
      "visits, mental health services, and prescriptions at public " +
      "hospitals and clinics across the city, with fees set on a sliding " +
      "scale based on what you can actually pay." +
      "\n\n" +
      "Everything you share when enrolling or during a visit is kept " +
      "confidential and is not shared with immigration enforcement; NYC " +
      "Care and NYC Health and Hospitals have been explicit about that " +
      "firewall. Clara can help you find your nearest NYC Care enrollment " +
      "site or walk you through what to bring, and you can also start the " +
      "process yourself by visiting nyccare.nyc.gov or calling 3 1 1 for " +
      "guidance.",
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
      "9 8 8 is the Suicide and Crisis Lifeline, a free, confidential " +
      "number you can call or text any time, day or night, if you're " +
      "struggling, having thoughts of suicide, or supporting someone else " +
      "who is. You don't need to be in an active crisis to use it — 9 8 8 " +
      "is also there for overwhelming stress, grief, or a mental health " +
      "spiral that just feels like too much to carry alone." +
      "\n\n" +
      "New York City also runs NYC 9 8 8, a locally staffed version of the " +
      "line where counselors understand city-specific resources, from " +
      "nearby crisis respite centers to mobile crisis teams that can come " +
      "to you in person if needed. Calls and texts are answered by trained " +
      "counselors, not automated systems, and nothing you share is shared " +
      "with anyone else without your consent, except in situations of " +
      "immediate danger." +
      "\n\n" +
      "Clara can connect you toward 9 8 8 directly if what you're " +
      "describing sounds like a crisis, and she'll do that without " +
      "judgment or hesitation. If you or someone you're with is in " +
      "immediate physical danger, that's a 9 1 1 situation instead — 9 8 8 " +
      "is for mental health and emotional crises, and both lines are free " +
      "and available around the clock.",
  },
  {
    id: "nyc:food",
    title: "Food assistance resources",
    keywords: ["food", "snap", "food stamps", "pantry", "hungry", "groceries"],
    body:
      "Food insecurity is far more common in New York City than most " +
      "people assume, and there's no income level or circumstance that " +
      "disqualifies you from asking for help. Whether it's a temporary gap " +
      "after a job loss or an ongoing struggle to stretch a grocery " +
      "budget, there are real, no-stigma resources built specifically for " +
      "this." +
      "\n\n" +
      "SNAP benefits, sometimes still called food stamps, provide monthly " +
      "funds toward groceries and can be applied for online through ACCESS " +
      "HRA; eligibility depends on household size and income, and many " +
      "working New Yorkers qualify without realizing it. For more " +
      "immediate need, the Plentiful app lists food pantries and soup " +
      "kitchens across the city by neighborhood, with real-time information " +
      "on hours and what's currently available, or you can call 3 1 1 for " +
      "help locating the nearest one." +
      "\n\n" +
      "Clara can walk you through which option fits your timeline, whether " +
      "that's an urgent same-day pantry visit or longer-term SNAP " +
      "enrollment, and she can do it without asking anything about your " +
      "immigration status, since access to food assistance and pantries " +
      "generally does not depend on that. This support is free and meant " +
      "to be used without hesitation whenever it's needed.",
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
      "NYC Health and Hospitals, the city's public hospital system, runs a " +
      "program called Options that sets fees for care on a sliding scale " +
      "based on your household income and family size, rather than " +
      "charging everyone the same flat rate. In practice that means many " +
      "New Yorkers pay significantly less than standard rates, and some pay " +
      "nothing at all, for the exact same quality of care as anyone else." +
      "\n\n" +
      "The Options program applies across the system's hospitals and " +
      "community health centers, covering primary care, specialty visits, " +
      "and many other services, and enrollment doesn't require immigration " +
      "paperwork or a Social Security number. You can apply when you first " +
      "register at a facility, and staff there can walk you through what " +
      "documentation, generally just proof of income and residency, helps " +
      "set your rate accurately." +
      "\n\n" +
      "If cost has been the reason you've been putting off a visit, this is " +
      "exactly the kind of gap Clara can help close: she can point you to " +
      "the nearest NYC Health and Hospitals location, explain roughly what " +
      "to expect from the Options enrollment conversation, and connect that " +
      "to NYC Care or Medicaid if you turn out to be a better fit for " +
      "either of those instead.",
  },

  {
    id: "nyc:immigrant-health",
    title: "Health care access regardless of immigration status",
    keywords: [
      "immigration status",
      "undocumented",
      "no papers",
      "confidential",
      "access to care",
      "fear of deportation",
    ],
    body:
      "Fear of immigration consequences keeps a lot of New Yorkers from " +
      "seeking care even when they're seriously sick, and that fear, while " +
      "understandable, isn't necessary here: multiple programs across New " +
      "York City are built specifically to provide care regardless of " +
      "immigration status, and none of them report your information to " +
      "immigration enforcement." +
      "\n\n" +
      "NYC Care, run through NYC Health and Hospitals, is the clearest " +
      "example — enrollment doesn't ask for a Social Security number or " +
      "proof of status, only proof that you live in the city, and staff are " +
      "trained not to probe beyond that. Sliding-scale community health " +
      "centers across the boroughs operate the same way, and many accept " +
      "walk-ins with no appointment or documentation required beyond basic " +
      "intake information." +
      "\n\n" +
      "To enroll in NYC Care, you can visit nyccare.nyc.gov, call 3 1 1 for " +
      "guidance, or go directly to any NYC Health and Hospitals facility " +
      "and ask to sign up in person; Clara can help you find the nearest " +
      "one and explain roughly what to expect before you go. Everything " +
      "discussed on this call and during any visit stays confidential " +
      "between you and your care team. If immigration status is part of " +
      "what's holding you back from calling a clinic, tell Clara — helping " +
      "you get past that barrier is exactly what this line is for.",
  },
  {
    id: "nyc:urgent-care-vs-er",
    title: "Urgent care versus the emergency room",
    keywords: [
      "urgent care",
      "emergency room",
      "should i go to the er",
      "when to go to the er",
      "urgent care vs er",
      "er wait times",
    ],
    body:
      "Urgent care and the emergency room both handle problems that can't " +
      "wait for a regular appointment, but they're built for different " +
      "levels of severity, and picking the right one saves you both time " +
      "and money. Urgent care centers handle things like minor infections, " +
      "sprains, small cuts that might need stitches, mild fevers, and " +
      "similar issues that need same-day attention but aren't " +
      "life-threatening." +
      "\n\n" +
      "Urgent care visits are typically faster, with wait times usually " +
      "under an hour, and cost substantially less than an ER visit, often " +
      "just a modest copay or sliding-scale fee rather than the much higher " +
      "facility charges hospitals bill. Most urgent care centers in New " +
      "York City are open evenings and weekends, which covers a lot of the " +
      "gap when a regular doctor's office is closed." +
      "\n\n" +
      "The emergency room is the right call for anything that could be " +
      "life-threatening or cause permanent harm if it waits: chest pain, " +
      "severe difficulty breathing, signs of a stroke, uncontrolled " +
      "bleeding, a major injury, or any of the red-flag situations Clara " +
      "flags during a call. When in doubt about whether something is a " +
      "true emergency, treat it as one — call 9 1 1 or go straight to the " +
      "ER rather than trying to save time at urgent care first.",
  },
];

// Function words score +1 against almost any English body via substring
// match, which would surface garbage hits for off-topic queries — remote
// docs edited in the Sigma UI can't be written around that, so filter the
// query side instead.
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "was",
  "one",
  "out",
  "get",
  "has",
  "had",
  "his",
  "her",
  "its",
  "our",
  "she",
  "him",
  "too",
  "use",
  "did",
  "let",
  "with",
  "this",
  "that",
  "from",
  "have",
  "your",
  "what",
  "when",
  "where",
  "which",
  "would",
  "could",
  "should",
  "about",
  "there",
  "their",
  "than",
  "then",
  "them",
  "some",
  "just",
  "like",
]);

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));

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
