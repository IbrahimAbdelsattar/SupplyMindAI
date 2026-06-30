import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { SupplyMindLogo } from '@/components/brand/SupplyMindLogo';
import { ArrowLeft, Zap, ShieldCheck, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ── Emil Design: Strong custom easing curves ─────────────────────────────────
const EASE_OUT   = [0.23, 1, 0.32, 1] as const;
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

// ── Floating orb background ───────────────────────────────────────────────────
const Orb = ({ cx, cy, r, color, delay = 0 }: { cx: string; cy: string; r: string; color: string; delay?: number }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ left: cx, top: cy, width: r, height: r, background: color, transform: 'translate(-50%, -50%)' }}
    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay }}
  />
);

// ── 3D Tilt Card wrapper (Emil spring mouse tracking) ─────────────────────────
function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Emil: use spring to add momentum so it doesn't feel artificial
  const springX = useSpring(rawX, { stiffness: 120, damping: 18 });
  const springY = useSpring(rawY, { stiffness: 120, damping: 18 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-6, 6]);
  const shadowX = useTransform(springX, [-0.5, 0.5], ['-8px', '8px']);
  const shadowY = useTransform(springY, [-0.5, 0.5], ['-8px', '8px']);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set(((e.clientX - rect.left) / rect.width) - 0.5);
    rawY.set(((e.clientY - rect.top) / rect.height) - 0.5);
  };

  const handleLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        boxShadow: `${shadowX.get()} ${shadowY.get()} 40px rgba(163,177,198,0.55), -10px -10px 30px rgba(255,255,255,0.75)`
      }}
      className="w-full relative"
    >
      {children}
    </motion.div>
  );
}

