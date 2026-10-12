import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true }) actorId!: string | null;

  @Column({ type: 'varchar', length: 32 }) entity!: string;

  @Column({ name: 'entity_id', type: 'uuid' }) entityId!: string;

  @Column({ type: 'varchar', length: 32 }) action!: string;

  @Column({ name: 'before', type: 'jsonb', nullable: true }) before!: Record<string, unknown> | null;

  @Column({ name: 'after', type: 'jsonb', nullable: true }) after!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true }) ip!: string | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
