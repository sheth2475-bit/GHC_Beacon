import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from "xlsx";

interface ExcelUploadProps {
  templateUrl: string;
  uploadUrl: string;
  entityName: string;
  onSuccess: () => void;
  columnMap: Record<string, string>;
}

export function ExcelUpload({ templateUrl, uploadUrl, entityName, onSuccess, columnMap }: ExcelUploadProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    window.open(templateUrl, "_blank");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];

      const mapped = rawData.map(row => {
        const out: Record<string, any> = {};
        for (const [excelCol, apiField] of Object.entries(columnMap)) {
          out[apiField] = row[excelCol] || "";
        }
        return out;
      }).filter(row => Object.values(row).some(v => v !== ""));

      if (mapped.length === 0) {
        toast({ title: "Empty file", description: "No data rows found in the file", variant: "destructive" });
        setUploading(false);
        return;
      }

      const res = await apiRequest("POST", uploadUrl, { data: mapped });
      const json = await res.json();
      setResult({ success: true, count: json.imported || mapped.length });
      toast({ title: "Import successful", description: `${json.imported || mapped.length} ${entityName} imported` });
      onSuccess();
    } catch (err: any) {
      setResult({ success: false, count: 0 });
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} data-testid={`button-upload-${entityName}`}>
        <Upload className="h-4 w-4 mr-2" />Import Excel
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import {entityName}
            </DialogTitle>
            <DialogDescription>Upload an Excel file (.xlsx) with your {entityName.toLowerCase()} data</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Button variant="secondary" className="w-full justify-start" onClick={handleDownloadTemplate} data-testid="button-download-template">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>

            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Processing file...</p>
                </div>
              ) : result ? (
                <div className="flex flex-col items-center gap-2">
                  {result.success ? (
                    <>
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      <p className="text-sm font-medium">{result.count} {entityName.toLowerCase()} imported</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-8 w-8 text-destructive" />
                      <p className="text-sm text-destructive">Import failed</p>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setResult(null)}>Upload another file</Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Choose an Excel file to upload</p>
                  <label>
                    <Button variant="secondary" size="sm" asChild>
                      <span>Select File</span>
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleFileChange}
                      data-testid="input-file-upload"
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
