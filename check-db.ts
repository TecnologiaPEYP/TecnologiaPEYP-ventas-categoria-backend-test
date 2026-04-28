import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.user.count();
    console.log('✅ Connection successful. Users count:', count);
    
    const users = await prisma.user.findMany({ take: 5 });
    console.log('Sample users:', users);
  } catch (error) {
    console.error('❌ Connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
