import { IsNumber, IsOptional, IsString, IsArray } from 'class-validator';

export class AiInsightDto {
  @IsString() fileName: string;
  @IsNumber() totalFilas: number;
  @IsNumber() totalVentas: number;
  @IsArray() topProductos: { producto: string; ventas: number; qty: number }[];
  @IsArray() topVendedores: { nombre: string; ventas: number }[];
  @IsArray() topHoras: { hora: string; ventas: number }[];
  @IsOptional() @IsString() periodoNombre?: string;
}
