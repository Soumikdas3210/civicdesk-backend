import { IsString, MinLength, IsBoolean, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
