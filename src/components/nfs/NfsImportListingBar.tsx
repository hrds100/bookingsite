import { useState } from "react";
import { Link2, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNfsImportListing, type ImportedListing } from "@/hooks/useNfsImportListing";

interface NfsImportListingBarProps {
  onImport: (data: ImportedListing) => void;
}

const SUPPORTED_HOSTS = ["airbnb.com", "airbnb.co.uk", "airbnb.com.au", "airbnb.ca"];

function isSupportedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SUPPORTED_HOSTS.some((h) => parsed.hostname.endsWith(h));
  } catch {
    return false;
  }
}

export function NfsImportListingBar({ onImport }: NfsImportListingBarProps) {
  const [url, setUrl] = useState("");
  const [success, setSuccess] = useState(false);
  const [importedTitle, setImportedTitle] = useState<string | undefined>();
  const { importListing, isLoading, error, reset } = useNfsImportListing();

  const handleImport = async () => {
    if (!url.trim()) return;
    setSuccess(false);
    reset();

    try {
      const data = await importListing(url.trim());
      setImportedTitle(data.public_title);
      setSuccess(true);
      onImport(data);
    } catch {
      // error state handled by hook
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleImport();
    }
  };

  const handleDismissSuccess = () => {
    setSuccess(false);
    setUrl("");
  };

  const urlValid = url.trim().length > 0;
  const urlSupported = urlValid && isSupportedUrl(url.trim());
  const showWarning = urlValid && !urlSupported && !isLoading;

  return (
    <div
      data-feature="NFSTAY__OP_PROPERTY_IMPORT_BAR"
      className="rounded-2xl border border-border bg-card p-4 md:p-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Link2 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Import from listing URL</p>
          <p className="text-xs text-muted-foreground">
            Paste an Airbnb link to auto-fill the form. You can edit any field before publishing.
          </p>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-start gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Listing imported</p>
            {importedTitle && (
              <p className="text-xs text-green-700 mt-0.5 truncate">"{importedTitle}"</p>
            )}
            <p className="text-xs text-green-700 mt-0.5">
              Review the pre-filled fields below and complete any missing information before publishing.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismissSuccess}
            className="shrink-0 text-green-600 hover:text-green-800 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && !success && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Import failed</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="url"
            placeholder="https://www.airbnb.com/rooms/..."
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (error) reset(); if (success) setSuccess(false); }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="pr-4 rounded-lg"
          />
        </div>
        <Button
          type="button"
          onClick={handleImport}
          disabled={!urlValid || isLoading}
          className="rounded-lg shrink-0 gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing…
            </>
          ) : (
            "Import"
          )}
        </Button>
      </div>

      {/* URL warning */}
      {showWarning && (
        <p className="text-xs text-amber-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Only Airbnb URLs are supported at this time.
        </p>
      )}

      <p className="text-xs text-muted-foreground/70">
        Supported: airbnb.com · Import is for one-time use only and does not sync ongoing changes.
      </p>
    </div>
  );
}
