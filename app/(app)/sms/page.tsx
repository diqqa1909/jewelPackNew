import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function SmsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS / WhatsApp</CardTitle>
        <CardDescription>Messaging integration placeholder.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-ebony-700">
        <p>No SMS/WhatsApp provider is configured for this app yet.</p>
        <p className="text-ebony-600">
          Share the provider you use (Dialog, Mobitel, Twilio, Meta WhatsApp Cloud API), and I’ll wire it end-to-end.
        </p>
      </CardContent>
    </Card>
  );
}

