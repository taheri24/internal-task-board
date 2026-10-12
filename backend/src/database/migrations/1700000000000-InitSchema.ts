import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL UNIQUE,
        display_name varchar(120) NOT NULL,
        password_hash varchar(255) NOT NULL,
        role varchar(16) NOT NULL DEFAULT 'member' CHECK (role IN ('owner','manager','member')),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash varchar(64) NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id)`);

    await q.query(`
      CREATE TABLE tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(200) NOT NULL,
        description jsonb NOT NULL DEFAULT '{"type":"doc"}',
        status varchar(16) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
        priority varchar(16) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
        assignee_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        created_by_id uuid NOT NULL REFERENCES users(id),
        due_date date NULL,
        deleted_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_tasks_assignee ON tasks(assignee_id)`);
    await q.query(`CREATE INDEX idx_tasks_creator ON tasks(created_by_id)`);
    await q.query(`CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL`);

    await q.query(`
      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        entity varchar(32) NOT NULL,
        entity_id uuid NOT NULL,
        action varchar(32) NOT NULL,
        "before" jsonb NULL,
        "after" jsonb NULL,
        ip varchar(64) NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS audit_logs`);
    await q.query(`DROP TABLE IF EXISTS tasks`);
    await q.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await q.query(`DROP TABLE IF EXISTS users`);
  }
}
