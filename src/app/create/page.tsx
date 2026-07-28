import { CreateWorkspace } from '@/components/paste/CreateWorkspace';

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ live?: string }>;
}) {
  const { live } = await searchParams;
  return <CreateWorkspace defaultLive={live === '1'} />;
}
