import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from 'src/common/enums';

export class CreateUserDto {
  @ApiProperty({ example: 'officer1@civicdesk.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Rahim Officer' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '01700000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: Role, example: Role.OFFICER })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ example: 'PASTE-A-REAL-DEPARTMENT-UUID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;
}