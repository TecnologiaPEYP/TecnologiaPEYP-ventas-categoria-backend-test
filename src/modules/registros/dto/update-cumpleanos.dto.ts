import { IsString, IsEmail, IsDateString, IsOptional } from 'class-validator';

export class UpdateCumpleanosDto {
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
  fechaNacimiento?: string;

  @IsString()
  @IsOptional()
  pais?: string;

  @IsString()
  @IsOptional()
  tipoDocumento?: string | null;

  @IsString()
  @IsOptional()
  numeroDocumento?: string | null;
}
