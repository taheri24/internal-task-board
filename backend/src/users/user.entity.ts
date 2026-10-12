import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Column({ type: 'varchar', length: 255, unique: true }) email!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 120 }) displayName!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 }) passwordHash!: string;

  @Column({ type: 'varchar', length: 16, default: Role.Member }) role!: Role;

  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
