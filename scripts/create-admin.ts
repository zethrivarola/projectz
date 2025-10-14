// scripts/create-admin.ts
import { PrismaClient } from '@prisma/client'
import { AuthService } from '../src/lib/auth'

const prisma = new PrismaClient()

async function createSuperAdmin() {
  try {
    const email = 'zeth.rivarola@gmail.com' // Cambia esto
    const password = 'Showmethemoney' // Cambia esto
    const name = 'René Rivarola'

    // Verificar si ya existe
    const existing = await prisma.user.findUnique({
      where: { email }
    })

    if (existing) {
      console.log('❌ Super admin already exists')
      return
    }

    // Hashear password
    const passwordHash = await AuthService.hashPassword(password)

    // Crear super admin
    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'SUPER_ADMIN',
        isActive: true,
        maxStorageGB: 9999, // Sin límites para ti
        maxCollections: 9999
      }
    })

    console.log('✅ Super Admin created successfully!')
    console.log('📧 Email:', admin.email)
    console.log('🔑 Password:', password)
    console.log('⚠️  Please change this password after first login')

  } catch (error) {
    console.error('❌ Error creating super admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSuperAdmin()