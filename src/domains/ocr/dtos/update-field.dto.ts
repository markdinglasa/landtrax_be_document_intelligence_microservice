import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateFieldDto {
  @IsString()
  @IsNotEmpty()
  documentId!: string;

  @IsString()
  @IsNotEmpty()
  fieldName!: string;

  @IsString()
  @IsOptional()
  value!: string | null;

  @IsString()
  @IsNotEmpty()
  userId!: string;
}
