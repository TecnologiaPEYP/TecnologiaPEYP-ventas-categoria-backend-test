import { IsString, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  name: string; // ej: "dashboard:view"

  @IsString()
  @IsOptional()
  description?: string;

  

  @IsString()
  module: string; // ej: "dashboard"

  @IsString()
  action: string; // ej: "view"
}
