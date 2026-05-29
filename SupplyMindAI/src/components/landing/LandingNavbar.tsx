import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, BarChart3, Menu, X } from 'lucide-react';

export const LandingNavbar = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
          </div>
          <span className="text-lg sm:text-xl font-bold">Supply Mind</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#use-cases" className="text-muted-foreground hover:text-foreground transition-colors">
            Use Cases
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button asChild variant="ghost" className="rounded-xl">
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link to="/login">Get Started</Link>
          </Button>
        </div>

        {/* Mobile buttons */}
        <div className="flex md:hidden items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl h-9 w-9">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="rounded-xl h-9 w-9">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <a href="#features" onClick={() => setMobileOpen(false)} className="py-2 text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#use-cases" onClick={() => setMobileOpen(false)} className="py-2 text-muted-foreground hover:text-foreground transition-colors">
                Use Cases
              </a>
              <a href="#pricing" onClick={() => setMobileOpen(false)} className="py-2 text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <div className="flex gap-3 pt-2 border-t border-border/50">
                <Button asChild variant="outline" className="flex-1 rounded-xl">
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild className="flex-1 rounded-xl">
                  <Link to="/login">Get Started</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
