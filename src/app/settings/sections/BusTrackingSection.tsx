'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bus,
  Plus,
  Pencil,
  Trash2,
  Mail,
  RefreshCw,
  GripVertical,
  X,
  Check,
  Unplug,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { useFamily } from '@/components/providers';

interface BusRoute {
  id: string;
  studentName: string;
  userId: string | null;
  tripId: string;
  direction: 'AM' | 'PM';
  label: string;
  scheduledTime: string;
  activeDays: number[];
  checkpoints: { name: string; sortOrder: number }[];
  stopName: string | null;
  schoolName: string | null;
  enabled: boolean;
}

interface ConnectionStatus {
  connected: boolean;
  expiresAt: string | null;
  updatedAt: string | null;
}

export function BusTrackingSection() {
  const { members } = useFamily();
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [connection, setConnection] = useState<ConnectionStatus>({ connected: false, expiresAt: null, updatedAt: null });
  const [loading, setLoading] = useState(true);
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState<BusRoute | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [gmailLabel, setGmailLabel] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [routesRes, connRes, settingsRes] = await Promise.all([
        fetch('/api/bus-tracking/routes'),
        fetch('/api/bus-tracking/connection'),
        fetch('/api/settings'),
      ]);
      if (routesRes.ok) setRoutes(await routesRes.json());
      if (connRes.ok) setConnection(await connRes.json());
      if (settingsRes.ok) {
        const allSettings = await settingsRes.json();
        if (allSettings.busGmailLabel) setGmailLabel(allSettings.busGmailLabel);
      }
    } catch {
      // Silent fail — loading state will clear
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/bus-tracking/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Sync complete', description: `Processed ${data.processed} emails, ${data.newEvents} new events` });
      } else {
        toast({ title: 'Sync failed', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Sync failed', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      // Step 1: Scan emails for routes
      const discoverRes = await fetch('/api/bus-tracking/discover', { method: 'POST' });
      const discoverData = await discoverRes.json();

      if (!discoverRes.ok) {
        toast({ title: 'Discovery failed', description: discoverData.error, variant: 'destructive' });
        return;
      }

      if (!discoverData.discovered || discoverData.discovered.length === 0) {
        toast({ title: 'No routes found', description: 'No FirstView emails were found in Gmail.' });
        return;
      }

      // Step 2: Auto-create the discovered routes
      const createRes = await fetch('/api/bus-tracking/discover', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes: discoverData.discovered }),
      });
      const createData = await createRes.json();

      if (createRes.ok) {
        const parts = [];
        if (createData.created?.length > 0) parts.push(`Created: ${createData.created.join(', ')}`);
        if (createData.skipped?.length > 0) parts.push(`Skipped: ${createData.skipped.join(', ')}`);
        toast({
          title: `Discovered ${discoverData.discovered.length} route(s)`,
          description: parts.join('. ') || createData.message,
        });
        fetchData();
      } else {
        toast({ title: 'Failed to create routes', description: createData.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Discovery failed', variant: 'destructive' });
    } finally {
      setDiscovering(false);
    }
  };

  const handleSaveLabel = async (label: string) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'busGmailLabel', value: label.trim() || null }),
      });
      setGmailLabel(label.trim());
      toast({ title: 'Gmail label saved' });
    } catch {
      toast({ title: 'Failed to save label', variant: 'destructive' });
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/bus-tracking/connection', { method: 'DELETE' });
      if (res.ok) {
        setConnection({ connected: false, expiresAt: null, updatedAt: null });
        toast({ title: 'Gmail disconnected' });
      }
    } catch {
      toast({ title: 'Failed to disconnect', variant: 'destructive' });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    try {
      const res = await fetch(`/api/bus-tracking/routes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRoutes(prev => prev.filter(r => r.id !== id));
        toast({ title: 'Route deleted' });
      }
    } catch {
      toast({ title: 'Failed to delete route', variant: 'destructive' });
    }
  };

  const handleToggleRoute = async (route: BusRoute) => {
    try {
      const res = await fetch(`/api/bus-tracking/routes/${route.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !route.enabled }),
      });
      if (res.ok) {
        setRoutes(prev => prev.map(r => r.id === route.id ? { ...r, enabled: !r.enabled } : r));
      }
    } catch {
      toast({ title: 'Failed to update route', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bus Tracking</h2>
        <p className="text-muted-foreground">
          Track school bus arrivals by connecting to your Gmail for FirstView notifications.
        </p>
      </div>

      {/* Gmail Connection Card */}
      <GmailConnectionCard
        connection={connection}
        syncing={syncing}
        disconnecting={disconnecting}
        onSync={handleSync}
        onDisconnect={handleDisconnect}
        gmailLabel={gmailLabel}
        onSaveLabel={handleSaveLabel}
      />

      {/* Bus Routes Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Bus Routes</CardTitle>
              <CardDescription>Configure tracked bus routes and their checkpoints.</CardDescription>
            </div>
            <div className="flex gap-2">
              {connection.connected && (
                <Button size="sm" variant="outline" onClick={handleDiscover} disabled={discovering}>
                  <Search className={`h-4 w-4 mr-1 ${discovering ? 'animate-pulse' : ''}`} />
                  {discovering ? 'Scanning...' : 'Discover from Emails'}
                </Button>
              )}
              <Button size="sm" onClick={() => { setEditingRoute(null); setShowRouteDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Route
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}
            </div>
          ) : routes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No bus routes configured yet. Add a route to start tracking.
            </p>
          ) : (
            <div className="space-y-2">
              {routes.map(route => (
                <RouteRow
                  key={route.id}
                  route={route}
                  onEdit={() => { setEditingRoute(route); setShowRouteDialog(true); }}
                  onDelete={() => handleDeleteRoute(route.id)}
                  onToggle={() => handleToggleRoute(route)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Route Add/Edit Dialog */}
      {showRouteDialog && (
        <RouteDialog
          route={editingRoute}
          members={members}
          onClose={() => setShowRouteDialog(false)}
          onSaved={(saved) => {
            if (editingRoute) {
              setRoutes(prev => prev.map(r => r.id === saved.id ? saved : r));
            } else {
              setRoutes(prev => [...prev, saved]);
            }
            setShowRouteDialog(false);
          }}
        />
      )}
    </div>
  );
}


function GmailConnectionCard({
  connection,
  syncing,
  disconnecting,
  onSync,
  onDisconnect,
  gmailLabel,
  onSaveLabel,
}: {
  connection: ConnectionStatus;
  syncing: boolean;
  disconnecting: boolean;
  onSync: () => void;
  onDisconnect: () => void;
  gmailLabel: string;
  onSaveLabel: (label: string) => void;
}) {
  const [labelInput, setLabelInput] = useState(gmailLabel);
  const labelDirty = labelInput.trim() !== gmailLabel;

  // Sync external changes
  useEffect(() => { setLabelInput(gmailLabel); }, [gmailLabel]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Gmail Connection</CardTitle>
              <CardDescription>
                Connect Gmail to receive FirstView bus notifications.
              </CardDescription>
            </div>
          </div>
          {connection.connected ? (
            <Badge variant="default" className="bg-green-600">Connected</Badge>
          ) : (
            <Badge variant="secondary">Not Connected</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          {connection.connected ? (
            <>
              <Button size="sm" variant="outline" onClick={onSync} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              <Button size="sm" variant="outline" onClick={onDisconnect} disabled={disconnecting}>
                <Unplug className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <a href="/api/auth/google-bus">
                <Mail className="h-4 w-4 mr-1" />
                Connect Gmail
              </a>
            </Button>
          )}
        </div>
        {connection.connected && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Gmail Label</Label>
              <Input
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                placeholder="e.g. bus"
                className="h-8 text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-0.5">
                If you filter bus emails to a Gmail label, enter it here. Leave blank to search all mail.
              </p>
            </div>
            {labelDirty && (
              <Button size="sm" onClick={() => onSaveLabel(labelInput)}>
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function RouteRow({
  route,
  onEdit,
  onDelete,
  onToggle,
}: {
  route: BusRoute;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const geofenceCount = route.checkpoints?.length || 0;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="flex items-center gap-3 min-w-0">
        <Bus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{route.label}</span>
            <Badge variant="outline" className="text-[10px]">{route.direction}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Trip {route.tripId} &middot; {route.scheduledTime}
            {geofenceCount > 0 && <> &middot; {geofenceCount} geofence{geofenceCount !== 1 ? 's' : ''}</>}
            {route.stopName && <> &middot; Stop</>}
            {route.schoolName && <> &middot; School</>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Switch checked={route.enabled} onCheckedChange={onToggle} />
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}


function RouteDialog({
  route,
  members,
  onClose,
  onSaved,
}: {
  route: BusRoute | null;
  members: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (route: BusRoute) => void;
}) {
  const isEditing = !!route;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentName: route?.studentName || '',
    userId: route?.userId || '',
    tripId: route?.tripId || '',
    direction: route?.direction || 'AM' as 'AM' | 'PM',
    label: route?.label || '',
    scheduledTime: route?.scheduledTime || '07:00',
    stopName: route?.stopName || '',
    schoolName: route?.schoolName || '',
    checkpoints: route?.checkpoints || [] as { name: string; sortOrder: number }[],
  });
  const [newCheckpointName, setNewCheckpointName] = useState('');

  const addCheckpoint = () => {
    if (!newCheckpointName.trim()) return;
    setForm(prev => ({
      ...prev,
      checkpoints: [
        ...prev.checkpoints,
        { name: newCheckpointName.trim(), sortOrder: prev.checkpoints.length },
      ],
    }));
    setNewCheckpointName('');
  };

  const removeCheckpoint = (index: number) => {
    setForm(prev => ({
      ...prev,
      checkpoints: prev.checkpoints
        .filter((_, i) => i !== index)
        .map((cp, i) => ({ ...cp, sortOrder: i })),
    }));
  };

  const moveCheckpoint = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= form.checkpoints.length) return;
    setForm(prev => {
      const cps = [...prev.checkpoints];
      [cps[index], cps[newIndex]] = [cps[newIndex]!, cps[index]!];
      return { ...prev, checkpoints: cps.map((cp, i) => ({ ...cp, sortOrder: i })) };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = isEditing
        ? `/api/bus-tracking/routes/${route.id}`
        : '/api/bus-tracking/routes';
      const method = isEditing ? 'PATCH' : 'POST';

      const body = {
        ...form,
        userId: form.userId || undefined,
        stopName: form.stopName || undefined,
        schoolName: form.schoolName || undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const saved = await res.json();
        onSaved(saved);
        toast({ title: isEditing ? 'Route updated' : 'Route created' });
      } else {
        const err = await res.json();
        toast({ title: 'Failed to save', description: err.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Route' : 'Add Bus Route'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Student Name</Label>
              <Input
                value={form.studentName}
                onChange={e => setForm(p => ({ ...p, studentName: e.target.value }))}
                placeholder="e.g. Emma"
              />
            </div>
            <div>
              <Label>Family Member</Label>
              <Select value={form.userId} onValueChange={v => setForm(p => ({ ...p, userId: v }))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Label</Label>
            <Input
              value={form.label}
              onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
              placeholder="e.g. Emma Morning Pickup"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Trip ID</Label>
              <Input
                value={form.tripId}
                onChange={e => setForm(p => ({ ...p, tripId: e.target.value }))}
                placeholder="e.g. 28-C"
              />
            </div>
            <div>
              <Label>Direction</Label>
              <Select value={form.direction} onValueChange={v => setForm(p => ({ ...p, direction: v as 'AM' | 'PM' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM (Pickup)</SelectItem>
                  <SelectItem value="PM">PM (Dropoff)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled</Label>
              <Input
                type="time"
                value={form.scheduledTime}
                onChange={e => setForm(p => ({ ...p, scheduledTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stop Name</Label>
              <Input
                value={form.stopName}
                onChange={e => setForm(p => ({ ...p, stopName: e.target.value }))}
                placeholder="Bus stop name"
              />
            </div>
            <div>
              <Label>School Name</Label>
              <Input
                value={form.schoolName}
                onChange={e => setForm(p => ({ ...p, schoolName: e.target.value }))}
                placeholder="School name"
              />
            </div>
          </div>

          {/* Checkpoints editor */}
          <div>
            <Label>Geofence Checkpoints (in order)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Add the ordered geofence labels from FirstView. These are the distance-based notification zones.
            </p>

            {form.checkpoints.length > 0 && (
              <div className="space-y-1 mb-2">
                {form.checkpoints.map((cp, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded border text-sm">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <Input
                      value={cp.name}
                      onChange={e => {
                        const newName = e.target.value;
                        setForm(prev => ({
                          ...prev,
                          checkpoints: prev.checkpoints.map((c, j) =>
                            j === i ? { ...c, name: newName } : c
                          ),
                        }));
                      }}
                      className="flex-1 h-7 text-sm"
                    />
                    <div className="flex gap-0.5 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={i === 0}
                        onClick={() => moveCheckpoint(i, -1)}
                      >
                        <span className="text-xs">&uarr;</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={i === form.checkpoints.length - 1}
                        onClick={() => moveCheckpoint(i, 1)}
                      >
                        <span className="text-xs">&darr;</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeCheckpoint(i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newCheckpointName}
                onChange={e => setNewCheckpointName(e.target.value)}
                placeholder="Checkpoint name"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCheckpoint())}
              />
              <Button size="sm" variant="outline" onClick={addCheckpoint} disabled={!newCheckpointName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.studentName || !form.tripId || !form.label}>
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
