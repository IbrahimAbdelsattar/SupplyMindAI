import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { MetricsSection } from '@/components/landing/MetricsSection';
import { UseCasesSection } from '@/components/landing/UseCasesSection';
import { OurStorySection } from '@/components/landing/OurStorySection';
import { MobileStickyCTA } from '@/components/landing/MobileStickyCTA';
import { Footer } from '@/components/landing/Footer';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, CreditCard, Building2, Volume2, VolumeX, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { viewportFadeUp } from '@/lib/animations';

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function fadeUpProps(reduceMotion: boolean) {
  return reduceMotion
    ? { initial: { opacity: 1 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0 } }
    : viewportFadeUp;
}

// Cinematic Intro Overlay Component
const IntroVideoOverlay = ({ onComplete }: { onComplete: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleComplete = () => {
      if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
      onComplete();
    };

    // Failsafe: if video doesn't end within 12 seconds, skip it automatically
    fallbackTimeoutRef.current = setTimeout(() => {
      console.warn("Intro video timed out, skipping to app.");
      handleComplete();
    }, 12000);

    video.addEventListener('ended', handleComplete);
    video.addEventListener('error', handleComplete);
    
    // Force muted to guarantee autoplay works in all browsers
    video.defaultMuted = true;
    video.muted = true;

    // Attempt autoplay
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Autoplay blocked or failed:', err);
        // If it completely fails to play even muted, skip to app immediately
        handleComplete();
      });
    }

    return () => {
      if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
      video.removeEventListener('ended', handleComplete);
      video.removeEventListener('error', handleComplete);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden cursor-pointer"
      onClick={onComplete}
      title="Click to skip"
    >
      <video
        ref={videoRef}
        src="/intro.mp4"
        className="w-full h-full object-cover pointer-events-none"
        playsInline
        autoPlay
        muted
        loop={false}
        onError={onComplete}
      />
    </motion.div>
  );
};

// Final CTA section with big animated call-to-action
const CTASection = () => {
  const { t } = useTranslation('landing');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const reduceMotion = usePrefersReducedMotion();

  return (
    <section ref={ref} className="py-24 sm:py-36 relative overflow-hidden" style={{ background: 'var(--neu-bg, #dde1e7)' }}>
      {/* Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(16,185,129,0.08) 50%, transparent 70%)' }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 32, scale: 0.97 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="max-w-3xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            {...fadeUpProps(reduceMotion)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase text-primary mb-6"
            style={{ boxShadow: '4px 4px 10px rgba(163,177,198,0.5), -4px -4px 10px rgba(255,255,255,0.8)', background: 'var(--neu-bg, #dde1e7)' }}
          >
            <motion.span
              className="w-2 h-2 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {t('cta.badge')}
          </motion.div>

          {/* Urgency line */}
          <motion.p
            {...fadeUpProps(reduceMotion)}
            className="text-sm font-medium text-muted-foreground mb-4"
          >
            {t('cta.urgency')}
          </motion.p>

          {/* Headline */}
          <motion.h2
            {...fadeUpProps(reduceMotion)}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight"
          >
            {t('cta.headline', { action: '' }).replace('  ', ' ')}
          </motion.h2>

          <motion.p
            {...fadeUpProps(reduceMotion)}
            className="text-lg sm:text-xl text-muted-foreground mb-12 leading-relaxed"
          >
            {t('cta.subtext')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            {...fadeUpProps(reduceMotion)}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          >
            <motion.div
              whileHover={{ scale: 1.06, y: -3 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-primary text-white text-lg font-bold shadow-[0_8px_30px_rgba(37,99,235,0.45)] hover:shadow-[0_12px_40px_rgba(37,99,235,0.6)] transition-shadow"
              >
                {t('cta.ctaPrimary')}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold text-muted-foreground"
                style={{
                  background: 'var(--neu-bg, #dde1e7)',
                  boxShadow: '6px 6px 14px rgba(163,177,198,0.55), -6px -6px 14px rgba(255,255,255,0.85)',
                }}
              >
                {t('cta.bookDemo')}
              </Link>
            </motion.div>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            {...fadeUpProps(reduceMotion)}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              {t('cta.trustSoc2')}
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              {t('cta.trustNoCC')}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-500" />
              {t('cta.trustEnterprise')}
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);

  // Hide floating chatbot widget on the landing page
  useEffect(() => {
    const chatbotBtn = document.querySelector('.fixed.bottom-4.right-4, .fixed.bottom-6.right-6');
    if (chatbotBtn) {
      (chatbotBtn as HTMLElement).style.display = 'none';
    }
  }, []);

  return (
    <>
      <AnimatePresence>
        {showIntro && <IntroVideoOverlay onComplete={() => setShowIntro(false)} />}
      </AnimatePresence>

      <div className="min-h-screen" style={{ background: 'var(--neu-bg, #dde1e7)' }}>
        <LandingNavbar />
        <main>
          <HeroSection onPlayIntro={() => setShowIntro(true)} />
          <section id="features">
            <FeaturesSection />
          </section>
          <MetricsSection />
          <section id="use-cases">
            <UseCasesSection />
          </section>
          <OurStorySection />
          <CTASection />
        </main>
        <Footer />
        <MobileStickyCTA />
      </div>
    </>
  );
};

export default Index;
