import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    const warehouses = await prisma.warehouse.findMany({ take: 1 });
    const departments = await prisma.department.findMany({ take: 1 });
    const items = await prisma.item.findMany({ take: 1 });

    if (warehouses.length === 0 || departments.length === 0 || items.length === 0) {
      console.log('Seed data is missing or empty.');
      return;
    }

    const warehouseId = warehouses[0].id;
    const departmentId = departments[0].id;
    const itemId = items[0].id;

    console.log(`Using Warehouse: ${warehouseId}, Department: ${departmentId}, Item: ${itemId}`);

    // Let's check if warehouseItem exists for item in warehouse
    let whItem = await prisma.warehouseItem.findUnique({
      where: { warehouseId_itemId: { warehouseId, itemId } }
    });

    if (!whItem) {
      whItem = await prisma.warehouseItem.create({
        data: {
          warehouseId,
          itemId,
          qtyOnHand: 100,
          wac: 10
        }
      });
    }

    console.log('Warehouse item:', whItem);

    // Let's attempt to create a transaction similar to IssuesService
    const createdIssue = await prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findUnique({
        where: { id: warehouseId },
        select: { branchId: true },
      });
      
      const { DocumentNumberService } = require('./src/modules/sequencing/document-number.service');
      const docNumService = new DocumentNumberService();
      const issueNumber = await docNumService.next(prisma, 'INVENTORY_ISSUE', warehouses[0].branchId);
      
      return tx.inventoryIssue.create({
        data: {
          issueNumber,
          warehouseId,
          departmentId,
          status: 'DRAFT',
          notes: 'Test note',
          lines: {
            create: [{
              itemId,
              quantity: 1,
            }]
          }
        },
        include: {
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                  category: true,
                },
              },
              lotAllocations: {
                include: {
                  lot: true,
                },
              },
            },
          },
          warehouse: true,
          department: true,
          kitchenRequest: true,
        },
      });
    });

    console.log('Successfully created issue');
    
    // Now call mapIssueDetail (translated to ES6/CommonJS logic)
    const { issuesController } = require('./src/modules/operations/issues/issues.controller');
    // Or we can just inline mapIssueDetail here to test it:
    
    function mapIssueDetail(issue: any) {
      const lines = ((issue.lines as any[]) || []).map(
        (line: any) => {
          const lotAllocations = (
            (line.lotAllocations as any[]) || []
          ).map((la: any) => {
            const lot = la.lot as any;
            const expiryDateVal = lot?.expiryDate;
            return {
              lotId: la.lotId as string,
              lotNumber: (lot?.lotNumber as string) || '',
              expiryDate: expiryDateVal
                ? (expiryDateVal instanceof Date
                    ? expiryDateVal
                    : new Date(expiryDateVal)
                  ).toISOString()
                : null,
              allocatedQty: Number(la.quantityAllocated),
              overrideReason: '',
            };
          });

          const firstAllocation = lotAllocations[0] || null;
          const item = line.item as any;

          return {
            id: line.id as string,
            documentId: line.issueId as string,
            itemId: line.itemId as string,
            item: item
              ? {
                  id: item.id as string,
                  code: item.sku as string,
                  nameAr: item.name as string,
                  nameEn: item.name as string,
                  primaryUom: item.unitOfMeasure
                    ? {
                        id: (item.unitOfMeasure as any)
                          .id as string,
                        code: (item.unitOfMeasure as any)
                          .code as string,
                        nameAr: (item.unitOfMeasure as any)
                          .name as string,
                        nameEn: (item.unitOfMeasure as any)
                          .name as string,
                      }
                    : { id: '', code: '', nameAr: '', nameEn: '' },
                }
              : {
                  id: '',
                  code: '',
                  nameAr: '',
                  nameEn: '',
                  primaryUom: { id: '', code: '', nameAr: '', nameEn: '' },
                },
            lotId: firstAllocation ? firstAllocation.lotId : null,
            lot: firstAllocation
              ? {
                  id: firstAllocation.lotId,
                  lotNumber: firstAllocation.lotNumber,
                  expiryDate: firstAllocation.expiryDate,
                  isExpired: false,
                }
              : null,
            qty: Number(line.quantity),
            uomId: (item?.uomId as string) || '',
            unitCost: item?.wac ? Number(item.wac) : null,
            requestedQty: Number(line.quantity),
            issuedQty: Number(line.quantity),
            lotAllocations: lotAllocations,
          };
        },
      );

      const createdAtVal = issue.createdAt;
      const createdAtIso = createdAtVal
        ? (createdAtVal instanceof Date
            ? createdAtVal
            : new Date(createdAtVal)
          ).toISOString()
        : new Date().toISOString();

      const warehouse = issue.warehouse as any;
      const department = issue.department as any;
      const kitchenRequest = issue.kitchenRequest as any;

      return {
        id: issue.id as string,
        documentNumber: issue.issueNumber as string,
        status: issue.status as string,
        type: 'ISSUE',
        destinationDeptId: issue.departmentId as string,
        destinationDepartmentId: issue.departmentId as string,
        destinationDepartmentName: (department?.name as string) || '',
        departmentName: (department?.name as string) || '',
        requestedBy:
          ((issue.createdBy as any)?.name as string) ||
          'System',
        warehouseId: issue.warehouseId as string,
        warehouseName: (warehouse?.name as string) || '',
        branchId:
          ((issue.warehouse as any)
            ?.branchId as string) || '',
        notes: (issue.notes as string) || '',
        createdBy:
          ((issue.createdBy as any)?.name as string) ||
          'System',
        createdAt: createdAtIso,
        updatedAt: createdAtIso,
        postedAt: issue.postedAt
          ? (issue.postedAt instanceof Date
              ? issue.postedAt
              : new Date(issue.postedAt as string | number)
            ).toISOString()
          : null,
        postedBy: null,
        version: issue.version as number,
        lines,
        kitchenRequest: kitchenRequest
          ? {
              id: kitchenRequest.id as string,
              requestNumber: kitchenRequest.requestNumber as string,
            }
          : null,
      };
    }

    const mapped = mapIssueDetail(createdIssue);
    console.log('Successfully mapped issue:', mapped);

  } catch (err) {
    console.error('Error during run:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
