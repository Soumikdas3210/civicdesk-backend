import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from 'src/common/enums';

export class CreateStaffDto {
  @ApiProperty({ example: 'officer1@civicdesk.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Rahim Officer' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: '01700000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: [Role.OFFICER, Role.ADMIN], example: Role.OFFICER })
  @IsIn([Role.OFFICER, Role.ADMIN])
  role: Role.OFFICER | Role.ADMIN;
}