import { Role } from '../common/enums';

/**
 * Pure access rules for tasks. Kept free of framework code so they can be unit-tested directly.
 * The service calls these on every operation. The UI mirrors them but never enforces them.
 */
export interface Actor {
  id: string;
  role: Role;
}

export interface TaskAccessRef {
  createdById: string;
  assigneeId: string | null;
}

const isMember = (actor: Actor) => actor.role === Role.Member;
const involves = (actor: Actor, task: TaskAccessRef) =>
  task.createdById === actor.id || task.assigneeId === actor.id;

/** Members see only tasks they created or are assigned to. */
export const canView = (actor: Actor, task: TaskAccessRef) => !isMember(actor) || involves(actor, task);

/** Title, description, priority and due date. Same scope as viewing. */
export const canEditContent = canView;

/** Members can change status only on tasks assigned to them. */
export const canChangeStatus = (actor: Actor, task: TaskAccessRef) =>
  !isMember(actor) || task.assigneeId === actor.id;

/** Only Owner and Manager can reassign. Members are read-only on the assignee. */
export const canChangeAssignee = (actor: Actor) => !isMember(actor);

/** Managers and Owners can delete anything. Members can delete only tasks they created. */
export const canDelete = (actor: Actor, task: TaskAccessRef) => !isMember(actor) || task.createdById === actor.id;

/** Restore is available to Owner and Manager only. */
export const canRestore = (actor: Actor) => !isMember(actor);
