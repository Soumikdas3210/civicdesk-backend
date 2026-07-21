import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsUUID } from 'class-validator';
import { Role } from 'src/common/enums';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    fullName: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsEnum(Role)
    role: Role;

    @IsOptional()
    @IsUUID()
    departmentId?: string | null;

}