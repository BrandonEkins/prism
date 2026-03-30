'use client';

import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  TouchSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardData } from './useDashboardData';
import { useMobileCardOrder, loadHiddenCards } from './useMobileCardOrder';
import { useBusTracking } from '@/lib/hooks/useBusTracking';
import {
  WeatherCard,
  ClockCard,
  CalendarCard,
  ChoresCard,
  TasksCard,
  ShoppingCard,
  MealsCard,
  MessagesCard,
  BirthdaysCard,
  PointsCard,
  WishesCard,
  PhotosCard,
  BusTrackingCard,
} from './MobileCards';

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('flex items-stretch gap-0', isDragging && 'opacity-50 scale-[1.02] z-10 relative')}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        onContextMenu={(e) => e.preventDefault()}
        className="flex items-center px-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 shrink-0"
        style={{ touchAction: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export const MobileDashboard = memo(function MobileDashboard() {
  const data = useDashboardData();
  const { order, setOrder } = useMobileCardOrder();
  const { routes: busRoutes } = useBusTracking();
  const [hiddenCards] = useState(loadHiddenCards);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as string);
      const newIndex = order.indexOf(over.id as string);
      setOrder(arrayMove(order, oldIndex, newIndex));
    }
  }, [order, setOrder]);

  const cardMap: Record<string, React.ReactNode> = useMemo(() => ({
    weather: <WeatherCard data={data.weather} />,
    clock: <ClockCard />,
    calendar: <CalendarCard data={data.calendar} />,
    chores: <ChoresCard data={data.chores} />,
    tasks: <TasksCard data={data.tasks} />,
    shopping: <ShoppingCard data={data.shopping} />,
    meals: <MealsCard data={data.meals} />,
    messages: <MessagesCard data={data.messages} />,
    birthdays: <BirthdaysCard data={data.birthdays} />,
    points: <PointsCard data={data.points} />,
    wishes: <WishesCard />,
    photos: <PhotosCard />,
    busTracking: <BusTrackingCard routes={busRoutes} />,
  }), [data, busRoutes]);

  const visibleOrder = useMemo(
    () => order.filter((id) => !hiddenCards.includes(id)),
    [order, hiddenCards],
  );

  return (
    <div className="p-4 pb-8 space-y-3 max-w-lg mx-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={visibleOrder} strategy={verticalListSortingStrategy}>
          {visibleOrder.map((id) => (
            <SortableCard key={id} id={id}>
              {cardMap[id]}
            </SortableCard>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
});
