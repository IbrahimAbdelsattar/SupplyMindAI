import { useRef, useEffect, useCallback } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useTranslation } from 'react-i18next';
import { SPRING_NORMAL } from '@/lib/animations';
import { cn } from '@/lib/utils';

const heroChartData = Array.from({ length: 50 }, (_, i) => ({
  value: 30 + Math.sin(i / 5) * 20 + Math.random() * 10 + i * 0.5,
}));

export const HeroSection = () => {
  const { t } = useTranslation('landing');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // ── 3D Mouse Tracking with Spring Interpolation ──
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    mouseX.set(x);
    mouseY.set(y);
  }, [mouseX, mouseY]);

  // ── Floating Elements State ──
  const floaters = [
    { Icon: TrendingUp, bgClass: 'bg-primary/10 border-primary/20', textClass: 'text-primary', top: '25%', left: '10%', size: 'w-20 h-20', iconSize: 'w-8 h-8', duration: 7, delay: 0, rotateRange: 8 },
    { Icon: BarChart3, bgClass: 'bg-secondary/10 border-secondary/20', textClass: 'text-secondary', bottom: '25%', left: '85%', size: 'w-16 h-16', iconSize: 'w-6 h-6', duration: 6, delay: 1, rotateRange: -6 },
    { Icon: Zap, bgClass: 'bg-success/10 border-success/20', textClass: 'text-success', top: '35%', left: '80%', size: 'w-14 h-14', iconSize: 'w-5 h-5', duration: 5.5, delay: 0.5, rotateRange: 10 },
  ];

  // Interactive Particle canvas background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
    }> = [];

    const numParticles = 45;
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1.5,
        color: i % 2 === 0 ? 'rgba(37, 99, 235, 0.3)' : 'rgba(16, 185, 129, 0.25)',
      });
    }

    const mouse = { x: -1000, y: -1000 };
    const handleMouse = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouse);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 0.55;
      for (let i = 0; i < numParticles; i++) {
        const p1 = particles[i];

        p1.x += p1.vx;
        p1.y += p1.vy;
        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        const dxMouse = mouse.x - p1.x;
        const dyMouse = mouse.y - p1.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 250) {
          p1.x += dxMouse * 0.005;
          p1.y += dyMouse * 0.005;
        }

        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = p1.color;
        ctx.fill();

        for (let j = i + 1; j < numParticles; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 130) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            const alpha = (1 - distance / 130) * 0.15;
            ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouse);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
    >
      {/* Dynamic Interactive Neural Orbit Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Backdrop Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:65px_65px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)] pointer-events-none" />

      {/* ── Floating Elements with 3D Parallax ── */}
      {floaters.map((f, i) => (
        <motion.div
          key={i}
          className={cn('absolute rounded-2xl hidden md:flex items-center justify-center', f.size, f.bgClass)}
          style={{
            top: f.top,
            left: f.left,
            bottom: f.bottom,
            transformStyle: 'preserve-3d',
          }}
          animate={{
            y: [0, i % 2 === 0 ? -18 : 16, 0],
            rotateX: [0, f.rotateRange, 0],
            rotateY: [0, -f.rotateRange, 0],
          }}
          transition={{
            y: { duration: f.duration, repeat: Infinity, ease: 'easeInOut', delay: f.delay },
            rotateX: { duration: f.duration * 1.2, repeat: Infinity, ease: 'easeInOut', delay: f.delay },
            rotateY: { duration: f.duration * 1.3, repeat: Infinity, ease: 'easeInOut', delay: f.delay + 0.3 },
          }}
        >
          <f.Icon className={cn(f.iconSize, f.textClass)} />
        </motion.div>
      ))}

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <span className="text-xs sm:text-sm font-semibold text-primary tracking-wide uppercase">{t('hero.badge')}</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="text-display mb-6"
          >
            <span className="block text-foreground">{t('hero.headline1')}</span>
            <span className="block text-primary">{t('hero.headline2')}</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="text-body sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 text-balance px-2"
          >
            {t('hero.subheadline')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 px-4 sm:px-0"
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_NORMAL}
              className="w-full sm:w-auto"
            >
              <Button asChild size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-semibold rounded-xl">
                <Link to="/dashboard">
                  {t('hero.ctaPrimary')}
                  <ArrowRight className="ml-2 rtl:ml-0 rtl:mr-2 h-5 w-5 rtl:rotate-180" />
                </Link>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_NORMAL}
              className="w-full sm:w-auto"
            >
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-semibold rounded-xl">
                <Link to="/dashboard">
                  <Play className="mr-2 rtl:mr-0 rtl:ml-2 h-5 w-5 fill-current" />
                  {t('hero.ctaSecondary')}
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* ── Hero Chart with 3D Perspective Mouse Tracking ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="relative mx-auto max-w-4xl"
            style={{ perspective: 1200 }}
          >
            <motion.div
              className="rounded-2xl border border-border bg-card p-4 sm:p-7 relative overflow-hidden"
              style={{
                rotateY: springX,
                rotateX: springY,
                transformStyle: 'preserve-3d',
              }}
              whileHover={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              {/* Subtle glow behind card */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="flex items-center justify-between mb-4 relative">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-destructive/80" />
                  <div className="w-3.5 h-3.5 rounded-full bg-warning/80" />
                  <div className="w-3.5 h-3.5 rounded-full bg-success/80" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-muted-foreground tracking-wider uppercase">{t('hero.chartLabel')}</span>
              </div>
              
              <div className="h-44 sm:h-72 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={heroChartData}>
                    <defs>
                      <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#heroGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Radial gradient glow behind hero content ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
    </section>
  );
};
