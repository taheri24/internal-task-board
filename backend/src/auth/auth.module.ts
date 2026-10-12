import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../common/roles.guard';
import { User } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshToken } from './refresh-token.entity';
import 'dotenv/config'
@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        console.log({secret});
        if (!secret || secret.length < 32) {
          throw new Error('JWT_SECRET must be set and at least 32 characters long');
        }
        return { secret };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Order matters: authentication must run before role checks.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
