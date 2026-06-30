import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SignIn } from "@clerk/clerk-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplyMindLogo } from "@/components/brand/SupplyMindLogo";
import { ArrowLeft } from "lucide-react";

const FactorOne = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12">
      <Link
        to="/"
        className="absolute top-6 left-6 rtl:left-auto rtl:right-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("common:backToHome")}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md px-6 relative z-10 my-auto"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-4">
            <SupplyMindLogo iconClassName="w-12 h-12" />
          </Link>
          <h1 className="text-h1 mb-2 text-foreground">
            {t("login:welcomeToApp", { appName: "SupplyMind AI" })}
          </h1>
          <p className="text-body text-muted-foreground">{t("login:tagline")}</p>
        </div>

        <Card className="border border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-h2">{t("login:accessPlatform")}</CardTitle>
            <CardDescription>{t("login:cardDescription")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <SignIn
              path="/login/factor-one"
              signUpUrl="/sign-up"
              afterSignInUrl="/dashboard"
              appearance={{
                variables: {
                  colorPrimary: '#2563EB',
                  colorBackground: '#14141f',
                  colorText: '#f8fafc',
                  colorTextSecondary: '#94a3b8',
                  colorInputBackground: '#0f172a',
                  colorInputText: '#f8fafc',
                  colorBorder: '#1e293b',
                },
                elements: {
                  rootBox: 'w-full',
                  cardBox: 'w-full shadow-none border-0 bg-transparent',
                  card: 'w-full shadow-none border-0 bg-transparent p-0',
                  header: 'hidden',
                  footer: 'bg-transparent text-muted-foreground',
                  formButtonPrimary: 'w-full h-11 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors',
                  formFieldInput: 'h-11 bg-background border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20',
                  footerActionLink: 'text-primary hover:text-primary/80',
                  identityPreviewText: 'text-foreground',
                  identityPreviewEditButtonIcon: 'stroke-foreground',
                  dividerLine: 'bg-border',
                  dividerText: 'text-muted-foreground',
                },
              }}
            />

            <div className="relative my-2">
              <p className="text-caption text-muted-foreground text-center">
                Ask an administrator to provision your account before signing in.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default FactorOne;
