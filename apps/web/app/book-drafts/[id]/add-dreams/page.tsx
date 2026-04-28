import { DreamBrowser } from "@/components/dreams/dream-browser";

export default function AddDreamsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { orderId?: string };
}) {
  const draftId = Number(params.id);
  const orderId = searchParams?.orderId ? Number(searchParams.orderId) : null;

  return <DreamBrowser mode="picker" draftId={draftId} orderId={orderId} />;
}
