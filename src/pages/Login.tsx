import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SignIn } from '@clerk/clerk-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, ArrowLeft } from 'lucide-react';

const Login = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.18),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.12),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.25)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.25)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)] pointer-events-none" />

      <Link
        to="/"
        className="absolute top-6 left-6 rtl:left-auto rtl:right-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all hover:-translate-x-1 rtl:hover:translate-x-1 duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common:backToHome')}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md px-6 relative z-10 my-auto"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 hover:scale-105 transition-transform duration-250">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 glow">
              <BarChart3 className="w-7 h-7 text-primary-foreground" />
            </div>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 text-foreground">
            {t('login:welcomeToApp', { appName: t('common:app.name') })}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">{t('login:tagline')}</p>
        </div>

        <Card className="border border-border/60 bg-card/40 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 via-accent/60 to-primary/60" />

          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">{t('login:accessPlatform')}</CardTitle>
            <CardDescription>{t('login:cardDescription')}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <SignIn
              routing="path"
              path="/login"
              signUpUrl="/sign-up"
              afterSignInUrl="/dashboard"
              appearance={{
                elements: {
                  formButton:
                    'w-full h-11 text-base font-semibold mt-6 transition-transform hover:scale-[1.01]',
                },
              }}
              // Let Clerk render email/password fields using its own schema.
            />

            <div className="relative my-2">
              <p className="text-xs text-muted-foreground text-center">
                Ask an administrator to provision your account before signing in.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
