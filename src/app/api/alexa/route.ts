/**
 * Endpoint: /api/alexa
 *
 * Webhook for the Prism Alexa custom skill. Receives Alexa SkillKit
 * requests, validates the signature against the Alexa cert chain, dispatches
 * to an intent handler, and returns an Alexa-shaped response.
 *
 * Auth model: Alexa proves it sent the request via signature validation
 * (per Amazon's HTTPS service skill rules); we do not authenticate per-user.
 * The webhook then calls the Voice API using a server-side bearer token in
 * `ALEXA_VOICE_TOKEN`. So this skill is a single-user appliance: every Alexa
 * utterance hits the same Prism account.
 *
 * Handlers live in src/lib/alexa/intents/. Add a new intent by:
 *   1. registering its name + samples in alexa/interactionModels/custom/en-US.json,
 *   2. writing a handler under src/lib/alexa/intents/,
 *   3. wiring it in the dispatcher below.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAlexaRequest, AlexaSignatureError } from '@/lib/alexa/validate';
import { speak } from '@/lib/alexa/responses';
import { handleGetTodayEvents } from '@/lib/alexa/intents/getTodayEvents';
import { logError } from '@/lib/utils/logError';

interface AlexaRequest {
  version?: string;
  request?: {
    type?: string;
    timestamp?: string;
    intent?: { name?: string };
  };
}

export async function POST(request: NextRequest) {
  // Read body as raw text once — signature verification needs the exact
  // bytes Alexa signed, and re-stringifying after JSON.parse can change
  // whitespace and break the verifier.
  const rawBody = await request.text();

  // Allow bypass only outside production for local curl-driven testing.
  // Production-mode requests must be properly signed.
  const skipSig =
    process.env.NODE_ENV !== 'production' &&
    new URL(request.url).searchParams.get('skipAlexaSignatureCheck') === '1';

  let parsed: AlexaRequest;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!skipSig) {
    try {
      await verifyAlexaRequest({
        rawBody,
        certChainUrl: request.headers.get('SignatureCertChainUrl'),
        signature: request.headers.get('Signature'),
        signature256: request.headers.get('Signature-256'),
        parsedTimestamp: parsed.request?.timestamp ?? null,
      });
    } catch (err) {
      if (err instanceof AlexaSignatureError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      logError('[alexa] signature verification crashed:', err);
      return NextResponse.json({ error: 'signature_verification_failed' }, { status: 400 });
    }
  }

  const reqType = parsed.request?.type;

  if (reqType === 'LaunchRequest') {
    return NextResponse.json(
      speak('Welcome to Prism. Ask me about today\'s events, today\'s tasks, or your family.'),
    );
  }

  if (reqType === 'SessionEndedRequest') {
    return NextResponse.json({ version: '1.0', response: {} });
  }

  if (reqType !== 'IntentRequest') {
    return NextResponse.json(speak("Sorry, I didn't catch that."));
  }

  const intent = parsed.request?.intent?.name;

  switch (intent) {
    case 'GetTodayEventsIntent':
      return NextResponse.json(await handleGetTodayEvents());

    case 'AMAZON.HelpIntent':
      return NextResponse.json(
        speak('You can ask me about today\'s events, today\'s tasks, or your family.'),
      );

    case 'AMAZON.CancelIntent':
    case 'AMAZON.StopIntent':
      return NextResponse.json(speak('Goodbye.'));

    default:
      return NextResponse.json(speak("I don't know how to do that yet."));
  }
}
