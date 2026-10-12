import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '../common/enums';
import type { PublicUser } from '../users/public-user';
import { CreateTodoDto, QueryTodoDto, UpdateTodoDto } from './dto';
import { TodosService } from './todos.service';

@Controller('todos')
export class TodosController {
  constructor(private readonly todos: TodosService) {}

  @Get()
  list(@CurrentUser() user: PublicUser, @Query() query: QueryTodoDto) {
    return this.todos.list(user, query);
  }

  // Declared before ':id' so the literal path is not treated as an id.
  @Roles(Role.Owner, Role.Manager)
  @Get('trash')
  trash() {
    return this.todos.trash();
  }

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: PublicUser, @Body() dto: CreateTodoDto) {
    return this.todos.create(user, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: PublicUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.todos.findOne(user, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: PublicUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTodoDto) {
    return this.todos.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: PublicUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.todos.remove(user, id);
  }

  @Roles(Role.Owner, Role.Manager)
  @Post(':id/restore')
  restore(@CurrentUser() user: PublicUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.todos.restore(user, id);
  }
}
