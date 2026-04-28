const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
  })
  console.log('Roles with permissions:')
  console.log(JSON.stringify(roles, null, 2))

  const permissions = await prisma.permission.findMany()
  console.log('Permissions:')
  console.log(JSON.stringify(permissions, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
