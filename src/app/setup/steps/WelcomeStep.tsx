'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <Card>
      <CardContent className="pt-8 pb-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Welcome to Prism</h1>
          <p className="text-muted-foreground">
            Let&apos;s get your family dashboard set up. This wizard will guide you through adding
            family members and connecting your services. You can skip any step and configure it
            later from Settings.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-left">
          {[
            { icon: '👨‍👩‍👧', label: 'Family members' },
            { icon: '🌤️', label: 'Weather' },
            { icon: '📅', label: 'Calendar sync' },
            { icon: '✅', label: 'Microsoft To Do' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-muted-foreground">
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <Button onClick={onNext} className="w-full" size="lg">
          Get started
        </Button>
      </CardContent>
    </Card>
  );
}
