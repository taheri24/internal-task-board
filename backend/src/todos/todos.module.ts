import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { User } from '../users/user.entity';
import { Task } from './task.entity';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User]), AuditModule],
  controllers: [TodosController],
  providers: [TodosService],
})
export class TodosModule {}
