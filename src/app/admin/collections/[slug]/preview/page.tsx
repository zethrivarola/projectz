import { CollectionPreview } from "@/components/collection-preview"

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function AdminPreviewPage({ params }: PageProps) {
  const { slug } = await params
  return <CollectionPreview slug={slug} isAdminView={true} />
}
