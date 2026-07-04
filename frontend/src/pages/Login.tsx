import { SignIn } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const Login = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10 flex flex-col items-center"
      >
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">SupplyMind AI</h1>
          </div>
          <p className="text-muted-foreground">{t('common:tagline', 'AI-powered demand forecasting')}</p>
        </div>

        <div className="neu-card p-2 sm:p-4 rounded-2xl bg-card">
          <SignIn 
            routing="path" 
            path="/login" 
            signUpUrl="/signup" 
            forceRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-transparent shadow-none w-full max-w-md',
                headerTitle: 'text-foreground font-semibold',
                headerSubtitle: 'text-muted-foreground',
                socialButtonsBlockButton: 'neu-btn border-none bg-muted hover:bg-muted/80 text-foreground',
                dividerLine: 'bg-border',
                dividerText: 'text-muted-foreground',
                formFieldLabel: 'text-foreground',
                formFieldInput: 'neu-basin border-none bg-background text-foreground',
                formButtonPrimary: 'neu-btn neu-glow bg-primary hover:bg-primary/90 text-primary-foreground',
                footerActionText: 'text-muted-foreground',
                footerActionLink: 'text-primary hover:text-primary/80',
              }
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
