import { IsString, IsEmail, IsDateString, IsBoolean, IsArray, IsOptional } from 'class-validator';

export class UpdateCrmDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  segmentos?: string[];

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsEmail()
  @IsOptional()
  correo?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsDateString()
  @IsOptional()
  fechaNacimiento?: string | null;

  @IsString()
  @IsOptional()
  pais?: string;

  @IsString()
  @IsOptional()
  ciudad?: string | null;

  @IsString()
  @IsOptional()
  tipoDocumento?: string | null;

  @IsString()
  @IsOptional()
  numeroDocumento?: string | null;

  @IsString()
  @IsOptional()
  tipoEvento?: string | null;

  @IsString()
  @IsOptional()
  categoria?: string | null;

  @IsString()
  @IsOptional()
  subcategoria?: string | null;

  @IsBoolean()
  @IsOptional()
  aceptaPolitica?: boolean;
}