// ── Neumorphic CSS injected globally ─────────────────────────────────────────
const neuStyles = `
  :root {
    --neu-bg: #dde1e7;
    --neu-shadow-dark: rgba(163,177,198,0.6);
    --neu-shadow-light: rgba(255,255,255,0.85);
    --neu-text: #4a5568;
    --neu-accent: #2563EB;
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  }
  .dark {
    --neu-bg: #1a1c23;
    --neu-shadow-dark: #111217;
    --neu-shadow-light: #242730;
    --neu-text: #94a3b8;
    --neu-accent: #3b82f6;
  }

  html, body {
    background-color: var(--neu-bg) !important;
    transition: background-color 300ms ease;
  }

  /* Pill toggle track */
  .neu-segmented {
    background: var(--neu-bg);
    box-shadow:
      inset 6px 6px 12px var(--neu-shadow-dark),
      inset -6px -6px 12px var(--neu-shadow-light);
    border-radius: 22px;
    padding: 6px;
    display: flex;
    position: relative;
    margin-bottom: 2rem;
    gap: 4px;
  }

  /* Sliding pill */
  .neu-pill {
    position: absolute;
    inset: 6px;
    border-radius: 18px;
    background: var(--neu-bg);
    box-shadow:
      5px 5px 10px var(--neu-shadow-dark),
      -5px -5px 10px var(--neu-shadow-light);
    z-index: 0;
    width: calc(50% - 6px);
    transition: transform 350ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  .neu-pill.right {
    transform: translateX(calc(100% + 4px));
  }

  .neu-tab-btn {
    flex: 1;
    padding: 12px 0;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.01em;
    color: var(--neu-text);
    position: relative;
    z-index: 1;
    cursor: pointer;
    transition: color 200ms var(--ease-out);
    border-radius: 18px;
    text-align: center;
    user-select: none;
  }
  .neu-tab-btn.active {
    color: var(--neu-accent);
  }

  /* Clerk form overrides */
  .cl-rootBox, .cl-card {
    background: transparent !important;
    box-shadow: none !important;
    border: 0 !important;
    padding: 0 !important;
  }
  .cl-cardBox {
    background: transparent !important;
    box-shadow: none !important;
    border: 0 !important;
  }
  .cl-header { display: none !important; }
  .cl-headerTitle { display: none !important; }
  .cl-headerSubtitle { display: none !important; }
  
  .cl-formFieldInput {
    background: var(--neu-bg) !important;
    box-shadow:
      inset 4px 4px 8px var(--neu-shadow-dark),
      inset -4px -4px 8px var(--neu-shadow-light) !important;
    border: none !important;
    border-radius: 14px !important;
    height: 52px !important;
    color: var(--neu-text) !important;
    font-size: 15px !important;
    font-weight: 500 !important;
    transition: box-shadow 200ms var(--ease-out) !important;
    padding-left: 16px !important;
  }

  .cl-formFieldInput:focus {
    box-shadow:
      inset 6px 6px 12px var(--neu-shadow-dark),
      inset -2px -2px 6px var(--neu-shadow-light),
      0 0 0 2px var(--neu-accent) !important;
    outline: none !important;
  }

  .cl-formButtonPrimary {
    background: var(--neu-bg) !important;
    box-shadow:
      6px 6px 14px var(--neu-shadow-dark),
      -6px -6px 14px var(--neu-shadow-light) !important;
    border: none !important;
    color: var(--neu-accent) !important;
    font-weight: 700 !important;
    font-size: 15px !important;
    letter-spacing: 0.02em !important;
    height: 52px !important;
    border-radius: 14px !important;
    transition:
      transform 160ms var(--ease-out),
      box-shadow 160ms var(--ease-out) !important;
  }

  .cl-formButtonPrimary:hover {
    box-shadow:
      4px 4px 10px var(--neu-shadow-dark),
      -4px -4px 10px var(--neu-shadow-light) !important;
  }
  
  /* Emil: active press state — must feel tactile */
  .cl-formButtonPrimary:active {
    transform: scale(0.97) !important;
    box-shadow:
      inset 4px 4px 8px var(--neu-shadow-dark),
      inset -4px -4px 8px var(--neu-shadow-light) !important;
  }

  .cl-socialButtonsBlockButton {
    background: var(--neu-bg) !important;
    box-shadow:
      5px 5px 10px var(--neu-shadow-dark),
      -5px -5px 10px var(--neu-shadow-light) !important;
    border: none !important;
    border-radius: 14px !important;
    height: 52px !important;
    font-weight: 600 !important;
    color: var(--neu-text) !important;
    transition: transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out) !important;
  }
  .cl-socialButtonsBlockButton:hover {
    box-shadow:
      3px 3px 8px var(--neu-shadow-dark),
      -3px -3px 8px var(--neu-shadow-light) !important;
    transform: translateY(-1px) !important;
  }
  .cl-socialButtonsBlockButton:active {
    transform: scale(0.97) !important;
    box-shadow:
      inset 3px 3px 6px var(--neu-shadow-dark),
      inset -3px -3px 6px var(--neu-shadow-light) !important;
  }

  .cl-dividerLine { background-color: var(--neu-shadow-dark) !important; opacity: 0.3; }
  .cl-dividerText { color: var(--neu-text) !important; opacity: 0.6; font-weight: 500; }
  .cl-formFieldLabel { color: var(--neu-text) !important; font-weight: 600; font-size: 13px; letter-spacing: 0.03em; text-transform: uppercase; }
  .cl-formResendCodeLink, .cl-footerActionLink, .cl-identityPreviewEditButton { color: var(--neu-accent) !important; font-weight: 600; }
  .cl-internal-1x67qeb { color: var(--neu-text) !important; }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;

// ── Feature pills shown on the page ──────────────────────────────────────────
const features = [
  { icon: Zap,         label: 'AI-Powered Forecasting' },
  { icon: TrendingUp,  label: 'Real-time Analytics'    },
  { icon: ShieldCheck, label: 'Enterprise Security'     },
];

// ── Main Auth Page ────────────────────────────────────────────────────────────
const AuthPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isSignUpRoute = location.pathname.includes('/sign-up');
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(isSignUpRoute ? 'signup' : 'signin');

  useEffect(() => {
    if (activeTab === 'signup' && location.pathname !== '/sign-up') navigate('/sign-up', { replace: true });
    else if (activeTab === 'signin' && location.pathname !== '/login') navigate('/login', { replace: true });
  }, [activeTab, navigate, location.pathname]);

  const clerkAppearance = {
    elements: {
      rootBox: 'w-full',
      cardBox: 'w-full shadow-none border-0 bg-transparent',
      card: 'w-full shadow-none border-0 bg-transparent p-0',
    },
    variables: {
      colorText: 'var(--neu-text)',
      colorTextSecondary: 'var(--neu-text)',
      colorInputText: 'var(--neu-text)',
      colorPrimary: '#2563EB',
      borderRadius: '14px',
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start py-10 px-4 overflow-y-auto overflow-x-hidden relative"
      style={{ backgroundColor: 'var(--neu-bg)' }}
    >
      <style>{neuStyles}</style>

      {/* ── Animated background orbs ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Orb cx="15%" cy="20%" r="420px" color="radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)" delay={0} />
        <Orb cx="85%" cy="70%" r="380px" color="radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 70%)" delay={2} />
        <Orb cx="60%" cy="10%" r="300px" color="radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" delay={4} />
      </div>

      {/* ── Back button ──────────────────────────────────────────────────── */}
      <motion.div
        className="self-start mb-6 relative z-10"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold transition-all duration-150 hover:gap-3"
          style={{ color: 'var(--neu-text)' }}
        >
          <motion.span
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: 'var(--neu-bg)', boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)' }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.span>
          {t('common:backToHome') ?? 'Back to Home'}
        </Link>
      </motion.div>

      {/* ── Logo + tagline ───────────────────────────────────────────────── */}
      <motion.div
        className="flex flex-col items-center mb-8 relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.05 }}
      >
        <motion.div
          className="mb-4 p-4 rounded-3xl"
          style={{ background: 'var(--neu-bg)', boxShadow: '8px 8px 16px var(--neu-shadow-dark), -8px -8px 16px var(--neu-shadow-light)' }}
          whileHover={{ scale: 1.06, rotate: 2 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, bounce: 0.25 }}
        >
          <SupplyMindLogo iconClassName="w-10 h-10" />
        </motion.div>
        <p className="text-sm font-semibold tracking-widest uppercase opacity-60" style={{ color: 'var(--neu-text)' }}>
          Intelligence for Supply Chain
        </p>
      </motion.div>

      {/* ── Feature pills ────────────────────────────────────────────────── */}
      <motion.div
        className="flex flex-wrap justify-center gap-3 mb-8 relative z-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.12 }}
      >
        {features.map(({ icon: Icon, label }, i) => (
          <motion.div
            key={label}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
            style={{
              background: 'var(--neu-bg)',
              boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
              color: 'var(--neu-text)'
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.15 + i * 0.07 }}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.96 }}
          >
            <Icon className="w-3.5 h-3.5 text-blue-500" />
            {label}
          </motion.div>
        ))}
      </motion.div>

      {/* ── Auth Card (3D tilt + neumorphism) ────────────────────────────── */}
      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: EASE_DRAWER, delay: 0.1 }}
      >
        <TiltCard>
          <motion.div layout className="neu-card w-full" style={{ transformStyle: 'preserve-3d' }}>

            {/* ── Segmented control (CSS pill — no JS layout needed for perf) */}
            <div className="neu-segmented select-none mb-6">
              <div className={`neu-pill ${activeTab === 'signup' ? 'right' : ''}`} />
              <div
                className={`neu-tab-btn ${activeTab === 'signin' ? 'active' : ''}`}
                onClick={() => setActiveTab('signin')}
              >
                Sign In
              </div>
              <div
                className={`neu-tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
                onClick={() => setActiveTab('signup')}
              >
                Sign Up
              </div>
            </div>

            {/* ── Clerk widget with blur crossfade (Emil blur trick) ─────── */}
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8, filter: 'blur(6px)', scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(6px)', scale: 0.99 }}
                  transition={{ duration: 0.22, ease: EASE_OUT }}
                  className="w-full"
                >
                  {activeTab === 'signin' ? (
                    <SignIn
                      path="/login"
                      routing="path"
                      signUpUrl="/sign-up"
                      afterSignInUrl="/dashboard"
                      appearance={clerkAppearance}
                    />
                  ) : (
                    <SignUp
                      path="/sign-up"
                      routing="path"
                      signInUrl="/login"
                      afterSignUpUrl="/dashboard"
                      appearance={clerkAppearance}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

          </motion.div>
        </TiltCard>
      </motion.div>

      {/* ── Bottom trust badge ───────────────────────────────────────────── */}
      <motion.p
        className="mt-8 text-xs font-medium opacity-40 relative z-10"
        style={{ color: 'var(--neu-text)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        🔐 Secured by Clerk · SOC2 Compliant · Enterprise Ready
      </motion.p>
    </div>
  );
};

export default AuthPage;
