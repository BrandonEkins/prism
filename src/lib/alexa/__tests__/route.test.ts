/**
 * Route-level tests for the Alexa webhook.
 *
 * We exercise the route with `?skipAlexaSignatureCheck=1` (only honored in
 * non-production) so we don't have to forge signed requests in unit tests.
 * Signature validation is tested separately in validate.test.ts.
 */

import { POST } from '@/app/api/alexa/route';

jest.mock('@/lib/alexa/intents/getTodayEvents', () => ({
  handleGetTodayEvents: jest.fn().mockResolvedValue({
    version: '1.0',
    response: {
      outputSpeech: { type: 'PlainText', text: 'Today you have Soccer at 4 PM.' },
      shouldEndSession: true,
    },
  }),
}));

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/alexa?skipAlexaSignatureCheck=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/alexa', () => {
  beforeEach(() => {
    jest.replaceProperty(process.env, 'NODE_ENV', 'test');
  });

  it('returns 400 on malformed JSON', async () => {
    const res = await POST(makeRequest('not json') as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_json');
  });

  it('handles LaunchRequest with a welcome message', async () => {
    const res = await POST(makeRequest({
      version: '1.0',
      request: { type: 'LaunchRequest', timestamp: new Date().toISOString() },
    }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.response.outputSpeech.text).toMatch(/welcome to prism/i);
  });

  it('dispatches GetTodayEventsIntent', async () => {
    const res = await POST(makeRequest({
      version: '1.0',
      request: {
        type: 'IntentRequest',
        timestamp: new Date().toISOString(),
        intent: { name: 'GetTodayEventsIntent' },
      },
    }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.response.outputSpeech.text).toBe('Today you have Soccer at 4 PM.');
  });

  it('returns a polite fallback for unknown intents', async () => {
    const res = await POST(makeRequest({
      version: '1.0',
      request: {
        type: 'IntentRequest',
        timestamp: new Date().toISOString(),
        intent: { name: 'NotARealIntentIntent' },
      },
    }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.response.outputSpeech.text).toMatch(/don't know how/i);
  });

  it('handles SessionEndedRequest with empty response', async () => {
    const res = await POST(makeRequest({
      version: '1.0',
      request: { type: 'SessionEndedRequest', timestamp: new Date().toISOString() },
    }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ version: '1.0', response: {} });
  });

  it('handles AMAZON.StopIntent with goodbye', async () => {
    const res = await POST(makeRequest({
      version: '1.0',
      request: {
        type: 'IntentRequest',
        timestamp: new Date().toISOString(),
        intent: { name: 'AMAZON.StopIntent' },
      },
    }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.response.outputSpeech.text).toMatch(/goodbye/i);
  });
});

describe('POST /api/alexa signature bypass — production', () => {
  it('rejects unsigned requests when NODE_ENV=production', async () => {
    jest.replaceProperty(process.env, 'NODE_ENV', 'production');
    const res = await POST(makeRequest({
      version: '1.0',
      request: { type: 'LaunchRequest', timestamp: new Date().toISOString() },
    }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing|signature/i);
  });
});
