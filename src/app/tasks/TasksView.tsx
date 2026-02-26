'use client';

import { useState, useMemo } from 'react';
import { toast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import Link from 'next/link';
import { format, isPast, differenceInDays, formatDistanceToNow } from 'date-fns';
import {
  CheckSquare,
  Plus,
  SortAsc,
  Home,
  AlertCircle,
  Clock,
  RefreshCw,
  Users,
  CalendarDays,
  Settings,
  List,
} from 'lucide-react';
import { PlaneCelebration } from '@/components/ui/PlaneCelebration';
import { UserAvatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageWrapper } from '@/components/layout';
import { TaskModal } from '@/app/tasks/TaskModal';
import { useTasksViewData } from './useTasksViewData';
import { useAuth } from '@/components/providers';
import type { Task } from '@/types';

// ---------- Shared task row used by all modes ----------

function TaskRow({
  task,
  onToggle,
  onEdit,
  showAvatar = false,
  showList = false,
  taskLists = [],
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  showAvatar?: boolean;
  showList?: boolean;
  taskLists?: Array<{ id: string; name: string; color?: string | null }>;
}) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && !task.completed && isPast(dueDate);
  const daysUntil = dueDate ? differenceInDays(dueDate, new Date()) : null;
  const taskList = showList ? taskLists.find(l => l.id === (task as typeof task & { listId?: string }).listId) : null;

  return (
    <div
      className={cn(
        'p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors',
        task.completed ? 'opacity-60 bg-green-50/50 dark:bg-green-950/20 border-green-500/30' : '',
        isOverdue ? 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20' : !task.completed ? 'border-border' : ''
      )}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {showAvatar && task.assignedTo && (
            <UserAvatar name={task.assignedTo.name} color={task.assignedTo.color} size="sm" className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className={cn(
              'font-medium text-sm truncate',
              task.completed && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </p>
            {(dueDate || taskList) && !task.completed && (
              <div className="flex items-center gap-2 mt-0.5">
                {dueDate && (
                  <div className={cn(
                    'flex items-center gap-1 text-xs',
                    isOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                  )}>
                    <CalendarDays className="h-3 w-3" />
                    {isOverdue ? (
                      <span>Due {formatDistanceToNow(dueDate, { addSuffix: true })}</span>
                    ) : daysUntil === 0 ? (
                      <span>Due today</span>
                    ) : daysUntil === 1 ? (
                      <span>Due tomorrow</span>
                    ) : (
                      <span>Due {format(dueDate, 'MMM d')}</span>
                    )}
                  </div>
                )}
                {taskList && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: taskList.color || '#6B7280' }} />
                    <span>{taskList.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {task.priority === 'high' && (
            <Badge variant="destructive" className="text-xs">!</Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Grouped task grid (shared by Person & List modes) ----------

interface GroupDef {
  key: string;
  label: string;
  color: string;
  avatar: React.ReactNode;
  tasks: Task[];
  inlineValue: string;
  onInlineChange: (v: string) => void;
  onInlineSubmit: () => void;
  celebrationTarget?: { id: string; name: string };
}

function GroupedTaskGrid({
  groups,
  toggleTask,
  editTask,
  setCelebratingUser,
  taskLists,
}: {
  groups: GroupDef[];
  toggleTask: (id: string) => Promise<boolean>;
  editTask: (task: Task) => void;
  setCelebratingUser: (user: { id: string; name: string } | null) => void;
  taskLists: Array<{ id: string; name: string; color?: string | null }>;
}) {
  return (
    <div className={cn(
      'grid gap-2 h-full',
      groups.length <= 2 ? 'grid-cols-1 md:grid-cols-2' :
      groups.length <= 4 ? 'grid-cols-2' :
      'grid-cols-2 md:grid-cols-3'
    )}>
      {groups.map((group) => {
        const completedCount = group.tasks.filter((t) => t.completed).length;
        return (
          <div
            key={group.key}
            className="flex flex-col border-2 rounded-lg overflow-hidden bg-card/90 backdrop-blur-sm"
            style={{ borderColor: group.color }}
          >
            {/* Group header */}
            <div
              className="flex items-center gap-2 px-3 py-2 shrink-0"
              style={{ backgroundColor: group.color + '20' }}
            >
              {group.avatar}
              <h3 className="font-bold text-lg" style={{ color: group.color }}>
                {group.label}
              </h3>
              <Badge variant="outline" className="ml-auto">
                {completedCount}/{group.tasks.length}
              </Badge>
            </div>
            {/* Scrollable tasks list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* Inline add input */}
              <div className="pb-1">
                <Input
                  placeholder="Add a task..."
                  value={group.inlineValue}
                  onChange={(e) => group.onInlineChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      group.onInlineSubmit();
                    }
                  }}
                  className="h-8 text-sm"
                />
              </div>
              {group.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={async () => {
                    const success = await toggleTask(task.id);
                    if (success && group.celebrationTarget && !task.completed) {
                      const otherTasks = group.tasks.filter((t) => t.id !== task.id);
                      const allOthersCompleted = otherTasks.every((t) => t.completed);
                      if (allOthersCompleted) {
                        setCelebratingUser(group.celebrationTarget);
                      }
                    }
                  }}
                  onEdit={() => editTask(task)}
                  showList={true}
                  taskLists={taskLists}
                />
              ))}
              {group.tasks.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">No tasks</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Main TasksView ----------

export function TasksView() {
  const { requireAuth } = useAuth();
  const {
    loading, error, refreshTasks, familyMembers,
    filterPerson, setFilterPerson,
    filterPriority, setFilterPriority,
    filterCompleted, setFilterCompleted,
    filterList, setFilterList,
    sortBy, setSortBy,
    showAddModal, setShowAddModal,
    editingTask, setEditingTask,
    filteredTasks,
    toggleTask, editTask, deleteTask, handleAddClick,
    completedCount, totalCount,
    taskLists,
    autoSyncing,
    confirmDialogProps,
  } = useTasksViewData();

  // Group mode: 'none' | 'person' | 'list'
  const [groupMode, setGroupMode] = useState<'none' | 'person' | 'list'>('person');

  // Inline task add state
  const [inlineTask, setInlineTask] = useState('');
  const [inlineTaskByUser, setInlineTaskByUser] = useState<Record<string, string>>({});
  const [inlineTaskByList, setInlineTaskByList] = useState<Record<string, string>>({});

  // Celebration state
  const [celebratingUser, setCelebratingUser] = useState<{ id: string; name: string } | null>(null);

  // Group tasks by assigned user
  const tasksByUser = useMemo(() => {
    if (groupMode !== 'person') return null;

    const groups: { user: { id: string; name: string; color: string } | null; tasks: typeof filteredTasks }[] = [];

    // Group by each family member
    familyMembers.forEach((member) => {
      const userTasks = filteredTasks.filter((t) => t.assignedTo?.id === member.id);
      if (userTasks.length > 0) {
        groups.push({ user: member, tasks: userTasks });
      }
    });

    // Unassigned tasks
    const unassigned = filteredTasks.filter((t) => !t.assignedTo);
    if (unassigned.length > 0) {
      groups.push({ user: null, tasks: unassigned });
    }

    return groups;
  }, [groupMode, filteredTasks, familyMembers]);

  // Group tasks by list
  const tasksByList = useMemo(() => {
    if (groupMode !== 'list') return null;

    const groups: { list: { id: string; name: string; color: string } | null; tasks: typeof filteredTasks }[] = [];

    // Group by each task list
    taskLists.forEach((list) => {
      const listTasks = filteredTasks.filter((t) => (t as typeof t & { listId?: string }).listId === list.id);
      if (listTasks.length > 0) {
        groups.push({ list: { id: list.id, name: list.name, color: list.color || '#6B7280' }, tasks: listTasks });
      }
    });

    // Tasks with no list
    const noList = filteredTasks.filter((t) => !(t as typeof t & { listId?: string }).listId);
    if (noList.length > 0) {
      groups.push({ list: null, tasks: noList });
    }

    return groups;
  }, [groupMode, filteredTasks, taskLists]);

  const handleInlineAdd = async (assignedTo?: string, listId?: string) => {
    let value: string | undefined;
    if (assignedTo) {
      value = inlineTaskByUser[assignedTo]?.trim();
    } else if (listId) {
      value = inlineTaskByList[listId]?.trim();
    } else {
      value = inlineTask.trim();
    }
    if (!value) return;

    const user = await requireAuth('Add Task', 'Please log in to add a task');
    if (!user) return;

    try {
      const body: Record<string, string> = { title: value };
      if (assignedTo) body.assignedTo = assignedTo;
      // Include listId from explicit param, or from active filter
      const effectiveListId = listId || (filterList && filterList !== 'none' ? filterList : undefined);
      if (effectiveListId) body.listId = effectiveListId;
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Failed to create task');
      refreshTasks();
      if (assignedTo) {
        setInlineTaskByUser(prev => ({ ...prev, [assignedTo]: '' }));
      } else if (listId) {
        setInlineTaskByList(prev => ({ ...prev, [listId]: '' }));
      } else {
        setInlineTask('');
      }
    } catch (err) {
      console.error('Error creating task:', err);
      toast({ title: 'Failed to create task', variant: 'destructive' });
    }
  };

  const handleAddWithAuth = async () => {
    const user = await requireAuth('Add Task', 'Please log in to add a task');
    if (!user) return;
    handleAddClick();
  };

  return (
    <PageWrapper>
      <div className="h-screen flex flex-col">
        <header className="flex-shrink-0 border-b border-border bg-card/85 backdrop-blur-sm px-4 safe-area-top">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="hidden md:inline-flex">
                <Link href="/" aria-label="Back to dashboard"><Home className="h-5 w-5" /></Link>
              </Button>
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">Tasks</h1>
                <Badge variant="secondary">{completedCount}/{totalCount}</Badge>
                {autoSyncing && (
                  <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
                )}
              </div>
            </div>
            <Button onClick={handleAddWithAuth} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          </div>
        </header>

        <div className="hidden md:block flex-shrink-0 border-b border-border bg-card/85 backdrop-blur-sm px-4 py-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Person:</span>
              <div className="flex gap-1">
                <Button variant={filterPerson === null ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilterPerson(null)}>All</Button>
                {familyMembers.map((member) => (
                  <Button key={member.id} variant={filterPerson === member.id ? 'secondary' : 'ghost'} size="sm"
                    onClick={() => setFilterPerson(member.id)} className="gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: member.color }} />
                    {member.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Priority:</span>
              <div className="flex gap-1">
                <Button variant={filterPriority === null ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilterPriority(null)}>All</Button>
                {['high', 'medium', 'low'].map((priority) => (
                  <Button key={priority} variant={filterPriority === priority ? 'secondary' : 'ghost'} size="sm"
                    onClick={() => setFilterPriority(priority)} className="capitalize">{priority}</Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <div className="flex gap-1">
                <Button variant={filterCompleted === null ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilterCompleted(null)}>All</Button>
                <Button variant={filterCompleted === false ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilterCompleted(false)}>Active</Button>
                <Button variant={filterCompleted === true ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilterCompleted(true)}>Completed</Button>
              </div>
            </div>
            {taskLists.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">List:</span>
                <div className="flex gap-1 flex-wrap">
                  <Button variant={filterList === null ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilterList(null)}>All</Button>
                  <Button variant={filterList === 'none' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilterList('none')}>None</Button>
                  {taskLists.map((list) => (
                    <Button key={list.id} variant={filterList === list.id ? 'secondary' : 'ghost'} size="sm"
                      onClick={() => setFilterList(list.id)} className="gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: list.color || '#6B7280' }} />
                      {list.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Group:</span>
              <div className="flex gap-1">
                <Button variant={groupMode === 'none' ? 'secondary' : 'ghost'} size="sm" onClick={() => setGroupMode('none')}>
                  None
                </Button>
                <Button variant={groupMode === 'person' ? 'secondary' : 'ghost'} size="sm" onClick={() => setGroupMode('person')} className="gap-1">
                  <Users className="h-4 w-4" />
                  Person
                </Button>
                {taskLists.length > 0 && (
                  <Button variant={groupMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setGroupMode('list')} className="gap-1">
                    <List className="h-4 w-4" />
                    List
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <SortAsc className="h-4 w-4 text-muted-foreground" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-sm bg-card text-foreground border border-border rounded px-2 py-1 [&>option]:bg-card [&>option]:text-foreground">
                <option value="dueDate">Due Date</option>
                <option value="priority">Priority</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 opacity-50 animate-pulse" /><p>Loading tasks...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-destructive">
              <AlertCircle className="h-12 w-12 mb-4 opacity-50" /><p>{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => refreshTasks()}>Try Again</Button>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <CheckSquare className="h-12 w-12 mb-4 opacity-50" /><p>No tasks found</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleAddWithAuth}>Add your first task</Button>
            </div>
          ) : groupMode === 'person' && tasksByUser ? (
            <GroupedTaskGrid
              groups={tasksByUser.map(({ user, tasks }) => ({
                key: user?.id || 'unassigned',
                label: user?.name || 'Unassigned',
                color: user?.color || '#6B7280',
                avatar: user ? <UserAvatar name={user.name} color={user.color} size="sm" className="h-7 w-7" /> : <CheckSquare className="h-5 w-5 text-muted-foreground" />,
                tasks,
                inlineValue: user ? (inlineTaskByUser[user.id] || '') : inlineTask,
                onInlineChange: (v) => user ? setInlineTaskByUser(prev => ({ ...prev, [user.id]: v })) : setInlineTask(v),
                onInlineSubmit: () => handleInlineAdd(user?.id),
                celebrationTarget: user ? { id: user.id, name: user.name } : undefined,
              }))}
              toggleTask={toggleTask}
              editTask={editTask}
              setCelebratingUser={setCelebratingUser}
              taskLists={taskLists}
            />
          ) : groupMode === 'list' && tasksByList ? (
            <GroupedTaskGrid
              groups={tasksByList.map(({ list, tasks }) => ({
                key: list?.id || 'no-list',
                label: list?.name || 'No List',
                color: list?.color || '#6B7280',
                avatar: <List className="h-5 w-5" style={{ color: list?.color || '#6B7280' }} />,
                tasks,
                inlineValue: list ? (inlineTaskByList[list.id] || '') : inlineTask,
                onInlineChange: (v) => list ? setInlineTaskByList(prev => ({ ...prev, [list.id]: v })) : setInlineTask(v),
                onInlineSubmit: () => handleInlineAdd(undefined, list?.id),
              }))}
              toggleTask={toggleTask}
              editTask={editTask}
              setCelebratingUser={setCelebratingUser}
              taskLists={taskLists}
            />
          ) : (
            <div className="space-y-1 max-w-4xl mx-auto">
              <Input
                placeholder="Add a task..."
                value={inlineTask}
                onChange={(e) => setInlineTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInlineAdd();
                  }
                }}
                className="h-9 mb-2"
              />
              {filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id)}
                  onEdit={() => editTask(task)}
                  showAvatar={true}
                  showList={true}
                  taskLists={taskLists}
                />
              ))}
            </div>
          )}
        </div>

        {showAddModal && (
          <TaskModal
            onClose={() => setShowAddModal(false)}
            onSave={async (task) => {
              try {
                const response = await fetch('/api/tasks', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: task.title, description: task.description, priority: task.priority,
                    category: task.category, assignedTo: task.assignedTo?.id, dueDate: task.dueDate?.toISOString(),
                    listId: task.listId,
                  }),
                });
                if (!response.ok) throw new Error('Failed to create task');
                refreshTasks();
                setShowAddModal(false);
              } catch (err) {
                console.error('Error creating task:', err);
                toast({ title: 'Failed to create task', variant: 'destructive' });
              }
            }}
            familyMembers={familyMembers}
            taskLists={taskLists}
            defaultListId={filterList === 'none' ? null : filterList}
          />
        )}

        {editingTask && (
          <TaskModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSave={async (updatedTask) => {
              try {
                const response = await fetch(`/api/tasks/${editingTask.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: updatedTask.title, description: updatedTask.description, priority: updatedTask.priority,
                    category: updatedTask.category, assignedTo: updatedTask.assignedTo?.id,
                    dueDate: updatedTask.dueDate?.toISOString(), completed: updatedTask.completed,
                    listId: updatedTask.listId,
                  }),
                });
                if (!response.ok) throw new Error('Failed to update task');
                refreshTasks();
                setEditingTask(null);
              } catch (err) {
                console.error('Error updating task:', err);
                toast({ title: 'Failed to update task', variant: 'destructive' });
              }
            }}
            familyMembers={familyMembers}
            taskLists={taskLists}
          />
        )}

        <PlaneCelebration
          show={!!celebratingUser}
          userName={celebratingUser?.name || ''}
          onComplete={() => setCelebratingUser(null)}
        />
        <ConfirmDialog {...confirmDialogProps} />
      </div>
    </PageWrapper>
  );
}
