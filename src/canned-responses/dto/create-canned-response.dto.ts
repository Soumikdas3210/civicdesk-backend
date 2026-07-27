import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCannedResponseDto {
  @ApiProperty() 
  @IsString() 
  title: string;

  @ApiProperty() 
  @IsString() 
  body: string;

  @ApiPropertyOptional() 
  @IsOptional() 
  @IsUUID() 
  departmentId?: string;

  @ApiPropertyOptional() 
  @IsOptional() 
  @IsUUID() 
  categoryId?: string;
}