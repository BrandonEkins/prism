'use client';

import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckSquare, ChevronRight, ExternalLink, Copy, Check } from 'lucide-react';

interface MicrosoftStepProps {
  onNext: () => void;
  onBack: () => void;
  appUrl: string;
}

export function MicrosoftStep({ onNext, onBack, appUrl }: MicrosoftStepProps) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedUri, setCopiedUri] = useState('');

  const redirectUri = `${appUrl}/api/auth/microsoft/callback`;
  const tasksRedirectUri = `${appUrl}/api/auth/microsoft/tasks-callback`;

  const save = async () => {
    if (!clientId.trim() || !clientSecret.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/setup/credentials/microsoft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          redirectUri,
          tasksRedirectUri,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.error || 'Failed to save credentials', variant: 'destructive' });
        return;
      }
      setSaved(true);
      toast({ title: 'Microsoft credentials saved' });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedUri(id);
    setTimeout(() => setCopiedUri(''), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          <CardTitle>Microsoft To Do</CardTitle>
        </div>
        <CardDescription>
          Connect Microsoft To Do to sync tasks, shopping lists, and wish lists. Requires
          an Azure app registration (free).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>
            Go to{' '}
            <a
              href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Azure App Registrations <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>Register a new app → choose <strong>Personal Microsoft accounts only</strong></li>
          <li>Under <strong>Authentication</strong>, add these redirect URIs (Web platform):</li>
        </ol>

        <div className="space-y-1.5">
          {[
            { label: 'OneDrive / primary', value: redirectUri, id: 'ms' },
            { label: 'Tasks / To Do', value: tasksRedirectUri, id: 'tasks' },
          ].map(({ label, value, id }) => (
            <div key={id}>
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted rounded px-2 py-1.5 break-all">{value}</code>
                <button
                  onClick={() => copyToClipboard(value, id)}
                  className="flex-shrink-0 p-1.5 rounded hover:bg-muted transition-colors"
                  title={`Copy ${label}`}
                >
                  {copiedUri === id ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Register all URLs you access Prism from (local IP, domain, etc.).
          </p>
        </div>

        <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside" start={4}>
          <li>Under <strong>Certificates &amp; secrets</strong>, create a new client secret</li>
          <li>Copy the <strong>Client ID</strong> (Application ID) and <strong>Client Secret</strong> value below</li>
        </ol>

        <div className="space-y-3 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="ms-client-id">Client ID</Label>
            <Input
              id="ms-client-id"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ms-client-secret">Client Secret</Label>
            <Input
              id="ms-client-secret"
              type="password"
              placeholder="your secret value"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>

          {saved ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              Credentials saved — connect your account in Settings → Connected Accounts
            </div>
          ) : (
            <Button
              onClick={save}
              disabled={!clientId.trim() || !clientSecret.trim() || saving}
              variant="secondary"
              className="w-full"
            >
              Save credentials
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack} className="flex-1">Back</Button>
          <Button onClick={onNext} className="flex-1">
            {saved ? <>Finish <ChevronRight className="h-4 w-4 ml-1" /></> : 'Continue'}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground -mt-1">
          <button onClick={onNext} className="hover:underline">
            Skip — configure in Settings later
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
