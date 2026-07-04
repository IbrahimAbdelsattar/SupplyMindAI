import { SignIn } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react'; // Can be removed if completely unused, but I'll just leave or remove carefully

const Login = () => {
  const { t } = useTranslation();

  const appearanceProps = {
    variables: {
      colorText: 'hsl(var(--foreground))',
      colorInputText: 'hsl(var(--foreground))',
      colorInputBackground: 'transparent',
      colorBackground: 'transparent',
    },
    elements: {
      rootBox: 'w-full flex justify-center',
      card: 'bg-transparent shadow-none w-full max-w-md p-0',
      headerTitle: 'hidden',
      headerSubtitle: 'hidden',
      socialButtonsBlockButton: 'neu-btn border-none bg-muted text-foreground transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/80 active:scale-[0.97]',
      dividerLine: 'bg-border',
      dividerText: 'text-muted-foreground font-medium',
      formFieldLabel: 'text-foreground font-semibold text-sm',
      formFieldInput: 'neu-basin border-none bg-background text-foreground focus:ring-1 focus:ring-primary transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
      formButtonPrimary: 'neu-btn neu-glow text-primary-foreground font-bold transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]',
      footerActionText: 'hidden',
      footerActionLink: 'hidden',
      footer: 'hidden',
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden py-12 px-4">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ 
          duration: 0.4, 
          ease: [0.23, 1, 0.32, 1] 
        }}
        className="z-10 flex flex-col items-center w-full max-w-[440px]"
      >
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">SupplyMind AI</h1>
          </div>
          <p className="text-muted-foreground font-medium">{t('common:tagline', 'AI-powered demand forecasting')}</p>
        </div>

        <div className="neu-card p-6 sm:p-8 rounded-3xl bg-card w-full shadow-2xl relative">

          <div className="w-full">
            <SignIn 
              routing="hash" 
              forceRedirectUrl="/dashboard"
              appearance={appearanceProps}
            />
          </div>
          
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
