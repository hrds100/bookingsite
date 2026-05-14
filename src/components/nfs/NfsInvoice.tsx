import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NfsInvoiceProps {
  reservationId: string;
  guestName: string;
  guestEmail?: string;
  propertyTitle: string;
  propertyCity?: string;
  propertyCountry?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults?: number;
  children?: number;
  total: number;
  currencySymbol: string;
  paymentMethod?: "card" | "cash";
  status?: string;
  issuedAt?: Date;
  brandName?: string;
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export function NfsInvoice({
  reservationId,
  guestName,
  guestEmail,
  propertyTitle,
  propertyCity,
  propertyCountry,
  checkIn,
  checkOut,
  nights,
  adults = 1,
  children = 0,
  total,
  currencySymbol,
  paymentMethod = "card",
  status,
  issuedAt,
  brandName = "NFStay",
}: NfsInvoiceProps) {
  const issued = issuedAt ?? new Date();
  const totalGuests = adults + children;
  const guestLine =
    `${adults} adult${adults !== 1 ? "s" : ""}` +
    (children > 0 ? `, ${children} child${children !== 1 ? "ren" : ""}` : "");

  const handleDownload = () => {
    window.print();
  };

  const isPendingApproval = status === "pending_approval";
  const heading = isPendingApproval ? "Booking request" : "Invoice";
  const totalLabel =
    paymentMethod === "cash"
      ? "Amount due (pay on arrival)"
      : isPendingApproval
        ? "Amount on hold"
        : "Total paid";

  return (
    <div data-feature="NFSTAY__INVOICE" className="space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-base font-semibold">{heading}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          data-testid="invoice-download"
          className="rounded-xl gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Download PDF
        </Button>
      </div>

      <div
        data-print-invoice
        className="bg-card border border-border rounded-2xl p-6 print:border-0 print:rounded-none print:p-0 print:shadow-none"
      >
        <div className="flex items-start justify-between mb-6 border-b border-border pb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{heading}</p>
            <p className="text-lg font-bold leading-tight">{brandName}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground space-y-0.5">
            <div>
              <span className="text-muted-foreground">Issued:</span>{" "}
              <span className="text-foreground font-medium">{issued.toLocaleDateString()}</span>
            </div>
            <div className="font-mono break-all max-w-[200px]">{reservationId}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Billed to</p>
            <p className="text-sm font-medium">{guestName || "Guest"}</p>
            {guestEmail && <p className="text-xs text-muted-foreground break-all">{guestEmail}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Property</p>
            <p className="text-sm font-medium">{propertyTitle}</p>
            {(propertyCity || propertyCountry) && (
              <p className="text-xs text-muted-foreground">
                {[propertyCity, propertyCountry].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-in</span>
            <span className="font-medium">{formatDate(checkIn)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-out</span>
            <span className="font-medium">{formatDate(checkOut)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nights</span>
            <span className="font-medium">{nights}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Guests</span>
            <span className="font-medium">
              {totalGuests} ({guestLine})
            </span>
          </div>
        </div>

        <div className="border-t border-border pt-4 mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              Stay · {nights} night{nights !== 1 ? "s" : ""}
            </span>
            <span className="font-medium">
              {currencySymbol}
              {total}
            </span>
          </div>
        </div>

        <div className="border-t-2 border-foreground/80 pt-3 flex justify-between items-center">
          <span className="text-sm font-semibold">{totalLabel}</span>
          <span className="text-xl font-bold">
            {currencySymbol}
            {total}
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground mt-6 leading-relaxed">
          Thank you for booking with {brandName}. Keep this invoice for your records. For questions
          about this reservation, contact us with the reservation ID above.
        </p>
      </div>
    </div>
  );
}
