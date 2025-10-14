import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixMyCollections() {
  const myEmail = 'zeth.rivarola@gmail.com'
  
  const me = await prisma.user.findUnique({
    where: { email: myEmail }
  })
  
  if (!me) {
    console.log('Usuario no encontrado')
    return
  }
  
  const updated = await prisma.collection.updateMany({
    where: { ownerId: me.id },
    data: { visibility: 'public' }
  })
  
  console.log('Colecciones actualizadas:', updated.count)
  
  const myCollections = await prisma.collection.findMany({
    where: { ownerId: me.id },
    select: { title: true, visibility: true }
  })
  
  console.log('\nTus colecciones:')
  myCollections.forEach(c => {
    console.log('  -', c.title + ':', c.visibility)
  })
}

fixMyCollections().then(() => prisma.$disconnect())