import { IsString, IsNotEmpty, IsEmail, IsDateString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateCrmDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  segmentos?: string[];

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
  tipoEvento?: string;

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
