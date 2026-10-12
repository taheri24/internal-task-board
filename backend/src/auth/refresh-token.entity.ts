import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

/** Only a SHA-256 hash of the refresh token is stored. The raw token lives in the client's HttpOnly cookie. */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true }) tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true }) revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
