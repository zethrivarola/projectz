// scripts/update-admin.ts
import { PrismaClient } from '@prisma/client'
import { AuthService } from '../src/lib/auth'

const prisma = new PrismaClient()

async function updateSuperAdmin() {
  try {
    // Configura estos valores con tus datos reales
    const oldEmail = 'admin@rene-photography.com'
    const newEmail = 'zeth.rivarola@gmail.com'
    const newPassword = 'Showmethemoney$$'
    const newName = 'Rene'

    // Buscar admin existente
    const admin = await prisma.user.findUnique({
      where: { email: oldEmail }
    })

    if (!admin) {
      console.log('Admin not found with email:', oldEmail)
      console.log('Available SUPER_ADMIN users:')
      const users = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { email: true, name: true }
      })
      users.forEach(u => console.log('  -', u.email, '(' + u.name + ')'))
      return
    }

    // Hashear nuevo password
    const passwordHash = await AuthService.hashPassword(newPassword)

    // Actualizar admin
    const updated = await prisma.user.update({
      where: { email: oldEmail },
      data: {
        email: newEmail,
        passwordHash,
        name: newName,
        firstName: newName.split(' ')[0],
        lastName: newName.split(' ').slice(1).join(' ') || null,
      }
    })

    console.log('Super Admin updated successfully!')
    console.log('New Email:', updated.email)
    console.log('Name:', updated.name)
    console.log('New Password:', newPassword)
    console.log('')
    console.log('Login at: http://localhost:3000/admin/login')

  } catch (error) {
    console.error('Error updating super admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateSuperAdmin()