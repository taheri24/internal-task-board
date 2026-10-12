import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

export interface AuditEntry {
  actorId: string | null;
  entity: 'task' | 'user';
  entityId: string;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.repo.save(
      this.repo.create({
        actorId: entry.actorId,
        entity: entry.entity,
        entityId: entry.entityId,
        action: entry.action,
        before: entry.before ?? null,
        after: entry.after ?? null,
        ip: entry.ip ?? null,
      }),
    );
  }
}
