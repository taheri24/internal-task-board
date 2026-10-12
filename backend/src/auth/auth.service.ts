import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';

const REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken) private readonly tokens: Repository<RefreshToken>,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email: email.toLowerCase() } });
    const passwordOk = user ? await argon2.verify(user.passwordHash, password).catch(() => false) : false;
    // Disabled and wrong-password cases return the same message on purpose.
    if (!user || !passwordOk || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issue(user);
  }

  /** Rotates the refresh token on every use. Presenting a revoked token revokes all of the user's sessions. */
  async refresh(rawToken: string | undefined) {
    if (!rawToken) throw new UnauthorizedException('Session expired');

    const row = await this.tokens.findOne({ where: { tokenHash: sha256(rawToken) }, relations: { user: true } });
    if (!row) throw new UnauthorizedException('Session expired');

    if (row.revokedAt) {
      await this.revokeAllForUser(row.user.id);
      throw new UnauthorizedException('Session expired');
    }

    row.revokedAt = new Date();
    await this.tokens.save(row);

    if (row.expiresAt < new Date() || !row.user.isActive) {
      throw new UnauthorizedException('Session expired');
    }
    return this.issue(row.user);
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    await this.tokens.update({ tokenHash: sha256(rawToken), revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string) {
    await this.dataSource
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();
  }

  private async issue(user: User) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role }, { expiresIn: '15m' });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.tokens.save(
      this.tokens.create({
        user,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      }),
    );
    return { user, accessToken, refreshToken };
  }
}
