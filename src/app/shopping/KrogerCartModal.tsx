'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Check, X, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShoppingItem } from '@/types';

interface KrogerProductCandidate {
  productId: string;
  upc: string;
  brand?: string;
  description: string;
  size?: string;
  imageUrl?: string;
  price?: number;
  priceDisplay?: string;
}

interface SearchResult {
  id: string;
  query: string;
  candidates: KrogerProductCandidate[];
  preselectedProductId?: string;
}

type PickState = Map<string, string | null>; // shoppingItemId -> selected productId (null = skip)

export interface KrogerCartModalProps {
  items: ShoppingItem[];
  onClose: () => void;
}

export function KrogerCartModal({ items, onClose }: KrogerCartModalProps) {
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [picks, setPicks] = useState<PickState>(new Map());
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Fetch candidates for every item in parallel up front.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/integrations/kroger/products/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((i) => ({
              id: i.id,
              query: i.name,
              cachedProductId: i.krogerProductId ?? null,
            })),
          }),
        });
        if (cancelled) return;
        if (res.status === 401) {
          setAuthError(true);
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error(await res.text());

        const data = await res.json() as { results: SearchResult[] };
        setResults(data.results);

        // Initialize picks with the preselected productId for each item.
        const initial: PickState = new Map();
        for (const r of data.results) {
          initial.set(r.id, r.preselectedProductId ?? null);
        }
        setPicks(initial);
      } catch (err) {
        toast({
          title: err instanceof Error ? err.message : 'Failed to load Kroger products',
          variant: 'destructive',
        });
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // Intentionally only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = results[index];
  const total = results.length;

  const summary = useMemo(() => {
    let added = 0;
    let skipped = 0;
    for (const v of picks.values()) {
      if (v) added++;
      else skipped++;
    }
    return { added, skipped };
  }, [picks]);

  const pickCurrent = (productId: string | null) => {
    if (!current) return;
    setPicks((prev) => {
      const next = new Map(prev);
      next.set(current.id, productId);
      return next;
    });
  };

  const goNext = () => {
    if (index < total - 1) setIndex(index + 1);
    else setDone(true);
  };
  const goBack = () => {
    if (done) { setDone(false); return; }
    if (index > 0) setIndex(index - 1);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const selections = results
        .map((r) => {
          const productId = picks.get(r.id);
          if (!productId) return null;
          const cand = r.candidates.find((c) => c.productId === productId);
          if (!cand) return null;
          return { shoppingItemId: r.id, productId: cand.productId, upc: cand.upc };
        })
        .filter((x): x is { shoppingItemId: string; productId: string; upc: string } => x !== null);

      if (selections.length === 0) {
        toast({ title: 'Nothing selected to send', variant: 'warning' });
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/integrations/kroger/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Cart add failed');
      }

      const data = await res.json() as { count: number };
      toast({ title: `Sent ${data.count} item${data.count === 1 ? '' : 's'} to your Kroger cart` });
      onClose();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to send to Kroger',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // Render

  if (authError) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Kroger first</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Connect your Kroger / Mariano&apos;s account to send shopping items to your online cart.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button asChild>
              <a href="/api/auth/kroger">
                Connect Kroger <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (loading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Searching Kroger…</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {done
              ? 'Review & send'
              : `${index + 1} of ${total}: ${current?.query ?? ''}`}
          </DialogTitle>
        </DialogHeader>

        {!done && current && (
          <div className="space-y-2 py-2">
            {current.candidates.length === 0 ? (
              <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                No Kroger matches found for &quot;{current.query}&quot;.
              </div>
            ) : (
              <ul className="space-y-2">
                {current.candidates.map((c) => {
                  const selected = picks.get(current.id) === c.productId;
                  return (
                    <li key={c.productId}>
                      <button
                        type="button"
                        onClick={() => pickCurrent(c.productId)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded border p-2 text-left transition',
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50',
                        )}
                      >
                        {c.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.imageUrl}
                            alt=""
                            className="h-14 w-14 object-contain rounded bg-white flex-shrink-0"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded bg-muted flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {c.brand ? `${c.brand} — ` : ''}{c.description}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {[c.size, c.priceDisplay].filter(Boolean).join(' • ')}
                          </div>
                        </div>
                        {selected && <Check className="h-5 w-5 text-primary flex-shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={() => pickCurrent(null)}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded border border-dashed p-2 text-sm transition',
                picks.get(current.id) === null
                  ? 'border-destructive text-destructive bg-destructive/5'
                  : 'border-border text-muted-foreground hover:bg-muted/50',
              )}
            >
              <X className="h-4 w-4" />
              Skip this item
            </button>
          </div>
        )}

        {done && (
          <div className="space-y-3 py-2">
            <p className="text-sm">
              <span className="font-medium">{summary.added}</span> item{summary.added === 1 ? '' : 's'} ready to send
              {summary.skipped > 0 && (
                <>, <span className="font-medium">{summary.skipped}</span> skipped</>
              )}
              .
            </p>
            <ul className="max-h-60 overflow-y-auto space-y-1 text-sm border rounded p-2">
              {results.map((r) => {
                const pid = picks.get(r.id);
                const cand = pid ? r.candidates.find((c) => c.productId === pid) : null;
                return (
                  <li key={r.id} className="flex items-center gap-2">
                    {cand ? (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-muted-foreground">{r.query}</span>
                    {cand && (
                      <span className="text-xs text-muted-foreground truncate">
                        → {cand.brand ? `${cand.brand} ` : ''}{cand.description}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <DialogFooter className="flex-row sm:justify-between gap-2">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={!done && index === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {done ? (
            <Button onClick={submit} disabled={submitting || summary.added === 0}>
              {submitting ? 'Sending…' : `Send ${summary.added} to cart`}
            </Button>
          ) : (
            <Button onClick={goNext}>
              {index < total - 1 ? <>Next <ChevronRight className="h-4 w-4 ml-1" /></> : 'Review'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
