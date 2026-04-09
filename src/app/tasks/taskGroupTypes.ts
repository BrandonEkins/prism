import type { Task } from '@/types';

export type GroupBy = 'none' | 'person' | 'list';

export type GroupMode = 'none' | 'person' | 'list' | 'person_then_list' | 'list_then_person';

export interface GroupDef {
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

export interface SubGroupDef {
  key: string;
  label: string;
  color: string;
  tasks: Task[];
}

export interface NestedGroupDef {
  key: string;
  label: string;
  color: string;
  avatar: React.ReactNode;
  tasks: Task[];
  subGroups: SubGroupDef[];
  inlineValue: string;
  onInlineChange: (v: string) => void;
  onInlineSubmit: () => void;
  celebrationTarget?: { id: string; name: string };
}
