import {
  Controller,
  Post,
  Get,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Res,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AllRoles } from '../../auth/decorators/all-roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SuppliersImportService } from './suppliers-import.service';
import { OpeningStockImportService } from './opening-stock-import.service';
import { ItemsImportService } from './items-import.service';
import { CategoriesImportService } from './categories-import.service';
import { UomsImportService } from './uoms-import.service';
import { BarcodesImportService } from './barcodes-import.service';
import { PrismaService } from '../../database/prisma.service';
import * as ExpressApp from 'express';
import * as ExcelJS from 'exceljs';

@Controller('imports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportsController {
  constructor(
    private readonly suppliersImportService: SuppliersImportService,
    private readonly openingStockImportService: OpeningStockImportService,
    private readonly itemsImportService: ItemsImportService,
    private readonly categoriesImportService: CategoriesImportService,
    private readonly uomsImportService: UomsImportService,
    private readonly barcodesImportService: BarcodesImportService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  @AllRoles()
  async getImportStatus() {
    const [uomCount, categoryCount, supplierCount, itemCount] =
      await Promise.all([
        this.prisma.unitOfMeasure.count(),
        this.prisma.category.count(),
        this.prisma.supplier.count(),
        this.prisma.item.count(),
      ]);

    return {
      hasUom: uomCount > 0,
      hasCategories: categoryCount > 0,
      hasSuppliers: supplierCount > 0,
      hasItems: itemCount > 0,
    };
  }

  @Post('suppliers')
  @Roles(Role.ADMIN, Role.GM, Role.PROC_MGR)
  @UseInterceptors(FileInterceptor('file'))
  async importSuppliers(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Req() req: ExpressApp.Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.suppliersImportService.importSuppliers(
      file.buffer,
      userId,
      ipAddress,
    );
  }

  @Post('opening-stock')
  @Roles(Role.ADMIN, Role.GM, Role.INV_MGR)
  @UseInterceptors(FileInterceptor('file'))
  async importOpeningStock(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.openingStockImportService.importOpeningStock(
      file.buffer,
      userId,
    );
  }

  @Get('templates/suppliers')
  @Roles(Role.ADMIN, Role.GM, Role.PROC_MGR, Role.PROC_OFFICER)
  async downloadSuppliersTemplate(@Res() res: ExpressApp.Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Suppliers');

    // Add columns with header name
    worksheet.columns = [
      { header: 'code', key: 'code', width: 15 },
      { header: 'name', key: 'name', width: 25 },
      { header: 'contactName', key: 'contactName', width: 20 },
      { header: 'contactEmail', key: 'contactEmail', width: 25 },
      { header: 'contactPhone', key: 'contactPhone', width: 20 },
    ];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=suppliers_template.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Get('templates/opening-stock')
  @Roles(Role.ADMIN, Role.GM, Role.INV_MGR)
  async downloadOpeningStockTemplate(@Res() res: ExpressApp.Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Opening Stock');

    worksheet.columns = [
      { header: 'warehouseCode', key: 'warehouseCode', width: 20 },
      { header: 'itemSku', key: 'itemSku', width: 20 },
      { header: 'quantity', key: 'quantity', width: 15 },
      { header: 'unitCost', key: 'unitCost', width: 15 },
      { header: 'lotNumber', key: 'lotNumber', width: 20 },
      { header: 'expiryDate', key: 'expiryDate', width: 15 },
    ];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=opening_stock_template.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Post('items')
  @Roles(Role.ADMIN, Role.GM, Role.INV_MGR)
  @UseInterceptors(FileInterceptor('file'))
  async importItems(@UploadedFile() file: Express.Multer.File) {
    // Current user can be mapped if needed, passing static user ID
    return this.itemsImportService.importItems(file.buffer, 'system-user');
  }

  @Get('templates/items')
  @Roles(Role.ADMIN, Role.GM, Role.INV_MGR)
  async downloadItemsTemplate(@Res() res: ExpressApp.Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Items');

    worksheet.columns = [
      { header: 'Name', key: 'Name', width: 25 },
      { header: 'Code', key: 'Code', width: 15 },
      { header: 'Category', key: 'Category', width: 20 },
      { header: 'Unit', key: 'Unit', width: 15 },
      { header: 'LotTracked', key: 'LotTracked', width: 15 },
      { header: 'Status', key: 'Status', width: 12 },
    ];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=items_template.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Post('categories')
  @Roles(Role.ADMIN, Role.GM)
  @UseInterceptors(FileInterceptor('file'))
  async importCategories(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Req() req: ExpressApp.Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.categoriesImportService.importCategories(
      file.buffer,
      userId,
      ipAddress,
    );
  }

  @Get('templates/categories')
  @Roles(Role.ADMIN, Role.GM)
  async downloadCategoriesTemplate(@Res() res: ExpressApp.Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Categories');

    worksheet.columns = [
      { header: 'Name', key: 'Name', width: 25 },
      { header: 'Code', key: 'Code', width: 15 },
      { header: 'Description', key: 'Description', width: 30 },
    ];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=categories_template.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Post('uoms')
  @Roles(Role.ADMIN, Role.GM)
  @UseInterceptors(FileInterceptor('file'))
  async importUoms(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Req() req: ExpressApp.Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.uomsImportService.importUoms(file.buffer, userId, ipAddress);
  }

  @Post('barcodes')
  @Roles(Role.ADMIN, Role.GM, Role.INV_MGR)
  @UseInterceptors(FileInterceptor('file'))
  async importBarcodes(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Req() req: ExpressApp.Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.barcodesImportService.importBarcodes(
      file.buffer,
      userId,
      ipAddress,
    );
  }
}
