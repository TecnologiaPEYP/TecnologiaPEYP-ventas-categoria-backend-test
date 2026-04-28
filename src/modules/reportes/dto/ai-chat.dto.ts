import { IsString, IsOptional, IsObject } from 'class-validator';

export class AiChatDto {
  @IsString() question: string;
  @IsOptional() @IsObject() context?: Record<string, any>;
}
