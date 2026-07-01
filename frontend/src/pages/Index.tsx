import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { MetricsSection } from '@/components/landing/MetricsSection';
import { UseCasesSection } from '@/components/landing/UseCasesSection';
import { Footer } from '@/components/landing/Footer';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// Final CTA section with big animated call-to-action
const CTASection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-24 sm:py-36 relative overflow-hidden" style={{ background: 'var(--neu-bg, #dde1e7)' }}>
      {/* Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(16,185,129,0.08) 50%, transparent 70%)' }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase text-primary mb-8"
            style={{ boxShadow: '4px 4px 10px rgba(163,177,198,0.5), -4px -4px 10px rgba(255,255,255,0.8)', background: 'var(--neu-bg, #dde1e7)' }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Start Today — Free
          </motion.div>

          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
            Ready to{' '}
            <span style={{ backgroundImage: 'linear-gradient(135deg, #2563EB, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              transform
            </span>{' '}
            your supply chain?
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-12 leading-relaxed">
            Join thousands of businesses using SupplyMind AI to make smarter, faster decisions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div
              whileHover={{ scale: 1.06, y: -3 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-primary text-white text-lg font-bold shadow-[0_8px_30px_rgba(37,99,235,0.45)] hover:shadow-[0_12px_40px_rgba(37,99,235,0.6)] transition-shadow"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-lg font-bold text-muted-foreground"
                style={{ boxShadow: '6px 6px 14px rgba(163,177,198,0.55), -6px -6px 14px rgba(255,255,255,0.85)', background: 'var(--neu-bg, #dde1e7)' }}
              >
                Go to Dashboard
              </Link>
            </motion.div>
          </div>

          <p className="mt-8 text-sm text-muted-foreground opacity-60">
            🔐 No credit card required · SOC2 Compliant · Enterprise Ready
          </p>
        </motion.div>
      </div>
    </section>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen" style={{ background: 'var(--neu-bg, #dde1e7)' }}>
      <LandingNavbar />
      <main>
        <HeroSection />
        <section id="features">
          <FeaturesSection />
        </section>
        <MetricsSection />
        <section id="use-cases">
          <UseCasesSection />
        </section>
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
