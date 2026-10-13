import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClientThrottlerGuard } from './common/client-throttler.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { TodosModule } from './todos/todos.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: Number(process.env.GLOBAL_RATE_LIMIT ?? 600) }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [join(__dirname, '**', '*.entity.js')],
      synchronize: false,
      migrationsRun: false,
    }),
    AuditModule,
    AuthModule,
    HealthModule,
    UsersModule,
    TodosModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ClientThrottlerGuard }],
})
export class AppModule {}
