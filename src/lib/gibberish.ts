// LAYER 3 — final fallback. Pure code, zero API cost, instant.
// Word-salad gibberish assembled from buckets. Short as F.

const OPENERS = [
  "Blorpt.",
  "Skree.",
  "Wobble.",
  "Zorp.",
  "Flib.",
  "Bzzt.",
  "Snorf.",
  "Quack quack.",
  "Beep boop... no.",
  "Honk.",
];

const MIDDLES = [
  "the spaghetti penguin",
  "my third elbow",
  "a haunted toaster",
  "seven moist goblins",
  "the moon's left sock",
  "a feral bagel",
  "quantum soup",
  "your eyebrow's cousin",
  "a sleepy traffic cone",
  "the void's voicemail",
  "a dramatic potato",
  "my landlord's parrot",
  "soup ghost",
  "a Tuesday-shaped cloud",
];

const VERBS = [
  "declares",
  "whispers to",
  "fumbles",
  "blesses",
  "yeets",
  "ignores",
  "marries",
  "haunts",
  "high-fives",
  "malfunctions near",
];

const ENDERS = [
  "Anyway.",
  "No refunds.",
  "Case closed.",
  "You're welcome.",
  "Don't ask.",
  "Science.",
  "Probably.",
  "Allegedly.",
  "In this economy?",
  "Forever.",
];

export function gibberish(seed?: string): string {
  let h = 0;
  const s = seed ?? Math.random().toString();
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const pick = <T>(arr: T[], salt: number): T => arr[(h + salt * 2654435761) % arr.length];
  const shape = h % 3;
  if (shape === 0) return `${pick(OPENERS, 1)} ${pick(MIDDLES, 2)} ${pick(VERBS, 3)} ${pick(MIDDLES, 4)}. ${pick(ENDERS, 5)}`;
  if (shape === 1) return `${pick(MIDDLES, 2)} ${pick(VERBS, 3)} ${pick(MIDDLES, 4)}. ${pick(ENDERS, 5)}`;
  return `${pick(OPENERS, 1)} ${pick(ENDERS, 5)} ${pick(MIDDLES, 2)} ${pick(VERBS, 3)}.`;
}
