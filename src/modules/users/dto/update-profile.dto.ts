import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'La cédula es obligatoria' })
  cedula: string;

  @IsDateString({}, { message: 'La fecha de nacimiento debe ser válida' })
  @IsNotEmpty({ message: 'La fecha de nacimiento es obligatoria' })
  birthDate: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'El cargo es obligatorio' })
  position: string;
}
