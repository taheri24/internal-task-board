export type Role = 'owner' | 'manager' | 'member';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface PersonRef {
  id: string;
  displayName: string;
  isActive?: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  isActive: boolean;
}

export interface DirectoryEntry {
  id: string;
  displayName: string;
  role: Role;
  isActive: boolean;
}

/** TipTap JSON. Stored as jsonb on the server and never as HTML. */
export interface JSONNode {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: JSONNode[];
}

export interface Task {
  id: string;
  title: string;
  description: JSONNode;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  assignee: PersonRef | null;
  createdBy: PersonRef;
  createdAt: string;
  updatedAt: string;
}
