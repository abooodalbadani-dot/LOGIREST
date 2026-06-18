const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function mapPRSummary(pr) {
  const createdAtIso = pr.createdAt
    ? (pr.createdAt instanceof Date ? pr.createdAt : new Date(pr.createdAt)).toISOString()
    : new Date().toISOString();
  
  const warehouse = pr.warehouse || null;
  const branch = pr.branch || null;
  const createdBy = pr.createdBy || null;

  return {
    id: pr.id,
    documentNumber: pr.requestNumber,
    status: pr.status,
    departmentId: pr.warehouseId,
    warehouseId: pr.warehouseId,
    warehouseName: warehouse?.name || null,
    branchId: pr.branchId || null,
    branchName: branch?.name || null,
    expectedDate: createdAtIso,
    createdAt: createdAtIso,
    createdBy: createdBy?.name || 'System',
  };
}

async function main() {
  const prs = await prisma.purchaseRequest.findMany({
    include: { warehouse: true, branch: true }
  });
  console.log(JSON.stringify(mapPRSummary(prs[0]), null, 2));
}
main();
