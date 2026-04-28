import { IsString, IsNotEmpty, IsEmail, IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class CreateRegistroDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEmail()
  correo: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;

  @IsDateString()
  @IsOptional()
  fechaNacimiento?: string;

  @IsString()
  @IsNotEmpty()
  pais: string;

  @IsString()
  @IsOptional()
  ciudad?: string;

  @IsString()
  @IsOptional()
  tipoDocumento?: string;

  @IsString()
  @IsOptional()
  numeroDocumento?: string;

  @IsString()
  @IsOptional()
  categoria?: string;

  @IsString()
  @IsOptional()
  subcategoria?: string;

  @IsBoolean()
  @IsOptional()
  aceptaPolitica?: boolean;
}
