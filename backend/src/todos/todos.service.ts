import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { AuditService } from '../audit/audit.service';
import { Priority, Role, TaskStatus } from '../common/enums';
import { toPublicUser, type PublicUser } from '../users/public-user';
import { User } from '../users/user.entity';
import { CreateTodoDto, QueryTodoDto, UpdateTodoDto } from './dto';
import { Task } from './task.entity';
import * as policy from './todo-access.policy';
import { validateTipTapDoc } from './tiptap.validator';

const PRIORITY_RANK = `CASE "t".priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`;

/** Shape returned to clients. Never includes password hashes or other internal fields. */
export function toTaskDto(t: Task) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    assignee: t.assignee ? { id: t.assignee.id, displayName: t.assignee.displayName, isActive: t.assignee.isActive } : null,
    createdBy: t.createdBy ? { id: t.createdBy.id, displayName: t.createdBy.displayName } : { id: t.createdById, displayName: '' },
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    deletedAt: t.deletedAt,
  };
}

const snapshot = (t: Task) => ({
  title: t.title,
  status: t.status,
  priority: t.priority,
  assigneeId: t.assigneeId,
  dueDate: t.dueDate,
});

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly audit: AuditService,
  ) {}

  async list(actor: PublicUser, q: QueryTodoDto) {
    const qb = this.tasks
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignee', 'a')
      .leftJoinAndSelect('t.createdBy', 'c');

    if (actor.role === Role.Member) {
      qb.andWhere('(t.createdById = :uid OR t.assigneeId = :uid)', { uid: actor.id });
    }

    if (q.status) {
      const allowed = Object.values(TaskStatus) as string[];
      const statuses = q.status.split(',').filter((s) => allowed.includes(s));
      if (statuses.length) qb.andWhere('t.status IN (:...statuses)', { statuses });
    }
    if (q.priority) qb.andWhere('t.priority = :priority', { priority: q.priority });

    if (q.assigneeId === 'me') qb.andWhere('t.assigneeId = :me', { me: actor.id });
    else if (q.assigneeId === 'unassigned') qb.andWhere('t.assigneeId IS NULL');
    else if (q.assigneeId) qb.andWhere('t.assigneeId = :aid', { aid: q.assigneeId });

    if (q.q) qb.andWhere('(t.title ILIKE :term OR t.description::text ILIKE :term)', { term: `%${q.q}%` });
    if (q.dueFrom) qb.andWhere('t.dueDate >= :dueFrom', { dueFrom: q.dueFrom.slice(0, 10) });
    if (q.dueTo) qb.andWhere('t.dueDate <= :dueTo', { dueTo: q.dueTo.slice(0, 10) });

    if (q.sort === 'priority') qb.orderBy(PRIORITY_RANK, 'ASC');
    else if (q.sort === 'dueDate') qb.orderBy('t.dueDate', 'ASC', 'NULLS LAST');
    else qb.orderBy('t.updatedAt', 'DESC');

    const rows = await qb.limit(200).getMany();
    return rows.map(toTaskDto);
  }

  /** Owner and Manager only. Lists soft-deleted tasks that can be restored. */
  async trash() {
    const rows = await this.tasks.find({
      where: { deletedAt: Not(IsNull()) },
      withDeleted: true,
      relations: { assignee: true, createdBy: true },
      order: { deletedAt: 'DESC' },
    });
    return rows.map(toTaskDto);
  }

  async findOne(actor: PublicUser, id: string) {
    const task = await this.loadOr404(id);
    if (!policy.canView(actor, task)) throw new NotFoundException('Task not found');
    return toTaskDto(task);
  }

  async create(actor: PublicUser, dto: CreateTodoDto) {
    // Members are always assigned to themselves. A client-supplied assigneeId is ignored.
    const assigneeId = policy.canChangeAssignee(actor) ? (dto.assigneeId ?? actor.id) : actor.id;
    if (assigneeId) await this.assertActiveUser(assigneeId);

    const saved = await this.tasks.save(
      this.tasks.create({
        title: dto.title.trim(),
        description: validateTipTapDoc(dto.description),
        status: dto.status ?? TaskStatus.Todo,
        priority: dto.priority ?? Priority.Medium,
        assigneeId,
        createdById: actor.id,
        dueDate: dto.dueDate ? dto.dueDate.slice(0, 10) : null,
      }),
    );

    await this.audit.record({
      actorId: actor.id,
      entity: 'task',
      entityId: saved.id,
      action: 'create',
      after: snapshot(saved),
    });
    return this.findOne(actor, saved.id);
  }

  async update(actor: PublicUser, id: string, dto: UpdateTodoDto) {
    const task = await this.loadOr404(id);
    if (!policy.canView(actor, task)) throw new NotFoundException('Task not found');
    if (!policy.canEditContent(actor, task)) throw new ForbiddenException('You cannot edit this task');

    // A Member sending a different assigneeId gets an explicit 403. Sending the current value is allowed.
    if (dto.assigneeId !== undefined && dto.assigneeId !== task.assigneeId && !policy.canChangeAssignee(actor)) {
      throw new ForbiddenException('Members cannot change the assignee');
    }
    if (dto.status !== undefined && dto.status !== task.status && !policy.canChangeStatus(actor, task)) {
      throw new ForbiddenException('Only the assignee can change this task status');
    }

    const before = snapshot(task);
    const patch: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assigneeId' | 'dueDate'>> = {};

    if (dto.assigneeId !== undefined && dto.assigneeId !== task.assigneeId) {
      if (dto.assigneeId) await this.assertActiveUser(dto.assigneeId);
      patch.assigneeId = dto.assigneeId;
    }
    if (dto.title !== undefined) patch.title = dto.title.trim();
    if (dto.description !== undefined) patch.description = validateTipTapDoc(dto.description);
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.priority !== undefined) patch.priority = dto.priority;
    if (dto.dueDate !== undefined) patch.dueDate = dto.dueDate ? dto.dueDate.slice(0, 10) : null;

    // repo.update avoids TypeORM writing back a stale loaded relation object.
    await this.tasks.update(id, patch as QueryDeepPartialEntity<Task>);

    await this.audit.record({
      actorId: actor.id,
      entity: 'task',
      entityId: id,
      action: 'update',
      before,
      after: { ...before, ...patch },
    });
    return this.findOne(actor, id);
  }

  async remove(actor: PublicUser, id: string) {
    const task = await this.loadOr404(id);
    if (!policy.canView(actor, task)) throw new NotFoundException('Task not found');
    if (!policy.canDelete(actor, task)) throw new ForbiddenException('You can only delete tasks you created');

    await this.tasks.softDelete(id);
    await this.audit.record({ actorId: actor.id, entity: 'task', entityId: id, action: 'delete', before: snapshot(task) });
  }

  async restore(actor: PublicUser, id: string) {
    if (!policy.canRestore(actor)) throw new ForbiddenException('Only Owners and Managers can restore tasks');
    const task = await this.tasks.findOne({ where: { id }, withDeleted: true });
    if (!task || !task.deletedAt) throw new NotFoundException('Deleted task not found');

    await this.tasks.restore(id);
    await this.audit.record({ actorId: actor.id, entity: 'task', entityId: id, action: 'restore' });
    return this.findOne(actor, id);
  }

  private async loadOr404(id: string): Promise<Task> {
    const task = await this.tasks.findOne({ where: { id }, relations: { assignee: true, createdBy: true } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async assertActiveUser(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.isActive) throw new BadRequestException('Assignee must be an active user');
  }
}
