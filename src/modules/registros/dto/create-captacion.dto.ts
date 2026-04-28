import { IsString, IsNotEmpty, IsEmail, IsBoolean, IsOptional } from 'class-validator';

export class CreateCaptacionDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  empresa?: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;

  @IsEmail()
  email: string;

  @IsBoolean()
  acepto: boolean;
}
