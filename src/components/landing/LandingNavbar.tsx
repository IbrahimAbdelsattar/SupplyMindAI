import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Menu, X, Languages, ArrowRight } from 'lucide-react';
import { SupplyMindLogo } from '@/components/brand/SupplyMindLogo';
import { useTranslation } from 'react-i18next';

// Emil: custom ease curves
const EASE_OUT   = [0.23, 1, 0.32, 1] as const;
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

export const LandingNavbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation(['landing', 'common']);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language?.startsWith('ar') ? 'en' : 'ar');
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#features', label: t('navbar.features') },
    { href: '#use-cases', label: t('navbar.useCases') },
    { href: '#pricing', label: t('navbar.pricing') },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-xl bg-white/80 dark:bg-[#1a1c23]/80 shadow-[0_4px_24px_rgba(163,177,198,0.25)]'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <SupplyMindLogo />
          </motion.div>
        </Link>

        {/* Desktop nav links with hover underline */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="relative px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors duration-150 group"
            >
              {label}
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
            </a>
          ))}
        </div>

        {/* Desktop CTA row */}
        <div className="hidden md:flex items-center gap-2">
          <motion.button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: 'none' }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </motion.button>
          <motion.button
            onClick={toggleLanguage}
            className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Languages className="h-4 w-4" />
          </motion.button>
          <motion.div
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground transition-all duration-150"
              style={{ boxShadow: '4px 4px 10px rgba(163,177,198,0.5), -4px -4px 10px rgba(255,255,255,0.8)', background: 'var(--background)' }}
            >
              Sign In
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-[0_4px_14px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.5)] transition-shadow"
            >
              {t('navbar.getStarted')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        {/* Mobile buttons */}
        <div className="flex md:hidden items-center gap-1">
          <button onClick={toggleTheme} className="p-2.5 rounded-xl text-muted-foreground">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={toggleLanguage} className="p-2.5 rounded-xl text-muted-foreground">
            <Languages className="h-4 w-4" />
          </button>
          <motion.button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2.5 rounded-xl text-muted-foreground"
            whileTap={{ scale: 0.92 }}
          >
            <AnimatePresence mode="wait">
              {mobileOpen
                ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="h-5 w-5" /></motion.div>
                : <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu className="h-5 w-5" /></motion.div>
              }
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
            exit={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.25, ease: EASE_DRAWER }}
            className="md:hidden overflow-hidden backdrop-blur-xl bg-white/90 dark:bg-[#1a1c23]/90 border-b border-border"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
              {navLinks.map(({ href, label }, i) => (
                <motion.a
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, ease: EASE_OUT, duration: 0.25 }}
                  className="px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/60 transition-colors"
                >
                  {label}
                </motion.a>
              ))}
              <div className="pt-3 border-t border-border mt-2">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-sm font-bold"
                >
                  {t('navbar.getStarted')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
