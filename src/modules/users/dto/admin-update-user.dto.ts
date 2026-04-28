import { IsString, IsOptional, IsInt, IsBoolean, IsDateString } from 'class-validator';

export class AdminUpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  cedula?: string;

  @IsDateString({}, { message: 'La fecha de nacimiento debe ser válida' })
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsInt()
  @IsOptional()
  roleId?: number;

  @IsBoolean()
  @IsOptional()
  profileComplete?: boolean;
}
