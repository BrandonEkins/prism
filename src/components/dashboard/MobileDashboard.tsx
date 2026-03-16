'use client';

import { memo, useMemo } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import Link from 'next/link';
import {
  Calendar,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudSun,
  MessageSquare,
  CheckSquare,
  ClipboardList,
  ShoppingCart,
  UtensilsCrossed,
  Cake,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardData } from './useDashboardData';
import type { CalendarEvent } from '@/types/calendar';

export const MobileDashboard = memo(function MobileDashboard() {
  const data = useDashboardData();

  return (
    <div className="p-4 pb-20 space-y-3 max-w-lg mx-auto">
      <WeatherCard data={data.weather} />
      <CalendarCard data={data.calendar} />
      <ChoresCard data={data.chores} />
      <TasksCard data={data.tasks} />
      <ShoppingCard data={data.shopping} />
      <MealsCard data={data.meals} />
      <MessagesCard data={data.messages} />
      <BirthdaysCard data={data.birthdays} />
    </div>
  );
});

function CardShell({ href, icon, title, count, children }: {
  href: string;
  icon: React.ReactNode;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="block">
      <div className="bg-card/85 backdrop-blur-sm rounded-xl border border-border p-3 hover:border-primary/30 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold text-sm">{title}</h3>
            {count !== undefined && count > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{count}</span>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        {children}
      </div>
    </Link>
  );
}

function WeatherCard({ data }: { data: ReturnType<typeof useDashboardData>['weather'] }) {
  if (data.loading || !data.data) return null;
  const w = data.data as { temperature?: number; condition?: string; description?: string };
  if (!w.temperature) return null;

  const iconCls = 'h-5 w-5';
  const icon = w.condition === 'sunny' ? <Sun className={iconCls} /> :
    w.condition === 'partly-cloudy' ? <CloudSun className={iconCls} /> :
    w.condition === 'rainy' || w.condition === 'stormy' ? <CloudRain className={iconCls} /> :
    w.condition === 'snowy' ? <CloudSnow className={iconCls} /> :
    <Cloud className={iconCls} />;

  return (
    <div className="bg-card/85 backdrop-blur-sm rounded-xl border border-border p-3 flex items-center gap-3">
      {icon}
      <span className="text-2xl font-light tabular-nums">{Math.round(w.temperature)}°F</span>
      <span className="text-sm text-muted-foreground capitalize">{w.description}</span>
    </div>
  );
}

function CalendarCard({ data }: { data: ReturnType<typeof useDashboardData>['calendar'] }) {
  const upcoming = useMemo(() => {
    if (!data.events) return [];
    const now = new Date();
    return data.events
      .filter((e: CalendarEvent) => e.endTime > now)
      .sort((a: CalendarEvent, b: CalendarEvent) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, 3);
  }, [data.events]);

  return (
    <CardShell href="/calendar" icon={<Calendar className="h-4 w-4 text-blue-500" />} title="Calendar" count={upcoming.length}>
      {upcoming.length === 0 ? (
        <p className="text-xs text-muted-foreground">No upcoming events</p>
      ) : (
        <div className="space-y-1">
          {upcoming.map((e: CalendarEvent) => (
            <div key={e.id} className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
              <span className="truncate flex-1">{e.title}</span>
              <span className="text-muted-foreground shrink-0">
                {isToday(e.startTime) ? format(e.startTime, 'h:mm a') :
                 isTomorrow(e.startTime) ? `Tomorrow ${format(e.startTime, 'h:mm a')}` :
                 format(e.startTime, 'EEE h:mm a')}
              </span>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

function ChoresCard({ data }: { data: ReturnType<typeof useDashboardData>['chores'] }) {
  const dueCount = useMemo(() => {
    if (!data.chores) return 0;
    return data.chores.filter((c: { enabled: boolean; nextDue?: string }) =>
      c.enabled && (!c.nextDue || new Date(c.nextDue) <= new Date())
    ).length;
  }, [data.chores]);

  return (
    <CardShell href="/chores" icon={<ClipboardList className="h-4 w-4 text-orange-500" />} title="Chores" count={dueCount}>
      <p className="text-xs text-muted-foreground">
        {dueCount === 0 ? 'All caught up!' : `${dueCount} chore${dueCount > 1 ? 's' : ''} due`}
      </p>
    </CardShell>
  );
}

function TasksCard({ data }: { data: ReturnType<typeof useDashboardData>['tasks'] }) {
  const incomplete = useMemo(() => {
    if (!data.tasks) return [];
    return data.tasks.filter((t: { completed?: boolean }) => !t.completed).slice(0, 3);
  }, [data.tasks]);

  return (
    <CardShell href="/tasks" icon={<CheckSquare className="h-4 w-4 text-green-500" />} title="Tasks" count={incomplete.length}>
      {incomplete.length === 0 ? (
        <p className="text-xs text-muted-foreground">No tasks</p>
      ) : (
        <div className="space-y-1">
          {incomplete.map((t: { id: string; title: string }) => (
            <div key={t.id} className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
              <span className="truncate">{t.title}</span>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

function ShoppingCard({ data }: { data: ReturnType<typeof useDashboardData>['shopping'] }) {
  const totalUnchecked = useMemo(() => {
    if (!data.lists) return 0;
    return data.lists.reduce((sum, list) =>
      sum + (list.items?.filter((i) => !i.checked).length || 0), 0);
  }, [data.lists]);

  return (
    <CardShell href="/shopping" icon={<ShoppingCart className="h-4 w-4 text-purple-500" />} title="Shopping" count={totalUnchecked}>
      <p className="text-xs text-muted-foreground">
        {totalUnchecked === 0 ? 'Lists are clear' : `${totalUnchecked} item${totalUnchecked > 1 ? 's' : ''} to get`}
      </p>
    </CardShell>
  );
}

function MealsCard({ data }: { data: ReturnType<typeof useDashboardData>['meals'] }) {
  const todayMeal = useMemo(() => {
    if (!data.meals) return null;
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDay = days[now.getDay()];
    // Find a dinner meal for today's day of week
    return data.meals.find((m) => m.dayOfWeek === todayDay && m.mealType === 'dinner')
      || data.meals.find((m) => m.dayOfWeek === todayDay)
      || null;
  }, [data.meals]);

  return (
    <CardShell href="/meals" icon={<UtensilsCrossed className="h-4 w-4 text-amber-500" />} title="Meals">
      <p className="text-xs text-muted-foreground">
        {todayMeal ? `Today: ${todayMeal.name || todayMeal.recipe || 'Planned'}` : 'No meal planned today'}
      </p>
    </CardShell>
  );
}

function MessagesCard({ data }: { data: ReturnType<typeof useDashboardData>['messages'] }) {
  const latest = data.messages?.[0];

  return (
    <CardShell href="/messages" icon={<MessageSquare className="h-4 w-4 text-sky-500" />} title="Messages" count={data.messages?.length}>
      <p className="text-xs text-muted-foreground truncate">
        {latest ? `${latest.author.name}: ${latest.message}` : 'No messages'}
      </p>
    </CardShell>
  );
}

function BirthdaysCard({ data }: { data: ReturnType<typeof useDashboardData>['birthdays'] }) {
  const upcoming = useMemo(() => {
    if (!data.birthdays) return [];
    return data.birthdays.slice(0, 2);
  }, [data.birthdays]);

  if (upcoming.length === 0) return null;

  return (
    <CardShell href="/birthdays" icon={<Cake className="h-4 w-4 text-pink-500" />} title="Birthdays" count={upcoming.length}>
      <div className="space-y-1">
        {upcoming.map((b) => (
          <p key={b.id} className="text-xs text-muted-foreground">
            {b.name} — {b.nextBirthday ? format(new Date(b.nextBirthday), 'MMM d') : ''}
          </p>
        ))}
      </div>
    </CardShell>
  );
}
