import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class SendKpiReportDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  html: string;
}
