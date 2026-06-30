import { motion } from "framer-motion";
import { SignIn } from "@clerk/clerk-react";
import { SupplyMindLogo } from "@/components/brand/SupplyMindLogo";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

const ClerkLoginCatchAll = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12">
      <Link
        to="/"
        className="absolute top-6 left-6 rtl:left-auto rtl:right-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common:backToHome')}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md px-6 relative z-10 my-auto"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-4">
            <SupplyMindLogo iconClassName="w-12 h-12" />
          </Link>
          <h1 className="text-h1 mb-2 text-foreground">Welcome to SupplyMind AI</h1>
          <p className="text-body text-muted-foreground">Sign in to access your dashboard</p>
        </div>

        <div className="border border-border rounded-xl p-6 bg-card">
          <SignIn
            path="/login"
            signUpUrl="/sign-up"
            afterSignInUrl="/dashboard"
            appearance={{
              elements: {
                headerTitle: 'text-h2 text-foreground',
                headerDescription: 'text-muted-foreground text-body',
                form: 'space-y-4',
                formField: 'space-y-2',
                label: 'text-sm font-semibold text-foreground',
                input: 'h-11 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20',
                formButton:
                  'w-full h-11 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors',
                socialButtons: 'hidden',
                dividerLine: 'border-border',
                footer: 'text-caption text-muted-foreground text-center',
              },
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default ClerkLoginCatchAll;
