import { ReceiptForm } from "@/components/app/ReceiptForm";

export function PurchaseEntryForm() {
  return (
    <ReceiptForm
      mode="create"
      submitPath="/api/purchases"
      redirectPath="/purchases"
      title="Purchase Entry"
      description="Capture purchase receipt details."
      submitLabel="Save Purchase"
    />
  );
}
