import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from "xlsx";

interface UploadError {
  row: number;
  reason: string;
}

interface UploadResult {
  imported: number;
  errors: UploadError[];
}

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
  const [result, setResult] = useState<UploadResult | null>(null);
  const [originalRows, setOriginalRows] = useState<Record<string, any>[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    window.open(templateUrl, "_blank");
  };

  /** Convert a cell value to a string, turning JS Dates into YYYY-MM-DD. */
  function normalizeCellValue(v: unknown): string {
    if (v === null || v === undefined) return "";
    if (v instanceof Date) {
      if (isNaN(v.getTime())) return "";
      const y = v.getFullYear();
      const m = String(v.getMonth() + 1).padStart(2, "0");
      const d = String(v.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return String(v);
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);
    setOriginalRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(ws, { defval: "", cellDates: true }) as Record<string, any>[];

      // Normalize all cell values — convert Date objects to YYYY-MM-DD strings
      const normalizedData = rawData.map(row => {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          out[k] = normalizeCellValue(v);
        }
        return out;
      });

      const nonEmpty = normalizedData.filter(row => Object.values(row).some(v => v !== ""));

      if (nonEmpty.length === 0) {
        toast({ title: "Empty file", description: "No data rows found in the file", variant: "destructive" });
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      setOriginalRows(nonEmpty);

      const mapped = nonEmpty.map(row => {
        const out: Record<string, any> = {};
        for (const [excelCol, apiField] of Object.entries(columnMap)) {
          out[apiField] = row[excelCol] ?? "";
        }
        return out;
      });

      const res = await apiRequest("POST", uploadUrl, { data: mapped });
      const json = await res.json() as { imported?: number; errors?: UploadError[] };

      const uploadResult: UploadResult = {
        imported: json.imported ?? mapped.length,
        errors: json.errors ?? [],
      };

      setResult(uploadResult);

      if (uploadResult.errors.length === 0) {
        toast({ title: "Import successful", description: `${uploadResult.imported} ${entityName.toLowerCase()} imported` });
        onSuccess();
      } else if (uploadResult.imported > 0) {
        toast({ title: "Partial import", description: `${uploadResult.imported} imported, ${uploadResult.errors.length} failed`, variant: "destructive" });
        onSuccess();
      } else {
        toast({ title: "Import failed", description: `${uploadResult.errors.length} rows had errors`, variant: "destructive" });
      }
    } catch (err: any) {
      setResult({ imported: 0, errors: [{ row: 0, reason: err.message }] });
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDownloadErrorReport = () => {
    if (!result || result.errors.length === 0 || originalRows.length === 0) return;

    const errorRowIndices = new Set(result.errors.map(e => e.row - 2));
    const errorReasonMap: Record<number, string> = {};
    for (const e of result.errors) {
      errorReasonMap[e.row - 2] = e.reason;
    }

    const headers = [...Object.keys(columnMap), "Error Reason"];
    const errorData = originalRows
      .map((row, i) => ({ row, i }))
      .filter(({ i }) => errorRowIndices.has(i))
      .map(({ row, i }) => {
        const out: Record<string, any> = {};
        for (const col of Object.keys(columnMap)) {
          out[col] = row[col] ?? "";
        }
        out["Error Reason"] = errorReasonMap[i] ?? "Unknown error";
        return out;
      });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(errorData, { header: headers });
    ws["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));
    XLSX.utils.book_append_sheet(wb, ws, "Errors");
    XLSX.writeFile(wb, `${entityName.toLowerCase().replace(/\s+/g, "_")}_errors.xlsx`);
  };

  const handleClose = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setResult(null);
      setOriginalRows([]);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} data-testid={`button-upload-${entityName}`}>
        <Upload className="h-4 w-4 mr-2" />Import Excel
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
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
                <div className="flex flex-col items-center gap-3">
                  {result.errors.length === 0 ? (
                    <>
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      <p className="text-sm font-medium">{result.imported} {entityName.toLowerCase()} imported successfully</p>
                    </>
                  ) : result.imported > 0 ? (
                    <>
                      <AlertTriangle className="h-8 w-8 text-amber-500" />
                      <p className="text-sm font-medium">{result.imported} imported, {result.errors.length} failed</p>
                      <Button variant="outline" size="sm" onClick={handleDownloadErrorReport} data-testid="button-download-errors">
                        <Download className="h-4 w-4 mr-2" />Download Error Report
                      </Button>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-8 w-8 text-destructive" />
                      <p className="text-sm font-medium text-destructive">{result.errors.length} row{result.errors.length !== 1 ? "s" : ""} failed to import</p>
                      {result.errors.length > 0 && (
                        <Button variant="outline" size="sm" onClick={handleDownloadErrorReport} data-testid="button-download-errors">
                          <Download className="h-4 w-4 mr-2" />Download Error Report
                        </Button>
                      )}
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => { setResult(null); setOriginalRows([]); }}>Upload another file</Button>
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
                      accept=".xlsx,.xls"
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
