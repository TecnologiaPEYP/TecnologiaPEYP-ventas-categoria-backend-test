import { IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';

export class UpdateCaptacionDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  empresa?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  acepto?: boolean;
}
