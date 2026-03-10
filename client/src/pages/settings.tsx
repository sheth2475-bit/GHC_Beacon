import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { LoadingPage } from "@/components/loading-state";
import { Settings, User, Building2, Database } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: company, isLoading } = useQuery<any>({ queryKey: ["/api/company"] });

  if (isLoading) return <LoadingPage />;

  const infoRow = (label: string, value: React.ReactNode, testId?: string) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium" data-testid={testId}>{value}</span>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader
        title="Settings"
        description="Manage your account and application settings"
        icon={Settings}
        testId="text-settings-title"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />Account
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {infoRow("Name", user?.name, "text-setting-name")}
          {infoRow("Email", user?.email, "text-setting-email")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />Company
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {company ? (
            <>
              {infoRow("Company", company.companyName)}
              {infoRow("Industry", <Badge variant="secondary">{company.industry}</Badge>)}
              {infoRow("Size", company.companySize)}
              {infoRow("Country", company.country)}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No company profile set up yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />Application
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {infoRow("Version", <Badge variant="secondary">1.0.0</Badge>)}
          {infoRow("AI Engine", <Badge variant="secondary">GPT-4o</Badge>)}
          {infoRow("Database", <Badge variant="secondary">PostgreSQL</Badge>)}
        </CardContent>
      </Card>
    </div>
  );
}
