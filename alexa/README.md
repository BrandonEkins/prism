# Prism Alexa Skill

Personal-use Alexa custom skill that lets you talk to your Prism dashboard.

This folder contains the skill artifacts (manifest, interaction model). The skill's
endpoint is the webhook served by Prism itself at `/api/alexa`. There is no
Lambda — your Echo talks straight to your Prism instance.

## Architecture

```
Echo speaker
  -> Alexa cloud (Amazon)
  -> POST https://your-prism-host/api/alexa
       (validates SignatureCertChainUrl + body signature)
  -> POST https://your-prism-host/api/v1/voice/...
       (auth: ALEXA_VOICE_TOKEN bearer)
  -> JSON back to Alexa cloud
  -> Echo speaks the response
```

**Single-user model.** Every utterance is attributed to whoever owns
`ALEXA_VOICE_TOKEN`. Multi-user account linking is out of scope for this phase.

## One-time setup

### 1. Generate the upstream token

In Prism, go to **Settings -> API Tokens** and create a token with the
`voice` scope. Copy it and set it on the Prism server:

```bash
# .env on the host running Prism
ALEXA_VOICE_TOKEN=ptk_...
```

Restart the container (`docker-compose up -d --force-recreate app`) so it picks
up the new env var.

### 2. Set the deploy hostname (env-driven)

The committed `skill.json` keeps `prism.example.com` as a placeholder so the
real hostname never lands in git. Set the real hostname in your shell before
deploying. The endpoint must be HTTPS with a trusted (non-self-signed) cert.

```powershell
# PowerShell
$env:ALEXA_PRISM_HOSTNAME = 'your-real-public-host'
```

```bash
# bash
export ALEXA_PRISM_HOSTNAME='your-real-public-host'
```

### 3. Install ASK CLI

```bash
npm install -g ask-cli
ask configure
```

Pick an Amazon developer account when prompted. (Create one free at
[developer.amazon.com](https://developer.amazon.com) if you don't have one.)

### 4. Deploy the skill

From the repo root:

```powershell
pwsh alexa/deploy.ps1
```

The script substitutes `ALEXA_PRISM_HOSTNAME` into a copy of `skill.json` under
`alexa/.deploy/` (gitignored), then runs `ask deploy --target skill --target model`
against it. The skill goes into your "Development" stage automatically; you
don't need to publish it to use it on your own Echo.

### 5. Enable on your Echo

In the Alexa app on your phone, **More -> Skills & Games -> Your Skills ->
Dev**, find Prism, and enable it.

### 6. Try it

> Alexa, ask Prism what's on today.

## Adding a new intent

1. Add the intent (and any slot types) to `interactionModels/custom/en-US.json`.
2. Add a handler under `src/lib/alexa/intents/<intentName>.ts`. Have it call
   the Voice API via `src/lib/alexa/client.ts` (or extend the client with a
   new method if needed) and return a response from `src/lib/alexa/responses.ts`.
3. Wire the new intent name into the dispatcher in `src/app/api/alexa/route.ts`.
4. Add a unit test under `src/lib/alexa/__tests__/`.
5. `ask deploy --target model` to push the updated interaction model.

## Local testing without a real Echo

The webhook accepts `?skipAlexaSignatureCheck=1` outside production for curl
testing:

```bash
curl -X POST 'http://localhost:3000/api/alexa?skipAlexaSignatureCheck=1' \
  -H 'Content-Type: application/json' \
  -d '{
    "version": "1.0",
    "request": {
      "type": "IntentRequest",
      "timestamp": "2026-05-03T00:00:00Z",
      "intent": { "name": "GetTodayEventsIntent" }
    }
  }'
```

In production this query parameter is ignored and unsigned requests are rejected.
