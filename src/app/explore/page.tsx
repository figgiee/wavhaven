import { ExploreClientUIShadcn } from '@/components/explore/ExploreClientUIShadcn';

interface ExplorePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const resolvedSearchParams = await searchParams;
  return <ExploreClientUIShadcn serverSearchParams={resolvedSearchParams} />;
} 
