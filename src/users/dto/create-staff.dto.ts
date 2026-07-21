import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { Role } from "src/common/enums";

export class CreateStaffDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsString()
    fullName: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsIn([Role.OFFICER, Role.ADMIN])
    role: Role.OFFICER | Role.ADMIN;
}