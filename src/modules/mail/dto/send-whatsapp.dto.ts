import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class SendWhatsappDto {
  @IsString() @IsNotEmpty()
  target: string; // número "+57..." o chatId de grupo (UltraMsg)

  @IsString()
  message: string = '';

  @IsIn(['callmebot', 'ultramsg', 'baileys'])
  provider: 'callmebot' | 'ultramsg' | 'baileys';

  @IsOptional() @IsString()
  instanceId?: string;

  @IsOptional() @IsString()
  instanceToken?: string;

  @IsOptional() @IsString()
  imageBase64?: string; // PNG base64 sin prefijo "data:image/png;base64,"
}
