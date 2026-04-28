import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignAdmin() {
  const email = 'fayrusleyends12@gmail.com';

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      console.log('❌ Usuario no encontrado. Debe registrarse primero.');
      return;
    }

    if (user.role?.name === 'admin') {
      console.log('✅ El usuario ya es admin.');
      return;
    }

    // Find the admin role
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (!adminRole) {
      console.log('❌ Rol admin no encontrado. Ejecuta primero el seed.');
      return;
    }

    await prisma.user.update({
      where: { email },
      data: { roleId: adminRole.id },
    });

    console.log('✅ Rol de administrador asignado exitosamente a:', email);
  } catch (error) {
    console.error('❌ Error asignando admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignAdmin();


