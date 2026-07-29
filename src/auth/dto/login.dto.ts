import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@civicdesk.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  password: string;
}