import { useRef } from 'react';
import { motion, useSpring, useTransform, useMotionValue, useInView } from 'framer-motion';
import { ArrowRight, Play, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, Area, AreaChart, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';

const EASE_OUT    = [0.23, 1, 0.32, 1] as const;
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

// Stable random-ish chart data
const heroChartData = Array.from({ length: 50 }, (_, i) => ({
  value: 30 + Math.sin(i / 5) * 20 + (i % 7) * 1.5 + i * 0.5,
  forecast: 28 + Math.sin(i / 4.5) * 18 + (i % 5) * 1.2 + i * 0.6,
}));

// Floating orb
const Orb = ({ style, delay = 0 }: { style: React.CSSProperties; delay?: number }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={style}
    animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.85, 0.5] }}
    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay }}
  />
);

// 3D tilt card — Emil spring mouse tracking
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 100, damping: 20 });
  const springY = useSpring(rawY, { stiffness: 100, damping: 20 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-5, 5]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    rawX.set((e.clientX - r.left) / r.width - 0.5);
    rawY.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => { rawX.set(0); rawY.set(0); }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const HeroSection = () => {
  const { t } = useTranslation('landing');
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true });

  // Stagger container
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
      style={{ background: 'var(--neu-bg, #dde1e7)' }}
    >
      {/* ── Animated background orbs ──────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <Orb delay={0} style={{ left: '8%', top: '15%', width: 520, height: 520, background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />
        <Orb delay={2.5} style={{ right: '5%', top: '60%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 70%)', transform: 'translate(50%,-50%)' }} />
        <Orb delay={5} style={{ left: '55%', top: '80%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          className="max-w-5xl mx-auto text-center"
          variants={container}
          initial="hidden"
          animate={isInView ? 'show' : 'hidden'}
        >
          {/* Badge */}
          <motion.div variants={item} className="flex justify-center mb-8">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase"
              style={{
                background: 'var(--neu-bg, #dde1e7)',
                boxShadow: '4px 4px 10px rgba(163,177,198,0.5), -4px -4px 10px rgba(255,255,255,0.8)',
                color: '#2563EB',
              }}
              whileHover={{ scale: 1.04 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <motion.span
                className="w-2 h-2 rounded-full bg-emerald-500"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </motion.span>
              {t('hero.badge')}
            </motion.div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={item}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]"
          >
            <span className="block text-foreground">{t('hero.headline1')}</span>
            <span
              className="block"
              style={{ backgroundImage: 'linear-gradient(135deg, #2563EB, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              {t('hero.headline2')}
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={item}
            className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed px-2"
          >
            {t('hero.subheadline')}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            variants={item}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Link
                to="/sign-up"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white text-lg font-bold shadow-[0_8px_24px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_32px_rgba(37,99,235,0.55)] transition-shadow group"
              >
                {t('hero.ctaPrimary')}
                <motion.span
                  className="inline-flex"
                  whileHover={{ x: 4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                >
                  <ArrowRight className="h-5 w-5" />
                </motion.span>
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold text-muted-foreground transition-all"
                style={{
                  background: 'var(--neu-bg, #dde1e7)',
                  boxShadow: '6px 6px 14px rgba(163,177,198,0.55), -6px -6px 14px rgba(255,255,255,0.85)',
                }}
              >
                <Play className="h-5 w-5 text-primary" />
                {t('hero.ctaSecondary')}
              </Link>
            </motion.div>
          </motion.div>

          {/* ── 3D tilt hero chart card ────────────────────────────── */}
          <motion.div
            variants={item}
            className="mx-auto max-w-4xl"
          >
            <TiltCard>
              <div
                className="rounded-3xl p-5 sm:p-8 relative overflow-hidden"
                style={{
                  background: 'var(--neu-bg, #dde1e7)',
                  boxShadow: '14px 14px 30px rgba(163,177,198,0.55), -14px -14px 30px rgba(255,255,255,0.85)',
                }}
              >
                {/* Decorative glow */}
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-[60px] pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-emerald-400/10 blur-[40px] pointer-events-none" />

                {/* Window chrome dots */}
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.08 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                    <motion.div className="w-3 h-3 rounded-full bg-red-400" whileHover={{ scale: 1.4 }} />
                    <motion.div className="w-3 h-3 rounded-full bg-amber-400" whileHover={{ scale: 1.4 }} />
                    <motion.div className="w-3 h-3 rounded-full bg-emerald-400" whileHover={{ scale: 1.4 }} />
                  </motion.div>
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-primary"
                    style={{
                      background: 'var(--neu-bg, #dde1e7)',
                      boxShadow: 'inset 3px 3px 6px rgba(163,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.8)',
                    }}
                  >
                    <TrendingUp className="w-3 h-3" />
                    {t('hero.chartLabel')}
                  </div>
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Live
                  </motion.div>
                </div>

                {/* Chart */}
                <div className="h-48 sm:h-72 relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={heroChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="heroGradientMain" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="heroGradientForecast" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(255,255,255,0.9)',
                          border: 'none',
                          borderRadius: 12,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      />
                      <Area type="monotone" dataKey="forecast" stroke="#10B981" strokeWidth={2.5} fill="url(#heroGradientForecast)" strokeDasharray="6 4" name="Forecast" />
                      <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={3} fill="url(#heroGradientMain)" name="Actual" dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Bottom stat pills */}
                <div className="flex flex-wrap justify-center gap-3 mt-6 pt-4 border-t border-black/5 relative z-10">
                  {[
                    { label: 'Accuracy', value: '98%', color: '#2563EB' },
                    { label: 'Cost Reduction', value: '−25%', color: '#10B981' },
                    { label: 'Uptime', value: '99.9%', color: '#6366f1' },
                  ].map(({ label, value, color }) => (
                    <motion.div
                      key={label}
                      whileHover={{ scale: 1.06, y: -2 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold cursor-default border"
                      style={{
                        background: 'var(--neu-bg, #dde1e7)',
                        borderColor: `${color}40`,
                        color,
                      }}
                    >
                      <motion.span
                        className="w-2 h-2 rounded-full"
                        style={{ background: color }}
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      {value} {label}
                    </motion.div>
                  ))}
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};