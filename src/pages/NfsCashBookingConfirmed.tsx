import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { NfsLogo } from "@/components/nfs/NfsLogo";
import { useTranslation } from "react-i18next";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";

interface CashBookingData {
  ref: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  currency: string;
  currencySymbol: string;
  error: string | null;
}

export default function NfsCashBookingConfirmed() {
  const { t } = useTranslation();
  const { operator, isWhiteLabel } = useWhiteLabel();
  const [data, setData] = useState<CashBookingData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('nfs_cash_booking');
    if (raw) {
      try {
        setData(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          {isWhiteLabel && operator ? (
            operator.logo_url
              ? <img src={operator.logo_url} alt={operator.brand_name} className="h-8 w-auto mx-auto mb-4" />
              : <p className="text-lg font-bold mb-4">{operator.brand_name}</p>
          ) : (
            <div className="flex justify-center mb-4"><NfsLogo /></div>
          )}
        </div>

        <div className="flex justify-center mb-4">
          <Clock className="w-16 h-16 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">{t('cash_confirmed.title')}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t('cash_confirmed.subtitle')}</p>

        {data && (
          <div className="bg-card border border-border rounded-2xl p-6 text-left space-y-3 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('cash_confirmed.ref')}</span>
              <span className="font-mono font-semibold text-foreground">{data.ref}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('cash_confirmed.property')}</span>
              <span className="font-medium text-foreground text-right max-w-[60%]">{data.propertyTitle}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('cash_confirmed.check_in')}</span>
              <span className="font-medium text-foreground">{data.checkIn}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('cash_confirmed.check_out')}</span>
              <span className="font-medium text-foreground">{data.checkOut}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('cash_confirmed.guests')}</span>
              <span className="font-medium text-foreground">{data.guests}</span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between text-sm font-bold">
              <span>{t('cash_confirmed.total')}</span>
              <span className="text-primary">{data.currencySymbol}{data.total}</span>
            </div>
          </div>
        )}

        <Link
          to="/"
          className="inline-block bg-primary-gradient text-white font-semibold py-3 px-8 rounded-full hover:opacity-90 transition-all"
        >
          {t('cash_confirmed.back')}
        </Link>
      </div>
    </div>
  );
}
