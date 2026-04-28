import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ========== 1. CREAR PERMISOS ==========
  const permissionsData = [
    // Dashboard
    { name: 'dashboard:view', module: 'dashboard', action: 'view', description: 'Ver panel principal' },

    // Users
    { name: 'users:view', module: 'users', action: 'view', description: 'Ver lista de usuarios' },
    { name: 'users:manage', module: 'users', action: 'manage', description: 'Gestionar usuarios (crear, editar, eliminar)' },

    // Stats
    { name: 'stats:view', module: 'stats', action: 'view', description: 'Ver estadísticas' },
    { name: 'stats:export', module: 'stats', action: 'export', description: 'Exportar reportes' },

    // Relaciones de platos
    { name: 'relaciones:manage', module: 'relaciones', action: 'manage', description: 'Gestionar relaciones de platos' },

    // Descargas
    { name: 'descargas:view', module: 'descargas', action: 'view', description: 'Descargar listados de contactos (PDF/CSV)' },

    // Settings
    { name: 'settings:view', module: 'settings', action: 'view', description: 'Ver configuración' },
    { name: 'settings:edit', module: 'settings', action: 'edit', description: 'Editar configuración' },

    // Profile
    { name: 'profile:view', module: 'profile', action: 'view', description: 'Ver perfil propio' },
    { name: 'profile:edit', module: 'profile', action: 'edit', description: 'Editar perfil propio' },

    // Roles & Permissions
    { name: 'roles:view', module: 'roles', action: 'view', description: 'Ver roles' },
    { name: 'roles:manage', module: 'roles', action: 'manage', description: 'Gestionar roles y asignaciones' },
    { name: 'permissions:view', module: 'permissions', action: 'view', description: 'Ver permisos' },
    { name: 'permissions:manage', module: 'permissions', action: 'manage', description: 'Gestionar permisos' },

    // Tickets
    { name: 'tickets:create', module: 'tickets', action: 'create', description: 'Crear tickets de soporte' },
    { name: 'tickets:manage', module: 'tickets', action: 'manage', description: 'Gestionar y responder tickets (staff)' },

    // Registros especiales
    { name: 'cumpleanos:view', module: 'cumpleanos', action: 'view', description: 'Ver registros de cumpleaños' },
    { name: 'captacion:view', module: 'captacion', action: 'view', description: 'Ver registros de captación' },
  ];





  console.log('📦 Creating permissions...');
  const permissions: Record<string, number> = {};
  for (const perm of permissionsData) {
    const created = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description, module: perm.module, action: perm.action },
      create: perm,
    });
    permissions[perm.name] = created.id;
    console.log(`  ✓ Permission: ${perm.name}`);
  }

  // ========== 2. CREAR ROLES ==========
  console.log('👔 Creating roles...');

  // ADMIN - tiene todos los permisos
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { description: 'Administrador con acceso total' },
    create: { name: 'admin', description: 'Administrador con acceso total' },
  });
  // Assign all permissions to admin
  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  for (const permId of Object.values(permissions)) {
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: permId },
    });
  }
  console.log(`  ✓ Role: admin (all permissions)`);

  // EMPLEADO - acceso básico
  const empleadoRole = await prisma.role.upsert({
    where: { name: 'empleado' },
    update: { description: 'Empleado con acceso básico' },
    create: { name: 'empleado', description: 'Empleado con acceso básico' },
  });
  const empleadoPerms = ['dashboard:view', 'profile:view', 'profile:edit', 'tickets:create', 'descargas:view'];
  await prisma.rolePermission.deleteMany({ where: { roleId: empleadoRole.id } });
  for (const permName of empleadoPerms) {
    await prisma.rolePermission.create({
      data: { roleId: empleadoRole.id, permissionId: permissions[permName] },
    });
  }
  console.log(`  ✓ Role: empleado (${empleadoPerms.join(', ')})`);

  // SUPERVISOR - acceso intermedio
  const supervisorRole = await prisma.role.upsert({
    where: { name: 'supervisor' },
    update: { description: 'Supervisor con acceso intermedio' },
    create: { name: 'supervisor', description: 'Supervisor con acceso intermedio' },
  });
  const supervisorPerms = [
    'dashboard:view', 'profile:view', 'profile:edit',
    'users:view', 'stats:view', 'settings:view',
    'tickets:create', 'tickets:manage', 'descargas:view',
  ];
  await prisma.rolePermission.deleteMany({ where: { roleId: supervisorRole.id } });
  for (const permName of supervisorPerms) {
    await prisma.rolePermission.create({
      data: { roleId: supervisorRole.id, permissionId: permissions[permName] },
    });
  }
  console.log(`  ✓ Role: supervisor (${supervisorPerms.join(', ')})`);

  // CUMPLEANOS - solo ve el panel de cumpleaños
  const cumpleanosRole = await prisma.role.upsert({
    where: { name: 'cumpleanos' },
    update: { description: 'Acceso exclusivo al panel de registros de cumpleaños' },
    create: { name: 'cumpleanos', description: 'Acceso exclusivo al panel de registros de cumpleaños' },
  });
  const cumpleanosPerms = ['cumpleanos:view', 'profile:view', 'profile:edit'];
  await prisma.rolePermission.deleteMany({ where: { roleId: cumpleanosRole.id } });
  for (const permName of cumpleanosPerms) {
    await prisma.rolePermission.create({
      data: { roleId: cumpleanosRole.id, permissionId: permissions[permName] },
    });
  }
  console.log(`  ✓ Role: cumpleanos (${cumpleanosPerms.join(', ')})`);

  // CAPTACION - solo ve el panel de captación
  const captacionRole = await prisma.role.upsert({
    where: { name: 'captacion' },
    update: { description: 'Acceso exclusivo al panel de registros de captación' },
    create: { name: 'captacion', description: 'Acceso exclusivo al panel de registros de captación' },
  });
  const captacionPerms = ['captacion:view', 'profile:view', 'profile:edit'];
  await prisma.rolePermission.deleteMany({ where: { roleId: captacionRole.id } });
  for (const permName of captacionPerms) {
    await prisma.rolePermission.create({
      data: { roleId: captacionRole.id, permissionId: permissions[permName] },
    });
  }
  console.log(`  ✓ Role: captacion (${captacionPerms.join(', ')})`);

  // ========== 3. CREAR USUARIO ADMIN ==========
  console.log('👤 Creating admin user...');
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { roleId: adminRole.id },
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'System',
      lastName: 'Admin',
      cedula: 'admin',
      position: 'Administrator',
      profileComplete: true,
      roleId: adminRole.id,
    },
  });
  console.log(`  ✓ Admin user: ${admin.email} (role: admin)`);

  // Assign admin role to existing users that don't have a role
  // (like your Google-authenticated user)
  const usersWithoutRole = await prisma.user.findMany({ where: { roleId: null } });
  if (usersWithoutRole.length > 0) {
    console.log(`\n🔄 Found ${usersWithoutRole.length} users without role. Assigning 'empleado' role...`);
    for (const u of usersWithoutRole) {
      await prisma.user.update({
        where: { id: u.id },
        data: { roleId: empleadoRole.id },
      });
      console.log(`  ✓ ${u.email} → empleado`);
    }
  }

  console.log('\n✅ Seed completed successfully!');
  console.log('📋 Summary:');
  console.log(`   Permissions: ${Object.keys(permissions).length}`);
  console.log(`   Roles: 5 (admin, empleado, supervisor, cumpleanos, captacion)`);
  console.log(`   Admin user: admin@example.com / admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });