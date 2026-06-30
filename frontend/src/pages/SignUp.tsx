import { motion } from 'framer-motion';
import { SignUp } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { SupplyMindLogo } from '@/components/brand/SupplyMindLogo';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SignUpPage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common:backToLogin') ?? 'Back to sign in'}
        </Link>
        <Link to="/" className="inline-flex items-center gap-2">
          <SupplyMindLogo iconClassName="w-7 h-7" />
        </Link>
      </div>

      {/* Form center */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
              style={{
                background: 'rgba(37,99,235,0.1)',
                color: '#60a5fa',
                border: '1px solid rgba(37,99,235,0.25)',
              }}>
              <Sparkles className="w-3 h-3" /> Free to get started
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ letterSpacing: '-0.02em' }}>
              Create your account
            </h1>
            <p className="text-muted-foreground text-sm">
              Join SupplyMind AI and start orchestrating your supply chain
            </p>
          </div>

          {/* Clerk SignUp widget */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
            }}
          >
            <SignUp
              path="/sign-up"
              signInUrl="/login"
              afterSignUpUrl="/dashboard"
              appearance={{
                variables: {
                  colorPrimary: '#2563EB',
                  colorBackground: 'hsl(var(--card))',
                  colorText: 'hsl(var(--foreground))',
                  colorTextSecondary: 'hsl(var(--muted-foreground))',
                  colorInputBackground: 'hsl(var(--background))',
                  colorInputText: 'hsl(var(--foreground))',
                  colorBorder: 'hsl(var(--border))',
                  borderRadius: '0.75rem',
                  fontSize: '15px',
                },
                elements: {
                  rootBox: 'w-full',
                  cardBox: 'w-full shadow-none border-0 bg-transparent',
                  card: 'w-full shadow-none border-0 bg-transparent p-0',
                  header: 'hidden',
                  footer: 'bg-transparent pt-2',
                  formButtonPrimary: [
                    'w-full h-12 text-[15px] font-semibold rounded-xl transition-all duration-200',
                    'shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01]',
                  ].join(' '),
                  formFieldInput: [
                    'h-11 rounded-xl border text-[15px]',
                    'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                    'transition-all duration-150',
                  ].join(' '),
                  footerActionLink: 'text-blue-500 hover:text-blue-400 font-medium',
                  identityPreviewText: 'text-foreground',
                  dividerLine: 'opacity-30',
                  dividerText: 'text-xs uppercase tracking-wider text-muted-foreground',
                  socialButtonsIconButton: [
                    'border rounded-xl h-11 w-full flex-1 hover:scale-[1.02]',
                    'transition-all duration-150 font-medium text-sm',
                  ].join(' '),
                  socialButtonsBlockButton: [
                    'border rounded-xl h-11 hover:scale-[1.02]',
                    'transition-all duration-150 font-medium text-sm',
                  ].join(' '),
                },
              }}
            />
          </div>

          {/* Sign-in prompt */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Protected by Clerk · Enterprise SSO available ·{' '}
          <a href="#" className="hover:text-foreground transition-colors underline underline-offset-2">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
