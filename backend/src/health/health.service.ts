import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditLog } from '../audit/audit-log.entity';
import { RefreshToken } from '../auth/refresh-token.entity';
import { Task } from '../todos/task.entity';
import { User } from '../users/user.entity';

export interface EntityCounts {
  users: number;
  tasks: number;
  auditLogs: number;
  refreshTokens: number;
}

export interface PingReport {
  status: 'ok' | 'down';
  timestamp: string;
  uptimeSeconds: number;
  system: {
    nodeVersion: string;
    pid: number;
    memoryRssMb: number;
    memoryHeapUsedMb: number;
  };
  database: {
    status: 'up' | 'down';
    latencyMs: number | null;
    databaseServerTime: string | null;
    counts: EntityCounts | null;
    error?: string;
  };
}

/**
 * Answers "is this process alive, can it reach PostgreSQL, and how much data is there?"
 * without touching authentication, so probes and the /ping page work while signed out.
 * Only aggregate row counts are exposed — never row contents.
 */
@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(private readonly dataSource: DataSource) {}

  async report(): Promise<PingReport> {
    const database = await this.checkDatabase();
    return {
      status: database.status === 'up' ? 'ok' : 'down',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      system: {
        nodeVersion: process.version,
        pid: process.pid,
        memoryRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        memoryHeapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      database,
    };
  }

  private async checkDatabase(): Promise<PingReport['database']> {
    if (!this.dataSource.isInitialized) {
      return { status: 'down', latencyMs: null, databaseServerTime: null, counts: null, error: 'Connection is not initialized' };
    }

    const startedAt = Date.now();
    try {
      const rows = await this.dataSource.query('SELECT NOW() AS server_time');
      const databaseServerTime = rows?.[0]?.server_time ? new Date(rows[0].server_time).toISOString() : null;
      return {
        status: 'up',
        latencyMs: Date.now() - startedAt,
        databaseServerTime,
        counts: await this.counts(),
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        databaseServerTime: null,
        counts: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** The Task repository excludes soft-deleted rows, so `tasks` is the live board size. */
  private async counts(): Promise<EntityCounts> {
    const [users, tasks, auditLogs, refreshTokens] = await Promise.all([
      this.dataSource.getRepository(User).count(),
      this.dataSource.getRepository(Task).count(),
      this.dataSource.getRepository(AuditLog).count(),
      this.dataSource.getRepository(RefreshToken).count(),
    ]);
    return { users, tasks, auditLogs, refreshTokens };
  }
}
