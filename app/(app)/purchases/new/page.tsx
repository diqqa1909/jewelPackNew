import { ReceiptForm } from "@/components/app/ReceiptForm";

export default function NewPurchasePage() {
  return (
    <div>
      <ReceiptForm
        mode="create"
        submitPath="/api/purchases"
        redirectPath="/purchases"
        title="Purchase Entry"
        description="Capture purchase receipt details."
        submitLabel="Save Purchase"
        layout="table"
        formId="purchase-entry-form"
      />
    </div>
  );
}
