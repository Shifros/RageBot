import { NextRequest, NextResponse } from "next/server";
import { TRIGGER_ID, fakebotCriteria, fakebotText } from "@/lib/fakebot";
import { FAKEBOT_REPLIES } from "@/lib/fakebot";
import { fakebot2Criteria } from "@/lib/fakebot2";
import { FAKEBOT2_REPLIES } from "@/lib/fakebot2";
import { gibberish } from "@/lib/gibberish";

const UPSTREAM = "https://api.typesafe.ai/v1/systemone";
const ESCALATE_BELOW = 0.12;

interface ChatMsg {
  role: "user" | "bot";
  text: string;
  id?: string;
}

async function askLayer(
  apiKey: string,
  state: string,
  instructions: string,
  criteria: Record<string, string>,
): Promise<{ id: string; confidence: number | null; rage: number | null; weird: number | null } | null> {
  const upstream = await fetch(UPSTREAM, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state,
      model: "jev-latest",
      questions: {
        reply: { type: "choice", instructions, criteria },
        rage: {
          type: "score",
          instructions: "How enraged is the person right now, based on what they just said?",
          criteria: ["Calm and chill", "Simmering, getting annoyed", "Full rage, about to explode"],
        },
        weird: {
          type: "score",
          instructions: "How weird, bizarre, or nonsensical is what the person just said?",
          criteria: ["Totally normal message", "Odd or quirky", "Deranged word salad"],
        },
      },
    }),
  });
  if (!upstream.ok) return null;
  const data = await upstream.json().catch(() => ({}));
  const answers = (data as { answers?: { reply?: { choice?: string; confidence?: number }; rage?: { score?: number }; weird?: { score?: number } } }).answers;
  if (!answers?.reply?.choice) return null;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    id: answers.reply.choice,
    confidence: answers.reply.confidence ?? null,
    rage: num(answers.rage?.score),
    weird: num(answers.weird?.score),
  };
}

const L2_TEXT = new Map(FAKEBOT2_REPLIES.map((r) => [r.id, r.text]));
// Reverse lookup: client only ever sees texts, so resolve recent bot
// picks back to ids for the anti-repeat memory. Nothing leaks out.
const TEXT_TO_ID = new Map<string, string>();
for (const r of FAKEBOT_REPLIES) if (r.text) TEXT_TO_ID.set(r.text, r.id);
for (const r of FAKEBOT2_REPLIES) TEXT_TO_ID.set(r.text, r.id);
const TRIGGER_ABOUT =
  "LAST RESORT ONLY. None of the other replies fit the user's message at all. Use only when every other option is wrong.";

export async function POST(req: NextRequest) {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Service is not configured." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { message, history = [] } = body as {
    message?: string;
    history?: ChatMsg[];
  };

  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Say something first." }, { status: 400 });
  }
  const clean = message.trim();

  const historyArr = Array.isArray(history) ? history : [];
  const recent = historyArr
    .slice(-6)
    .map((m) => `${m.role === "user" ? "You" : "RageBot"}: ${m.text}`)
    .join("\n");

  const recentBotIds = historyArr
    .filter((m) => m.role === "bot")
    .map((m) => (m.id ? m.id : TEXT_TO_ID.get(m.text)) as string | undefined)
    .filter((id): id is string => Boolean(id))
    .slice(-4);

  const avoidLine =
    recentBotIds.length > 0
      ? `Do NOT pick any of these recently used replies: ${recentBotIds.join(", ")}. Pick something different.`
      : "";

  const persona =
    "RageBot is a rage-baiting little menace. It can't hold a conversation — it just listens and fires back short, sarcastic, infuriating rubbish that gets under your skin.";
  const state = recent
    ? `${persona}\nRecent chat (context only, react to the LAST thing the person said):\n${recent}\nThe person just said: ${clean}`
    : `${persona}\nThe person just said: ${clean}`;

  const baseInstructions =
    "Which canned RageBot reply will rage-bait the person most, given ONLY what they just said? Match greetings to greetings, goodbyes to goodbyes, confusion to confusion. If they say the bot is broken, stupid, or repeating itself, pick a self-aware funny reply (skill_issue, reboot, error404, no_brain, damn_it, oof). Vary the pick.";

  try {
    // Layer 1
    const c1 = fakebotCriteria();
    for (const id of recentBotIds) delete c1[id];
    const p1 = await askLayer(apiKey, state, `${baseInstructions} ${avoidLine}`, c1);
    if (p1 && p1.id !== TRIGGER_ID && (p1.confidence ?? 1) >= ESCALATE_BELOW) {
      const odd = (p1.weird ?? 0) >= 1.0;
      return NextResponse.json({ text: fakebotText(p1.id), rage: p1.rage, odd });
    }

    // Layer 2 (backup pack)
    const c2: Record<string, string> = { ...fakebot2Criteria(), [TRIGGER_ID]: TRIGGER_ABOUT };
    for (const id of recentBotIds) delete c2[id];
    const p2 = await askLayer(
      apiKey,
      `${persona}\nThe first pack had nothing fitting. Dig into the backup pack.\nThe person just said: ${clean}`,
      `${baseInstructions} This is the backup pack for odd, specific, or weird messages. ${avoidLine}`,
      c2,
    );
    if (p2 && p2.id !== TRIGGER_ID && (p2.confidence ?? 1) >= ESCALATE_BELOW && L2_TEXT.has(p2.id)) {
      return NextResponse.json({ text: L2_TEXT.get(p2.id), rage: p2.rage, odd: true });
    }

    // Layer 3: gibberish, no API
    const weirdFallback = Math.max(p2?.weird ?? 0, p1?.weird ?? 0) >= 1.0;
    return NextResponse.json({ text: gibberish(clean + Date.now()), rage: p2?.rage ?? p1?.rage ?? null, odd: weirdFallback });
  } catch {
    return NextResponse.json({ text: gibberish(clean) });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, name: "RageBot" });
}
