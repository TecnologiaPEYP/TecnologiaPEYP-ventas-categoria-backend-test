import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendWhatsappDto {
  @IsString() @IsNotEmpty()
  target!: string;

  @IsString()
  message: string = '';

  @IsOptional() @IsString()
  imageBase64?: string;
}
