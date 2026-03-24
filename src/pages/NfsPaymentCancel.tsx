import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NfsPaymentCancel() {
  const navigate = useNavigate();

  return (
    <div data-feature="NFSTAY__CANCEL" className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-[hsl(38_92%_50%/0.1)] flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-warning" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Booking not completed</h1>
        <p className="text-sm text-muted-foreground mb-6">Your payment was cancelled. No charges were made to your card.</p>
        <div className="space-y-3">
          <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate(-1)}>
            Return to property
          </Button>
          <Button className="w-full rounded-xl" onClick={() => navigate('/search')}>
            Browse other properties
          </Button>
        </div>
      </div>
    </div>
  );
}
