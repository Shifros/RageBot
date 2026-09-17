# RAGEBOT

It listens. It responds. Powered by Jev.

RageBot is a rage-baiting little menace of a chatbot. You vent, it fires back
short, sarcastic, infuriating rubbish — plus a live rage meter and a hall of
shame for the weirdest things you've said.

## Stack

- Next.js 16 + React 19 + Tailwind CSS v4
- [TypeSafe / Jev](https://typesafe.ai/) (`jev-latest`) for reply selection
  and rage scoring — the API key stays server-side, never in the client.

## Run it

```bash
npm install
cp .env.example .env.local
# put your key from https://console.typesafe.ai/settings/keys in .env.local:
# TYPESAFE_API_KEY=...
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — eslint
