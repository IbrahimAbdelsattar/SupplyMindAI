import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, ArrowLeft, Loader2, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast({
        title: t('common:error'),
        description: t('login:fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast({
        title: t('login:welcomeBack'),
        description: t('login:loggedInAs', { email: loginEmail }),
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: t('common:error'),
        description: error instanceof Error ? error.message : t('login:failedToLogin'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">{t('login:email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('login:emailPlaceholder')}
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    className="h-11 pl-10 rtl:pl-3 rtl:pr-10 bg-background/50 border-border/50 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">{t('login:password')}</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('login:passwordPlaceholder')}
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    className="h-11 pl-10 rtl:pl-3 rtl:pr-10 bg-background/50 border-border/50 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold mt-6 transition-transform hover:scale-[1.01]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 animate-spin" />
                    {t('login:signingIn')}
                  </>
                ) : (
                  t('login:signIn')
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/90 px-3 text-muted-foreground font-semibold tracking-wider flex items-center gap-1.5 rounded border border-border/20 py-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  Authorized accounts only
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Ask an administrator to provision your account before signing in.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
