import { ReceiptForm } from "@/components/app/ReceiptForm";

export default function EditReceiptPage({
  params
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  return <ReceiptForm mode="edit" receiptId={id} />;
}

