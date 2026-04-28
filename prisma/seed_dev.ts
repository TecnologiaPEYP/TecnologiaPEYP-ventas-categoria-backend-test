
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'dev@admin.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Busca o crea el rol admin
  let adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (!adminRole) {
    adminRole = await prisma.role.create({ data: { name: 'admin', description: 'Super admin dev' } });
    console.log('Rol admin creado');
  }

  // 2. Asigna todos los permisos al rol admin
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }
  console.log('Todos los permisos asignados al rol admin');

  // 3. Crea el usuario dev con el rol admin
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Dev',
        lastName: 'Admin',
        profileComplete: true,
        roleId: adminRole.id,
      },
    });
    console.log('Usuario dev creado:', user);
  } else {
    // Si ya existe, actualiza el rol
    user = await prisma.user.update({
      where: { email },
      data: { roleId: adminRole.id },
    });
    console.log('El usuario dev ya existe, rol actualizado:', user);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
