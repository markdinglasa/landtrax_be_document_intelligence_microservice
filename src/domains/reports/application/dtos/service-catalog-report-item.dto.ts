import { ApiProperty } from '@nestjs/swagger';
import { CategoryEntity } from 'src/shared/infrastructure/database/entities/category-entity';

export class ServiceCatalogReportItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty({ required: false })
  description!: string | null;

  @ApiProperty()
  category?: CategoryEntity;

  @ApiProperty()
  serviceCode!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  turnaroundDays!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdDate!: string;

  @ApiProperty()
  lastModified!: string;
}
