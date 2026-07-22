import { IsString, MinLength } from 'class-validator';

export class CreateWardDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  code: string;
}
