import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateReporteDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsObject()
  datos: Record<string, unknown>;
}
