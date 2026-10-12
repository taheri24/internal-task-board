import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { RefreshToken } from '../auth/refresh-token.entity';
import { Role } from '../common/enums';
import { CreateUserDto, UpdateUserDto } from './dto';
import { toPublicUser, type PublicUser } from './public-user';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<PublicUser[]> {
    const rows = await this.users.find({ order: { createdAt: 'ASC' } });
    return rows.map(toPublicUser);
  }

  /** Names only, for assignee pickers. Available to every signed-in role; no emails. */
  directory() {
    return this.users.find({
      select: { id: true, displayName: true, role: true, isActive: true },
      order: { displayName: 'ASC' },
    });
  }

  async create(actor: PublicUser, dto: CreateUserDto): Promise<PublicUser> {
    const email = dto.email.toLowerCase();
    if (await this.users.exists({ where: { email } })) {
      throw new ConflictException('This email is already registered');
    }
    const saved = await this.users.save(
      this.users.create({
        email,
        displayName: dto.displayName.trim(),
        role: dto.role,
        isActive: true,
        passwordHash: await argon2.hash(dto.password),
      }),
    );
    await this.audit.record({
      actorId: actor.id,
      entity: 'user',
      entityId: saved.id,
      action: 'create',
      after: { email, displayName: saved.displayName, role: saved.role },
    });
    return toPublicUser(saved);
  }

  async update(actor: PublicUser, id: string, dto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const before = toPublicUser(user);
    const isActiveOwner = user.role === Role.Owner && user.isActive;
    const downgrades = dto.role !== undefined && dto.role !== Role.Owner;
    const disables = dto.isActive === false;

    if (isActiveOwner && (downgrades || disables)) {
      const activeOwners = await this.users.count({ where: { role: Role.Owner, isActive: true } });
      if (activeOwners <= 1) {
        throw new ConflictException('The last active Owner cannot be disabled or downgraded');
      }
    }

    if (dto.displayName !== undefined) user.displayName = dto.displayName.trim();
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) user.passwordHash = await argon2.hash(dto.password);
    await this.users.save(user);

    // Disabling revokes every refresh token. Access tokens die on the next request
    // because JwtAuthGuard re-checks is_active against the database.
    if (disables) {
      await this.dataSource
        .createQueryBuilder()
        .update(RefreshToken)
        .set({ revokedAt: new Date() })
        .where('user_id = :id AND revoked_at IS NULL', { id })
        .execute();
    }

    await this.audit.record({
      actorId: actor.id,
      entity: 'user',
      entityId: id,
      action: 'update',
      before: { displayName: before.displayName, role: before.role, isActive: before.isActive },
      after: { displayName: user.displayName, role: user.role, isActive: user.isActive },
    });
    return toPublicUser(user);
  }
}
