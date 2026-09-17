"use client";

import { useRef, useState } from "react";

interface Msg {
  role: "user" | "bot";
  text: string;
  id?: string;
}

const STARTERS = ["Hello", "How are you?", "You broken?", "Make me angry", "Bye"];

function RageMeter({ rage }: { rage: number | null }) {
  if (rage === null) return null;
  const pct = Math.max(0, Math.min(2, rage)) * 50;
  const label = rage < 0.7 ? "😌 calm" : rage < 1.4 ? "😠 simmering" : "🤬 RAGING";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-zinc-400">rage {label}</span>
      <div className="h-2 w-28 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TypingBlobs() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-red-500"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function RageBot() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "bot", text: "I'm RageBot. I listen. I respond. Say something — I dare you." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rage, setRage] = useState<number | null>(null);
  const [oddities, setOddities] = useState<string[]>(() => {
    try {
      if (typeof window === "undefined") return [];
      const raw = window.localStorage.getItem("ragebot-odd");
      return raw ? (JSON.parse(raw) as string[]).slice(0, 10) : [];
    } catch {
      return [];
    }
  });
  const boxRef = useRef<HTMLDivElement>(null);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setError(null);
    const next = [...messages, { role: "user" as const, text: message }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/rage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: next.slice(-7).map((m) => ({ role: m.role, text: m.text, id: m.id })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "RageBot choked. Try again.");
        return;
      }
      setMessages((prev) => [...prev, { role: "bot", text: data.text, id: data.id }]);
      if (typeof data.rage === "number") setRage(data.rage);
      if (data.odd === true) {
        setOddities((prev) => {
          const next = [message, ...prev].slice(0, 10);
          try {
            window.localStorage.setItem("ragebot-odd", JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
      }
      requestAnimationFrame(() =>
        boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" }),
      );
    } catch {
      setError("RageBot choked. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 font-sans text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              RAGE<span className="text-red-500">BOT</span>
            </h1>
            <p className="text-sm text-zinc-400">It listens. It responds. Powered by Jev.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            listening
          </span>
          <RageMeter rage={rage} />
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 gap-6 px-6 py-6 xl:grid-cols-[1fr_280px]">
        <div className="flex min-h-0 min-w-0 flex-col">
        <div
          ref={boxRef}
          className="min-h-[320px] flex-1 space-y-3 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "bot" && (
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600/20 text-lg"
                >
                  😡
                </span>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-[15px] leading-relaxed ${
                  m.role === "user" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-100"
                }`}
              >
                {m.text}
              </div>
              {m.role === "user" && (
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-lg"
                >
                  🧑
                </span>
              )}
            </div>
          ))}
          {loading && <TypingBlobs />}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={loading}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Say something..."
            className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-[15px] text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-red-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
          >
            Send
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <footer className="mt-6 text-center text-xs text-zinc-600">
          RageBot listens and responds. Powered by Jev.
        </footer>
        </div>

        <aside className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 xl:sticky xl:top-6 xl:max-h-[70vh] xl:overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-wide text-zinc-300">WEIRDEST THINGS SAID 🤪</h2>
            {oddities.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setOddities([]);
                  try {
                    window.localStorage.removeItem("ragebot-odd");
                  } catch {
                    /* ignore */
                  }
                }}
                className="text-[11px] text-zinc-500 hover:underline"
              >
                clear
              </button>
            )}
          </div>
          {oddities.length === 0 ? (
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Nothing unhinged yet. Say something so bizarre even RageBot short-circuits and it lands here.
            </p>
          ) : (
            <ol className="mt-3 space-y-2">
              {oddities.map((o, i) => (
                <li
                  key={`${i}-${o.slice(0, 12)}`}
                  className="rounded-xl bg-zinc-800/70 px-3 py-2 text-xs leading-relaxed text-zinc-200"
                >
                  <span className="mr-1.5 font-mono font-bold text-red-400">#{oddities.length - i}</span>
                  {o}
                </li>
              ))}
            </ol>
          )}
        </aside>
      </main>
    </div>
  );
}
