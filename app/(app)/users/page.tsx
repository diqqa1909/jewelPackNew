import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function UsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users &amp; Roles</CardTitle>
        <CardDescription>User management placeholder (auth not enabled).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-ebony-700">
        <p>This project currently has no authentication/authorization layer.</p>
        <p className="text-ebony-600">
          If you want login + roles (Admin/Cashier/Manager), tell me which auth you prefer (NextAuth, Clerk, custom).
        </p>
      </CardContent>
    </Card>
  );
}

