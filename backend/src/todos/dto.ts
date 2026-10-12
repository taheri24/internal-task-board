import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { Priority, TaskStatus } from '../common/enums';

export class CreateTodoDto {
  @IsString() @Length(1, 200) title!: string;

  @IsOptional() description?: unknown;

  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;

  @IsOptional() @IsEnum(Priority) priority?: Priority;

  /** Ignored for Members, who are always assigned to themselves. */
  @IsOptional() @IsUUID() assigneeId?: string | null;

  @IsOptional() @IsDateString() dueDate?: string | null;
}

export class UpdateTodoDto {
  @IsOptional() @IsString() @Length(1, 200) title?: string;

  @IsOptional() description?: unknown;

  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;

  @IsOptional() @IsEnum(Priority) priority?: Priority;

  @IsOptional() @IsUUID() assigneeId?: string | null;

  @IsOptional() @IsDateString() dueDate?: string | null;
}

export class QueryTodoDto {
  /** Comma-separated list, e.g. "todo,in_progress" */
  @IsOptional() @IsString() status?: string;

  @IsOptional() @IsEnum(Priority) priority?: Priority;

  /** A user UUID, "me", or "unassigned" */
  @IsOptional() @IsString() assigneeId?: string;

  @IsOptional() @IsString() @Length(1, 100) q?: string;

  @IsOptional() @IsDateString() dueFrom?: string;

  @IsOptional() @IsDateString() dueTo?: string;

  @IsOptional() @IsString() sort?: 'dueDate' | 'priority' | 'updatedAt';
}
