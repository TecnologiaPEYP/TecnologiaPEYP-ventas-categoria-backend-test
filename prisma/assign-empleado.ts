import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Asignando rol empleado a usuarios sin rol...');

  // Obtener el rol empleado
  const empleadoRole = await prisma.role.findUnique({
    where: { name: 'empleado' },
  });

  if (!empleadoRole) {
    console.error('❌ No se encontró el rol "empleado". Ejecuta primero el seed.');
    process.exit(1);
  }

  // Encontrar usuarios sin rol (excepto admin)
  const usersWithoutRole = await prisma.user.findMany({
    where: {
      roleId: null,
    },
  });

  console.log(`📋 Encontrados ${usersWithoutRole.length} usuarios sin rol`);

  // Asignar rol empleado a cada uno
  for (const user of usersWithoutRole) {
    await prisma.user.update({
      where: { id: user.id },
      data: { roleId: empleadoRole.id },
    });
    console.log(`  ✓ ${user.email} → empleado`);
  }

  console.log('✅ Completado!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
