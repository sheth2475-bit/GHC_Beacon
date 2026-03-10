import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Something went wrong. Please try again.", onRetry }: ErrorStateProps) {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
        </div>
        <h3 className="text-base font-medium mb-1">Error</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{message}</p>
        {onRetry && (
          <Button variant="secondary" className="mt-4" onClick={onRetry} data-testid="button-retry">
            <RefreshCw className="h-4 w-4 mr-2" />Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
