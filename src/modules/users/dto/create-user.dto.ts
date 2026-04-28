import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsInt } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsOptional()
  roleId?: number;
}
