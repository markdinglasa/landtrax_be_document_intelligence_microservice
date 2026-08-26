import { ApiProperty } from '@nestjs/swagger';
import type { CustomMeta } from 'src/shared/common';
import { ServiceCatalogReportItemDto } from './service-catalog-report-item.dto';

export class ServiceCatalogReportsResponseDto {
  @ApiProperty({ type: [ServiceCatalogReportItemDto] })
  data!: ServiceCatalogReportItemDto[];

  @ApiProperty()
  meta!: CustomMeta;
}
