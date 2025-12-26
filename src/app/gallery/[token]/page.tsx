import { CollectionPreview } from "@/components/collection-preview"

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function PublicGalleryPage({ params }: PageProps) {
  const { token } = await params
  return <CollectionPreview token={token} isAdminView={false} />
}
