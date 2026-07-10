import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { SupplyMindLogo } from '@/components/brand/SupplyMindLogo';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
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
          <div className="flex items-center justify-center mb-2">
            <SupplyMindLogo iconClassName="w-10 h-10" textClassName="text-3xl font-bold" />
          </div>
          <p className="text-muted-foreground font-medium">{t('common:tagline', 'From Chaos to Clarity in Supply Chain Management')}</p>
        </div>

        <div className="neu-card p-6 sm:p-8 rounded-3xl bg-card w-full shadow-2xl relative">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="neu-btn w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors text-sm active:scale-[0.97]"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Sign In</h2>
                  <p className="text-sm text-muted-foreground">Enter your credentials to access the dashboard.</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="neu-basin w-full px-4 py-3 rounded-xl bg-background text-foreground placeholder:text-muted-foreground/60 border border-border/50 focus:border-primary/50 focus:ring-0 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="neu-basin w-full px-4 py-3 pr-11 rounded-xl bg-background text-foreground placeholder:text-muted-foreground/60 border border-border/50 focus:border-primary/50 focus:ring-0 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="neu-btn neu-glow text-primary-foreground font-bold transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] w-full mt-2 py-3 rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-xs text-muted-foreground/70 text-center max-w-[320px]">
          Contact your administrator if you need an account or have trouble signing in.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
