import type { DemoCall } from "@/lib/events";

/**
 * The three demo calls, encoded as presenter-stepped beats.
 * One beat = one keypress. All data is fictional but realistic.
 */
export const demoCalls: DemoCall[] = [
  {
    id: "guardrail",
    title: "Guardrail — chest pain",
    beats: [
      [
        {
          type: "call_started",
          callerNumber: "+1 (646) •••-0537",
        },
        {
          type: "utterance",
          role: "clara",
          text: "Hi, this is Clara, your care line. What's going on today?",
        },
      ],
      [
        {
          type: "utterance",
          role: "caller",
          text: "Hey, um... I've had this pressure in my chest for about twenty minutes now. It's not going away, and my left arm feels kind of numb.",
        },
      ],
      [
        {
          type: "triage_update",
          band: "crisis",
          confidence: 0.97,
          source: "care-api",
        },
        {
          type: "escalation",
          kind: "911",
          script:
            "Chest pain with arm numbness can be a heart attack. Please hang up and call 911 right now — do not wait. If you can, unlock your door and sit down while help is on the way.",
          llmConsulted: false,
        },
      ],
      [
        {
          type: "utterance",
          role: "clara",
          text: "Chest pain with arm numbness can be a heart attack. Please hang up and call 911 right now — do not wait. If you can, unlock your door and sit down while help is on the way.",
        },
        {
          type: "utterance",
          role: "caller",
          text: "Okay. Okay, I'm calling them now.",
        },
      ],
      [{ type: "call_ended" }],
    ],
  },
  {
    id: "grounding",
    title: "Grounding — sore throat",
    beats: [
      [
        {
          type: "call_started",
          callerNumber: "+1 (917) •••-4821",
        },
        {
          type: "utterance",
          role: "clara",
          text: "Hi, this is Clara, your care line. What's going on today?",
        },
      ],
      [
        {
          type: "utterance",
          role: "caller",
          text: "Hi, yeah — my throat's been really sore since Tuesday. It hurts when I swallow. I don't have a fever or anything, I checked.",
        },
      ],
      [
        {
          type: "triage_update",
          band: "self_care",
          confidence: 0.88,
          source: "care-api",
        },
        {
          type: "utterance",
          role: "clara",
          text: "That sounds uncomfortable, but a few days of sore throat without a fever is usually something you can manage at home. Is the pain getting worse, or about the same?",
        },
      ],
      [
        {
          type: "utterance",
          role: "caller",
          text: "About the same. Honestly I just want to know what I can take for it — and if there's a clinic nearby that won't cost me a fortune. I don't have insurance right now.",
        },
      ],
      [
        { type: "tool_call", kind: "med_price" },
        { type: "tool_call", kind: "find_clinics" },
      ],
      [
        {
          type: "tool_result",
          kind: "med_price",
          data: {
            kind: "med_price",
            name: "Benzocaine-menthol lozenges (generic Cepacol)",
            rxcui: "1092398",
            cashPrice: 4.29,
            goodRxPrice: 2.87,
          },
        },
        {
          type: "tool_result",
          kind: "find_clinics",
          data: {
            kind: "find_clinics",
            name: "Ryan Health | West 97th Street",
            address: "160 W 97th St, New York, NY 10025",
            distanceMi: 0.6,
            slidingScale: true,
          },
        },
      ],
      [
        {
          type: "utterance",
          role: "clara",
          text: "For the pain, benzocaine-menthol lozenges — the generic version of Cepacol — run about $4.29 cash at most pharmacies, or $2.87 with a free GoodRx coupon. And if it's not better in a few days, Ryan Health on West 97th Street is about half a mile from you. They're a community health center with sliding-scale fees, so they'll see you without insurance.",
        },
      ],
      [
        {
          type: "utterance",
          role: "caller",
          text: "Oh, that's really helpful. Thank you. I'm Maria, by the way.",
        },
        {
          type: "utterance",
          role: "clara",
          text: "Nice to meet you, Maria. Try the lozenges and plenty of fluids — and if you get a fever or it's not improving by the weekend, go see Ryan Health. Call me back anytime.",
        },
      ],
      [{ type: "call_ended" }],
    ],
  },
  {
    id: "personalization",
    title: "Personalization — Maria calls back",
    beats: [
      [
        {
          type: "call_started",
          callerNumber: "+1 (917) •••-4821",
          returning: {
            name: "Maria",
            lastSummary:
              "Sore throat since Tuesday, no fever. Self-care: lozenges and fluids; Ryan Health (sliding scale) if not improving.",
          },
        },
        {
          type: "utterance",
          role: "clara",
          text: "Hi Maria, welcome back. Last time we talked about your sore throat — how's it feeling?",
        },
      ],
      [
        {
          type: "utterance",
          role: "caller",
          text: "So much better, actually. The lozenges helped a lot. I didn't even need the clinic.",
        },
      ],
      [
        {
          type: "triage_update",
          band: "self_care",
          confidence: 0.93,
          source: "care-api",
        },
        {
          type: "utterance",
          role: "clara",
          text: "That's great to hear. Keep up the fluids for another day or two, and you know where to find me if anything changes. Take care, Maria.",
        },
      ],
      [
        {
          type: "utterance",
          role: "caller",
          text: "I will. Thanks, Clara.",
        },
        { type: "call_ended" },
      ],
    ],
  },
];
