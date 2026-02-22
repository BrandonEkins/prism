import { test, expect } from '@playwright/test';
import { loginViaAPI, logout, getFirstParent, getFirstChild, FamilyMember } from './helpers/auth';
import { deleteMessageByContent } from './helpers/cleanup';

const TEST_MSG = `E2E Message ${Date.now()}`;
const EDITED_MSG = `${TEST_MSG} (edited)`;

test.describe('Message CRUD', () => {
  let parent: FamilyMember;
  let child: FamilyMember | null = null;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    parent = await getFirstParent(page);
    try {
      child = await getFirstChild(page);
    } catch {
      // No child user
    }
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, parent.name);
  });

  test.afterEach(async ({ page }) => {
    await deleteMessageByContent(page, TEST_MSG);
    await deleteMessageByContent(page, EDITED_MSG);
    await logout(page);
  });

  test('post a message via API', async ({ page }) => {
    const createRes = await page.request.post('/api/messages', {
      data: {
        message: TEST_MSG,
        authorId: parent.id,
        pinned: false,
        important: false,
      },
    });
    expect(createRes.status()).toBe(201);
    const msg = await createRes.json();
    expect(msg.message).toBe(TEST_MSG);
    expect(msg.id).toBeTruthy();
  });

  test('message appears in listing after creation', async ({ page }) => {
    // Create message
    const createRes = await page.request.post('/api/messages', {
      data: { message: TEST_MSG, authorId: parent.id },
    });
    const msg = await createRes.json();

    // Verify in listing
    const listRes = await page.request.get('/api/messages');
    const data = await listRes.json();
    const messages = data.messages || data || [];
    const found = messages.find((m: { id: string }) => m.id === msg.id);
    expect(found).toBeTruthy();
    expect(found.message).toBe(TEST_MSG);
  });

  test('toggle pin on a message', async ({ page }) => {
    // Create unpinned message
    const createRes = await page.request.post('/api/messages', {
      data: { message: TEST_MSG, authorId: parent.id, pinned: false },
    });
    const msg = await createRes.json();
    expect(msg.pinned).toBe(false);

    // Pin it
    const pinRes = await page.request.patch(`/api/messages/${msg.id}`, {
      data: { pinned: true },
    });
    expect(pinRes.ok()).toBeTruthy();
    const pinned = await pinRes.json();
    expect(pinned.pinned).toBe(true);

    // Unpin it
    const unpinRes = await page.request.patch(`/api/messages/${msg.id}`, {
      data: { pinned: false },
    });
    expect(unpinRes.ok()).toBeTruthy();
    const unpinned = await unpinRes.json();
    expect(unpinned.pinned).toBe(false);
  });

  test('delete a message', async ({ page }) => {
    // Create message
    const createRes = await page.request.post('/api/messages', {
      data: { message: TEST_MSG, authorId: parent.id },
    });
    const msg = await createRes.json();

    // Delete it
    const deleteRes = await page.request.delete(`/api/messages/${msg.id}`);
    expect(deleteRes.ok()).toBeTruthy();

    // Verify it's gone from listing
    const listRes = await page.request.get('/api/messages');
    const data = await listRes.json();
    const messages = data.messages || data || [];
    const found = messages.find((m: { id: string }) => m.id === msg.id);
    expect(found).toBeFalsy();
  });

  test('parent can delete another user message', async ({ page }) => {
    test.skip(!child, 'No child user available');

    // Create message as child
    const createRes = await page.request.post('/api/messages', {
      data: { message: TEST_MSG, authorId: child!.id },
    });
    const msg = await createRes.json();

    // Delete as parent (parent should have canDeleteAnyMessage)
    const deleteRes = await page.request.delete(`/api/messages/${msg.id}`);
    expect(deleteRes.ok()).toBeTruthy();
  });
});
