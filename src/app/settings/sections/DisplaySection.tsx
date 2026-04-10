'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useTheme } from '@/components/providers';
import { useSeasonalTheme } from '@/lib/hooks/useSeasonalTheme';
import { MONTH_NAMES, seasonalPalettes } from '@/lib/themes/seasonalThemes';
import { useWallpaperSettings, useAutoOrientationSetting, useScreensaverInterval } from '@/components/layout/WallpaperBackground';
import { useScreenOrientation } from '@/lib/hooks/useScreenOrientation';
import { useOrientationOverride } from '../SettingsView';
import { useScreensaverTimeout } from '@/lib/hooks/useScreensaverTimeout';
import { useAutoHideUI } from '@/lib/hooks/useAutoHideUI';
import { useAwayModeTimeout } from '@/lib/hooks/useAwayModeTimeout';

function getCurrentMonthNum(): number {
  return new Date().getMonth() + 1;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function DisplaySection() {
  const { theme, setTheme } = useTheme();
  const { seasonalTheme, setSeasonalTheme, palette } = useSeasonalTheme();

  const mode: 'auto' | 'manual' | 'off' =
    seasonalTheme === 'none' ? 'off' :
    seasonalTheme === 'auto' ? 'auto' : 'manual';

  const setMode = (m: 'auto' | 'manual' | 'off') => {
    if (m === 'off') setSeasonalTheme('none');
    else if (m === 'auto') setSeasonalTheme('auto');
    else setSeasonalTheme(getCurrentMonthNum());
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Appearance</h2>
        <p className="text-muted-foreground">
          Customize how the dashboard looks and behaves
        </p>
      </div>

      <SectionDivider label="Theme" />

      <Card>
        <CardHeader>
          <CardTitle>Color Scheme</CardTitle>
          <CardDescription>
            Choose your preferred color scheme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              onClick={() => setTheme('light')}
              className="flex-1"
            >
              <Sun className="h-4 w-4 mr-2" />
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              onClick={() => setTheme('dark')}
              className="flex-1"
            >
              <Moon className="h-4 w-4 mr-2" />
              Dark
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              onClick={() => setTheme('system')}
              className="flex-1"
            >
              <Monitor className="h-4 w-4 mr-2" />
              System
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seasonal Theme</CardTitle>
          <CardDescription>
            Add seasonal color accents to the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            {(['auto', 'manual', 'off'] as const).map((m) => (
              <Button
                key={m}
                variant={mode === m ? 'default' : 'outline'}
                onClick={() => setMode(m)}
                className="flex-1 capitalize"
              >
                {m === 'auto' ? 'Auto' : m === 'manual' ? 'Manual' : 'Off'}
              </Button>
            ))}
          </div>

          {palette && (
            <div className="flex items-center gap-3 p-3 rounded-md border border-border">
              <div className="flex gap-1.5">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: `hsl(${palette.light.accent})` }}
                  title="Accent"
                />
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: `hsl(${palette.light.highlight})` }}
                  title="Highlight"
                />
                <div
                  className="w-6 h-6 rounded-full border border-border"
                  style={{ backgroundColor: `hsl(${palette.light.subtle})` }}
                  title="Subtle"
                />
              </div>
              <span className="text-sm font-medium">
                {palette.label} — {palette.name}
              </span>
            </div>
          )}

          {mode === 'manual' && (
            <div className="grid grid-cols-4 gap-2">
              {MONTH_NAMES.map((name, i) => {
                const month = i + 1;
                const p = seasonalPalettes[month]!;
                const selected = seasonalTheme === month;
                return (
                  <button
                    key={month}
                    onClick={() => setSeasonalTheme(month)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors',
                      selected
                        ? 'border-foreground bg-accent text-accent-foreground'
                        : 'border-border hover:bg-accent/50'
                    )}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `hsl(${p.light.accent})` }}
                    />
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SectionDivider label="Wallpaper & Display" />

      <WallpaperSettingsCard />

      <OrientationCard />

      <SectionDivider label="Behavior" />

      <TimersCard />

      <LocationCard />
    </div>
  );
}

function TimersCard() {
  const { timeout: ssTimeout, setTimeout: setSsTimeout } = useScreensaverTimeout();
  const { interval: photoInterval, setInterval: setPhotoInterval } = useScreensaverInterval();
  const { autoHideEnabled, setAutoHideEnabled } = useAutoHideUI();
  const { timeout: awayTimeout, setTimeout: setAwayTimeout } = useAwayModeTimeout();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timers &amp; Auto-Activation</CardTitle>
        <CardDescription>
          Configure screensaver, auto-hide, and away mode inactivity timers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Screensaver */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Screensaver</h4>
          <div className="flex items-center gap-3 pl-2">
            <span className="text-sm text-muted-foreground">Activate after</span>
            <select
              value={ssTimeout}
              onChange={(e) => setSsTimeout(Number(e.target.value))}
              className="border border-border rounded px-2 py-1 text-sm bg-background"
            >
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
              <option value={600}>10 minutes</option>
              <option value={3600}>1 hour</option>
              <option value={0}>Never</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pl-2">
            <span className="text-sm text-muted-foreground">Rotate photos every</span>
            <select
              value={photoInterval}
              onChange={(e) => setPhotoInterval(Number(e.target.value))}
              className="border border-border rounded px-2 py-1 text-sm bg-background"
            >
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={600}>10 minutes</option>
              <option value={3600}>1 hour</option>
              <option value={0}>Never (static)</option>
            </select>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Auto-Hide Navigation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Auto-Hide Navigation</h4>
              <p className="text-xs text-muted-foreground">Hide nav and toolbar after 10s of inactivity</p>
            </div>
            <Switch
              checked={autoHideEnabled}
              onCheckedChange={(checked) => {
                setAutoHideEnabled(checked);
                window.dispatchEvent(new Event('prism:auto-hide-change'));
              }}
            />
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Away Mode */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Away Mode Auto-Activation</h4>
          <div className="flex items-center gap-3 pl-2">
            <span className="text-sm text-muted-foreground">Activate after</span>
            <select
              value={awayTimeout}
              onChange={(e) => setAwayTimeout(Number(e.target.value))}
              className="border border-border rounded px-2 py-1 text-sm bg-background"
            >
              <option value={0}>Never (manual only)</option>
              <option value={4}>4 hours</option>
              <option value={8}>8 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>1 day</option>
              <option value={48}>2 days</option>
              <option value={72}>3 days</option>
              <option value={168}>1 week</option>
            </select>
            <span className="text-sm text-muted-foreground">of no interaction</span>
          </div>
          <p className="text-xs text-muted-foreground pl-2">
            After the specified idle time, Away Mode activates automatically for privacy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function WallpaperSettingsCard() {
  const { enabled, setEnabled, interval, setInterval } = useWallpaperSettings();
  const { enabled: autoOrientation, setEnabled: setAutoOrientation } = useAutoOrientationSetting();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Background Wallpaper</CardTitle>
        <CardDescription>
          Show a rotating photo behind the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Enable wallpaper</span>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
        {enabled && (
          <>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Rotate every</span>
              <select
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                className="border border-border rounded px-2 py-1 text-sm bg-background"
              >
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
                <option value={3600}>1 hour</option>
                <option value={0}>Never (static)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Auto-match photos to screen orientation</span>
                <p className="text-xs text-muted-foreground">
                  Only show landscape photos on landscape screens and portrait on portrait screens
                </p>
              </div>
              <Switch
                checked={autoOrientation}
                onCheckedChange={setAutoOrientation}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function OrientationCard() {
  const detectedOrientation = useScreenOrientation();
  const { override: orientationOverride, setOverride: setOrientationOverride } = useOrientationOverride();
  const effectiveOrientation = orientationOverride === 'auto' ? detectedOrientation : orientationOverride;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screen Orientation</CardTitle>
        <CardDescription>
          Detected orientation is used for photo filtering and wallpaper matching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Current:</span>
          <span className="text-sm font-medium capitalize">{effectiveOrientation}</span>
          {orientationOverride === 'auto' && (
            <span className="text-xs text-muted-foreground">(detected)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Override:</span>
          {(['auto', 'landscape', 'portrait'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setOrientationOverride(opt)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md border transition-colors capitalize',
                orientationOverride === opt
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-accent/50'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LocationCard() {
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchLocation = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const loc = data.settings?.location as { zipCode?: string; city?: string; state?: string } | undefined;
        if (loc) {
          setZipCode(loc.zipCode || '');
          setCity(loc.city || '');
          setState(loc.state || '');
        }
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  const saveLocation = async (patch: { zipCode?: string; city?: string; state?: string }) => {
    const updated = { zipCode: patch.zipCode ?? zipCode, city: patch.city ?? city, state: patch.state ?? state };
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'location', value: updated }),
      });
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location</CardTitle>
        <CardDescription>
          Set your location for weather data. Use either a US zip code or city/state.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-16 shrink-0">Zip code</span>
          <Input
            value={zipCode}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
              setZipCode(val);
            }}
            onBlur={() => saveLocation({ zipCode })}
            placeholder="e.g. 60601"
            className="w-28"
            maxLength={5}
            inputMode="numeric"
            disabled={saving}
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="w-full text-center">— or —</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-16 shrink-0">City</span>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onBlur={() => saveLocation({ city })}
            placeholder="e.g. Chicago"
            disabled={saving}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-16 shrink-0">State</span>
          <Input
            value={state}
            onChange={(e) => setState(e.target.value.slice(0, 2).toUpperCase())}
            onBlur={() => saveLocation({ state })}
            placeholder="e.g. IL"
            className="w-20"
            maxLength={2}
            disabled={saving}
          />
        </div>
        {saving && <p className="text-xs text-muted-foreground">Saving...</p>}
      </CardContent>
    </Card>
  );
}
