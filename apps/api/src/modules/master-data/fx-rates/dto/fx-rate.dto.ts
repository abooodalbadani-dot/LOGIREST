import { Allow } from 'class-validator';

export class CreateFxrateDto {
  @Allow() name?: string;
  @Allow() code?: string;
  @Allow() branchId?: string;
  @Allow() warehouseId?: string;
  @Allow() manager?: string;
  @Allow() costCenter?: string;
  @Allow() category?: string;
  @Allow() symbol?: string;
  @Allow() isBaseCurrency?: boolean;
  @Allow() currencyId?: string;
  @Allow() rate?: number;
  @Allow() effectiveDate?: string;
  @Allow() categoryId?: string;
  @Allow() primaryUomId?: string;
  @Allow() trackLots?: boolean;
  @Allow() trackExpiry?: boolean;
  @Allow() minStockLevel?: number;
  @Allow() reorderPoint?: number;
  @Allow() lastPurchasePrice?: number;
  @Allow() email?: string;
  @Allow() phone?: string;
  @Allow() taxNumber?: string;
  @Allow() paymentTerms?: string;
  @Allow() type?: string;
  @Allow() isActive?: boolean;
}

export class UpdateFxrateDto extends CreateFxrateDto {
  @Allow() version?: number;
}
