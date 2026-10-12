import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { Role } from '../common/enums';

export class CreateUserDto {
  @IsEmail() @MaxLength(255) email!: string;

  @IsString() @Length(2, 120) displayName!: string;

  @IsString() @MinLength(8) @MaxLength(128) password!: string;

  @IsEnum(Role) role!: Role;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @Length(2, 120) displayName?: string;

  @IsOptional() @IsEnum(Role) role?: Role;

  @IsOptional() @IsBoolean() isActive?: boolean;

  @IsOptional() @IsString() @MinLength(8) @MaxLength(128) password?: string;
}
