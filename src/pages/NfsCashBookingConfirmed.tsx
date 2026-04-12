import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { NfsLogo } from "@/components/nfs/NfsLogo";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();
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
          <CheckCircle className="w-16 h-16 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">{t('cash_confirmed_title')}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t('cash_confirmed_subtitle')}</p>

        {data && (
          <div className="bg-card border border-border rounded-2xl p-6 text-left space-y-3 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('cash_confirmed_ref')}</span>
              <span className="font-mono font-semibold text-foreground">{data.ref}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('cash_confirmed_property')}</span>
              <span className="font-medium text-foreground text-right max-w-[60%]">{data.propertyTitle}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('cash_confirmed_checkin')}</span>
              <span className="font-medium text-foreground">{data.checkIn}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('cash_confirmed_checkout')}</span>
              <span className="font-medium text-foreground">{data.checkOut}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('cash_confirmed_guests')}</span>
              <span className="font-medium text-foreground">{data.guests}</span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between text-sm font-bold">
              <span>{t('cash_confirmed_total')}</span>
              <span className="text-primary">{data.currencySymbol}{data.total}</span>
            </div>
          </div>
        )}

        <Link
          to="/"
          className="inline-block bg-primary-gradient text-white font-semibold py-3 px-8 rounded-full hover:opacity-90 transition-all"
        >
          {t('cash_confirmed_back')}
        </Link>
      </div>
    </div>
  );
}
