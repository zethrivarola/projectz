const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Creating SUPER_ADMIN user...')
  
  const passwordHash = await bcrypt.hash('Showmethemoney89', 12)
  
  const user = await prisma.user.create({
    data: {
      email: 'zeth.rivarola@gmail.com',
      passwordHash: passwordHash,
      name: 'René Rivarola',
      firstName: 'René',
      lastName: 'Rivarola',
      role: 'SUPER_ADMIN',
      emailVerified: true,
      isActive: true,
      maxStorageGB: 5000,
      maxCollections: 1000,
      maxPhotosPerCollection: 10000,
    }
  })
  
  console.log('✅ User created successfully!')
  console.log('📧 Email:', user.email)
  console.log('👤 Role:', user.role)
  console.log('💾 Storage:', user.maxStorageGB, 'GB')
  console.log('📁 Max Collections:', user.maxCollections)
  console.log('🖼️  Max Photos per Collection:', user.maxPhotosPerCollection)
}

main()
  .catch(e => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
