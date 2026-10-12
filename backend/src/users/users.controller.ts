import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '../common/enums';
import { CreateUserDto, UpdateUserDto } from './dto';
import { type PublicUser } from './public-user';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Any signed-in role. Used for assignee pickers. */
  @Get('directory')
  directory() {
    return this.users.directory();
  }

  @Roles(Role.Owner)
  @Get()
  list() {
    return this.users.list();
  }

  @Roles(Role.Owner)
  @Post()
  @HttpCode(201)
  create(@CurrentUser() actor: PublicUser, @Body() dto: CreateUserDto) {
    return this.users.create(actor, dto);
  }

  @Roles(Role.Owner)
  @Patch(':id')
  update(
    @CurrentUser() actor: PublicUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(actor, id, dto);
  }
}
