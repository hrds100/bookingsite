import '@/lib/i18n';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrencyProvider, useCurrency } from "@/contexts/CurrencyContext";
import { WhiteLabelProvider } from "@/contexts/WhiteLabelContext";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import i18n from "@/lib/i18n";
import { dbLangToLocale } from "@/components/nfs/NfsLanguageSelector";
import { useEffect } from "react";
import { NfsMainLayout } from "@/components/nfs/NfsMainLayout";
import { NfsOperatorLayout } from "@/components/nfs/NfsOperatorLayout";
import { NfsAdminLayout } from "@/components/nfs/NfsAdminLayout";
import NfsMainLanding from "./pages/NfsMainLanding";
import NfsSearchPage from "./pages/NfsSearchPage";
import NfsPropertyView from "./pages/NfsPropertyView";
import NfsCheckoutPage from "./pages/NfsCheckoutPage";
import NfsPaymentSuccess from "./pages/NfsPaymentSuccess";
import NfsPaymentCancel from "./pages/NfsPaymentCancel";
import NfsGuestBookingLookup from "./pages/NfsGuestBookingLookup";
import TravelerReservations from "./pages/TravelerReservations";
import TravelerReservationDetail from "./pages/TravelerReservationDetail";
import TravelerSettings from "./pages/TravelerSettings";
import OperatorDashboard from "./pages/operator/OperatorDashboard";
import OperatorProperties from "./pages/operator/OperatorProperties";
import OperatorPropertyForm from "./pages/operator/OperatorPropertyForm";
import OperatorReservations from "./pages/operator/OperatorReservations";
import OperatorReservationDetail from "./pages/operator/OperatorReservationDetail";
import OperatorCreateReservation from "./pages/operator/OperatorCreateReservation";
import OperatorCalendar from "./pages/operator/OperatorCalendar";
import OperatorAnalytics from "./pages/operator/OperatorAnalytics";
import OperatorSettings from "./pages/operator/OperatorSettings";
import OperatorIntegrations from "./pages/operator/OperatorIntegrations";
import OperatorOnboarding from "./pages/operator/OperatorOnboarding";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOperators from "./pages/admin/AdminOperators";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSystemHealth from "./pages/admin/AdminSystemHealth";
import SignInPage from "./pages/SignInPage";
import TravelerSignupPage from "./pages/TravelerSignupPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import CookiePage from "./pages/CookiePage";
import TravelerLoginPage from "./pages/TravelerLoginPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import WalletProvisioner from "./components/WalletProvisioner";
import FeatureInspector from "./components/dev/FeatureInspector";
import AuthBridgePage from "./pages/AuthBridgePage";
import ForwardPage from "./pages/ForwardPage";
import NotFound from "./pages/NotFound";
import NfsCashBookingConfirmed from "./pages/NfsCashBookingConfirmed";

const queryClient = new QueryClient();

/** Applies operator's default currency and language when on a white-label site */
function ApplyOperatorDefaults() {
  const { operator, isWhiteLabel } = useWhiteLabel();
  const { setCurrencyCode } = useCurrency();

  useEffect(() => {
    if (isWhiteLabel && operator) {
      if (operator.default_currency) setCurrencyCode(operator.default_currency);
      if (operator.default_language) {
        i18n.changeLanguage(dbLangToLocale(operator.default_language));
      }
    }
  }, [isWhiteLabel, operator, setCurrencyCode]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CurrencyProvider>
      <WhiteLabelProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ApplyOperatorDefaults />
          <FeatureInspector />
          <WalletProvisioner />
          <BrowserRouter>
          <Routes>
            {/* Traveler / Public */}
            <Route element={<NfsMainLayout />}>
              <Route path="/" element={<NfsMainLanding />} />
              <Route path="/search" element={<NfsSearchPage />} />
              <Route path="/property/:id" element={<NfsPropertyView />} />
              <Route path="/checkout" element={<NfsCheckoutPage />} />
              <Route path="/booking" element={<NfsGuestBookingLookup />} />
              <Route path="/payment/success" element={<NfsPaymentSuccess />} />
              <Route path="/payment/cancel" element={<NfsPaymentCancel />} />
              <Route path="/traveler/reservations" element={<TravelerReservations />} />
              <Route path="/traveler/reservation/:id" element={<TravelerReservationDetail />} />
              <Route path="/traveler/settings" element={<TravelerSettings />} />
            </Route>

            {/* Operator Portal */}
            <Route element={<NfsOperatorLayout />}>
              <Route path="/nfstay" element={<OperatorDashboard />} />
              <Route path="/nfstay/properties" element={<OperatorProperties />} />
              <Route path="/nfstay/properties/new" element={<OperatorPropertyForm />} />
              <Route path="/nfstay/properties/:id" element={<OperatorPropertyForm />} />
              <Route path="/nfstay/reservations" element={<OperatorReservations />} />
              <Route path="/nfstay/reservations/:id" element={<OperatorReservationDetail />} />
              <Route path="/nfstay/create-reservation" element={<OperatorCreateReservation />} />
              <Route path="/nfstay/calendar" element={<OperatorCalendar />} />
              <Route path="/nfstay/analytics" element={<OperatorAnalytics />} />
              <Route path="/nfstay/settings" element={<OperatorSettings />} />
              <Route path="/nfstay/integrations" element={<OperatorIntegrations />} />
            </Route>

            {/* Admin Portal */}
            <Route element={<NfsAdminLayout />}>
              <Route path="/admin/nfstay" element={<AdminDashboard />} />
              <Route path="/admin/nfstay/users" element={<AdminUsers />} />
              <Route path="/admin/nfstay/operators" element={<AdminOperators />} />
              <Route path="/admin/nfstay/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/nfstay/settings" element={<AdminSettings />} />
              <Route path="/admin/system-health" element={<AdminSystemHealth />} />
            </Route>

            {/* Standalone pages */}
            <Route path="/nfstay/onboarding" element={<OperatorOnboarding />} />
            <Route path="/nfstay/oauth-callback" element={<OAuthCallbackPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/auth/bridge" element={<AuthBridgePage />} />
            <Route path="/forward" element={<ForwardPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<TravelerSignupPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/cookie-policy" element={<CookiePage />} />
            <Route path="/cash-booking-confirmed" element={<NfsCashBookingConfirmed />} />
            <Route path="/traveler/login" element={<TravelerLoginPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WhiteLabelProvider>
    </CurrencyProvider>
  </QueryClientProvider>
);

export default App;
