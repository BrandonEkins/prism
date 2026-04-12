'use client';

import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cloud, ChevronRight, ExternalLink, Check } from 'lucide-react';

interface WeatherStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function WeatherStep({ onNext, onBack }: WeatherStepProps) {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/setup/credentials/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.error || 'Failed to save API key', variant: 'destructive' });
        return;
      }
      setSaved(true);
      toast({ title: 'Weather API key saved' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          <CardTitle>Weather</CardTitle>
        </div>
        <CardDescription>
          Prism uses OpenWeatherMap to show current conditions and forecasts. A free account
          gives you everything you need.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>
            Go to{' '}
            <a
              href="https://openweathermap.org/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              openweathermap.org <ExternalLink className="h-3 w-3" />
            </a>{' '}
            and sign up for a free account.
          </li>
          <li>Navigate to <strong>API keys</strong> in your profile.</li>
          <li>Copy your default key (or create a new one).</li>
          <li>Note: new keys can take up to 2 hours to activate.</li>
        </ol>

        <div className="space-y-1">
          <Label htmlFor="owm-key">API Key</Label>
          <Input
            id="owm-key"
            type="password"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        {saved && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" />
            API key saved successfully
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack} className="flex-1">Back</Button>
          {!saved ? (
            <Button onClick={save} disabled={!apiKey.trim() || saving} className="flex-1">
              Save &amp; continue
            </Button>
          ) : (
            <Button onClick={onNext} className="flex-1">
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          <button onClick={onNext} className="hover:underline">
            Skip for now — configure in Settings later
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
