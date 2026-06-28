import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Menu, X, Languages } from 'lucide-react';
import { SupplyMindLogo } from '@/components/brand/SupplyMindLogo';
import { useTranslation } from 'react-i18next';
import { SPRING_NORMAL } from '@/lib/animations';

export const LandingNavbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation(['landing', 'common']);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language?.startsWith('ar') ? 'en' : 'ar');
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      {/* Glassmorphism backdrop — animates between states */}
      <div
        className="absolute inset-0 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? 'hsl(var(--background) / 0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '1px solid hsl(var(--border) / 0.5)' : '1px solid transparent',
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
        <Link to="/" className="flex items-center gap-2">
          <SupplyMindLogo />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-body">
            {t('navbar.features')}
          </a>
          <a href="#use-cases" className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-body">
            {t('navbar.useCases')}
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-body">
            {t('navbar.pricing')}
          </a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={SPRING_NORMAL}>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={SPRING_NORMAL}>
            <Button variant="ghost" size="icon" onClick={toggleLanguage} className="rounded-xl" title={i18n.language?.startsWith('ar') ? 'English' : 'العربية'}>
              <Languages className="h-5 w-5" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={SPRING_NORMAL}>
            <Button asChild variant="ghost" className="rounded-xl">
              <Link to="/dashboard">{t('navbar.signIn')}</Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={SPRING_NORMAL}>
            <Button asChild className="rounded-xl">
              <Link to="/dashboard">{t('navbar.getStarted')}</Link>
            </Button>
          </motion.div>
        </div>

        {/* Mobile buttons */}
        <div className="flex md:hidden items-center gap-2">
          <motion.div whileTap={{ scale: 0.9 }} transition={SPRING_NORMAL}>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl h-9 w-9">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.9 }} transition={SPRING_NORMAL}>
            <Button variant="ghost" size="icon" onClick={toggleLanguage} className="rounded-xl h-9 w-9" title={i18n.language?.startsWith('ar') ? 'English' : 'العربية'}>
              <Languages className="h-4 w-4" />
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.9 }} transition={SPRING_NORMAL}>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="rounded-xl h-9 w-9">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Mobile Menu with spring animation */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="md:hidden overflow-hidden"
            style={{
              backgroundColor: 'hsl(var(--background) / 0.95)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              borderBottom: '1px solid hsl(var(--border) / 0.5)',
            }}
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <a href="#features" onClick={() => setMobileOpen(false)} className="py-2 text-muted-foreground hover:text-foreground transition-colors duration-200 text-body">
                {t('navbar.features')}
              </a>
              <a href="#use-cases" onClick={() => setMobileOpen(false)} className="py-2 text-muted-foreground hover:text-foreground transition-colors duration-200 text-body">
                {t('navbar.useCases')}
              </a>
              <a href="#pricing" onClick={() => setMobileOpen(false)} className="py-2 text-muted-foreground hover:text-foreground transition-colors duration-200 text-body">
                {t('navbar.pricing')}
              </a>
              <div className="flex gap-3 pt-2 border-t border-border">
                <Button asChild variant="outline" className="flex-1 rounded-xl">
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>{t('navbar.signIn')}</Link>
                </Button>
                <Button asChild className="flex-1 rounded-xl">
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>{t('navbar.getStarted')}</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
