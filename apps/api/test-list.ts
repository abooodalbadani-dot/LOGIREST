import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({
    where: { id: '972c76b1-be0f-43bc-b45c-c70d7e8b256f' },
    include: {
      warehouseScopes: {
        include: {
          warehouse: true
        }
      },
      departmentScopes: {
        include: {
          department: true
        }
      }
    }
  });
  console.log("Proc Officer User scopes:", JSON.stringify(user, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
