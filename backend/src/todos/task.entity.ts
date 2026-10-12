import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Priority, TaskStatus } from '../common/enums';
import { User } from '../users/user.entity';
import type { TipTapDoc } from './tiptap.types';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Column({ type: 'varchar', length: 200 }) title!: string;

  @Column({ type: 'jsonb' }) description!: TipTapDoc;

  @Column({ type: 'varchar', length: 16 }) status!: TaskStatus;

  @Column({ type: 'varchar', length: 16 }) priority!: Priority;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true }) assigneeId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_id' })
  assignee!: User | null;

  @Column({ name: 'created_by_id', type: 'uuid' }) createdById!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  @Column({ name: 'due_date', type: 'date', nullable: true }) dueDate!: string | null;

  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
