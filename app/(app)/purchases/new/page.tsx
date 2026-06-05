import { ReceiptForm } from "@/components/app/ReceiptForm";
import { buttonClassName } from "@/components/ui/Button";

export default function NewPurchasePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="submit"
          form="purchase-entry-form"
          className={buttonClassName("primary", "px-5 py-2.5")}
        >
          Save Purchase
        </button>
      </div>

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
