'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useConfirmDialog } from '@/lib/hooks/useConfirmDialog';

/**
 * Connect Google Calendar without a public URL by pasting a refresh token
 * generated via Google's OAuth 2.0 Playground. For LAN-only installs (Home
 * Assistant add-on, bare Docker on a private IP) where Google refuses to
 * register a private/non-HTTPS redirect URI.
 *
 * Write-only: the secret and refresh token are never read back to the UI.
 */
export function GoogleManualTokenForm({ onSaved }: { onSaved?: () => void }) {
  const { confirm, dialogProps } = useConfirmDialog();
  const [clientId, setClientId] = React.useState('');
  const [clientSecret, setClientSecret] = React.useState('');
  const [refreshToken, setRefreshToken] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const canSave = clientId.trim() && clientSecret.trim() && refreshToken.trim() && !saving;

  const submit = async (overwriteCredentials: boolean) => {
    const res = await fetch('/api/integrations/google/manual-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        refreshToken: refreshToken.trim(),
        overwriteCredentials,
      }),
    });
    return res;
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      let res = await submit(false);

      if (res.status === 409) {
        // A different Google client is already configured — confirm replacement.
        const data = await res.json().catch(() => ({}));
        const ok = await confirm(
          'Replace existing Google client?',
          data.message ||
            'A different Google client is already configured. Calendars connected through the browser flow will need to be re-authenticated.',
        );
        if (!ok) return;
        res = await submit(true);
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Could not connect with the pasted token.');
      }

      const data = await res.json();
      toast({
        title: 'Google Calendar connected',
        description: `${data.calendarCount ?? 0} calendar${data.calendarCount === 1 ? '' : 's'} imported.`,
        variant: 'success',
      });
      // Clear the sensitive fields; they're never hydrated from the server.
      setClientSecret('');
      setRefreshToken('');
      onSaved?.();
    } catch (err) {
      toast({
        title: 'Could not connect',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'h-9 w-full rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';
  const linkClass = 'text-primary hover:underline';

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        On a LAN-only install (no public URL), Google won&apos;t accept your address as a redirect
        URI. Instead, generate a refresh token with Google&apos;s{' '}
        <a
          href="https://developers.google.com/oauthplayground"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          OAuth 2.0 Playground
        </a>{' '}
        and paste it here — the login stays on Google&apos;s own domain.
      </p>

      <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
        <li>
          In the{' '}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Google Cloud Console
          </a>
          , create an OAuth 2.0 Client ID (Web application) and enable the{' '}
          <span className="font-medium">Google Calendar API</span>.
        </li>
        <li>
          Add <code className="rounded bg-muted px-1">https://developers.google.com/oauthplayground</code>{' '}
          to the client&apos;s <span className="font-medium">Authorized redirect URIs</span>.
        </li>
        <li>
          Open the Playground → gear icon → check{' '}
          <span className="font-medium">&ldquo;Use your own OAuth credentials&rdquo;</span> → paste the
          same Client ID and Secret.
        </li>
        <li>
          Step 1: select{' '}
          <code className="rounded bg-muted px-1">https://www.googleapis.com/auth/calendar</code> →{' '}
          <span className="font-medium">Authorize APIs</span> → sign in with the Google account you want.
        </li>
        <li>
          Step 2: <span className="font-medium">Exchange authorization code for tokens</span> → copy the{' '}
          <span className="font-medium">Refresh token</span>.
        </li>
        <li>Paste all three values below.</li>
      </ol>

      <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
        If your OAuth consent screen is in <span className="font-medium">Testing</span> mode, Google
        expires refresh tokens after 7 days. Publish the app to{' '}
        <span className="font-medium">Production</span> (no verification is needed for your own use of
        Calendar scopes) so it keeps working — otherwise you&apos;ll have to re-paste weekly.
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Client ID</span>
        <input
          className={inputClass}
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="1234567890-abc123.apps.googleusercontent.com"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Client secret</span>
        <input
          className={inputClass}
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder="GOCSPX-…"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Refresh token</span>
        <input
          className={inputClass}
          type="password"
          value={refreshToken}
          onChange={(e) => setRefreshToken(e.target.value)}
          placeholder="1//0g…"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <Button size="sm" onClick={handleSave} disabled={!canSave}>
        {saving ? 'Validating with Google…' : 'Connect with token'}
      </Button>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
