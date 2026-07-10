import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    DELETE FROM _prisma_migrations 
    WHERE migration_name = '20260710100000_banner_cta_text';
  `);
  console.log('Deleted 20260710100000_banner_cta_text');

  const rows = await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5`;
  console.log('Recent migrations:', rows);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
