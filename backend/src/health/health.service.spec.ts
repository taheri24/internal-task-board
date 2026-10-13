import { DataSource } from 'typeorm';
import { HealthService } from './health.service';

/** The /ping endpoint must degrade gracefully: a broken database is reported, never thrown. */
describe('HealthService', () => {
  const repo = (count: number) => ({ count: jest.fn().mockResolvedValue(count) });

  function service(overrides: { initialized?: boolean; query?: jest.Mock } = {}) {
    const ds = {
      isInitialized: overrides.initialized ?? true,
      query: overrides.query ?? jest.fn().mockResolvedValue([{ server_time: new Date().toISOString() }]),
      getRepository: jest.fn().mockReturnValue(repo(0)),
    } as unknown as DataSource;
    return { ds, health: new HealthService(ds) };
  }

  it('reports ok with entity counts when the database answers', async () => {
    const countsByEntity: Record<string, number> = { User: 3, Task: 7, AuditLog: 12, RefreshToken: 2 };
    const { ds, health } = service();
    (ds.getRepository as jest.Mock).mockImplementation((entity: { name: string }) =>
      repo(countsByEntity[entity.name] ?? 0),
    );

    const report = await health.report();

    expect(report.status).toBe('ok');
    expect(report.database.status).toBe('up');
    expect(report.database.counts).toEqual({ users: 3, tasks: 7, auditLogs: 12, refreshTokens: 2 });
    expect(typeof report.database.latencyMs).toBe('number');
    expect(report.database.databaseServerTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('reports down with the driver error when the query fails', async () => {
    const { health } = service({ query: jest.fn().mockRejectedValue(new Error('connection refused')) });

    const report = await health.report();

    expect(report.status).toBe('down');
    expect(report.database.status).toBe('down');
    expect(report.database.counts).toBeNull();
    expect(report.database.error).toBe('connection refused');
  });

  it('reports down without querying when the connection was never initialized', async () => {
    const { ds, health } = service({ initialized: false });

    const report = await health.report();

    expect(report.status).toBe('down');
    expect(ds.query).not.toHaveBeenCalled();
    expect(report.database.counts).toBeNull();
  });
});
