import { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, Area, AreaChart } from 'recharts';

const heroChartData = Array.from({ length: 50 }, (_, i) => ({
  value: 30 + Math.sin(i / 5) * 20 + Math.random() * 10 + i * 0.5,
}));

export const HeroSection = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // 3D Tilt Motion Values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-10, 10]);

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
        color: i % 2 === 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(6, 182, 212, 0.25)',
      });
    }

    let mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw neural connections
      ctx.lineWidth = 0.55;
      for (let i = 0; i < numParticles; i++) {
        const p1 = particles[i];

        // Particle movement & bounds bounce
        p1.x += p1.vx;
        p1.y += p1.vy;
        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        // Subtle attraction to mouse
        const dxMouse = mouse.x - p1.x;
        const dyMouse = mouse.y - p1.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 250) {
          p1.x += dxMouse * 0.005;
          p1.y += dyMouse * 0.005;
        }

        // Draw particle node
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = p1.color;
        ctx.fill();

        // Connect nodes close to each other
        for (let j = i + 1; j < numParticles; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 130) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            // Higher opacity for closer connections
            const alpha = (1 - distance / 130) * 0.15;
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Relative coordinates between -0.5 and 0.5
    const relativeX = (e.clientX - rect.left) / width - 0.5;
    const relativeY = (e.clientY - rect.top) / height - 0.5;
    
    x.set(relativeX);
    y.set(relativeY);
  };

  const handleCardMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Dynamic Interactive Neural Orbit Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Radial Theme Overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.12),transparent_55%)] pointer-events-none" />
      
      {/* Backdrop Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:65px_65px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)] pointer-events-none" />

      {/* Floating Elements - premium glass style */}
      <motion.div
        className="absolute top-1/4 left-[10%] w-20 h-20 rounded-2xl bg-primary/10 backdrop-blur-md border border-primary/20 hidden md:flex items-center justify-center shadow-lg"
        animate={{ y: [0, -18, 0], rotate: [0, 6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <TrendingUp className="w-8 h-8 text-primary drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
      </motion.div>

      <motion.div
        className="absolute bottom-1/4 right-[15%] w-16 h-16 rounded-2xl bg-accent/10 backdrop-blur-md border border-accent/20 hidden md:flex items-center justify-center shadow-lg"
        animate={{ y: [0, 16, 0], rotate: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <BarChart3 className="w-6 h-6 text-accent drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
      </motion.div>

      <motion.div
        className="absolute top-1/3 right-[20%] w-14 h-14 rounded-2xl bg-success/10 backdrop-blur-md border border-success/20 hidden lg:flex items-center justify-center shadow-lg"
        animate={{ y: [0, -14, 0], rotate: [0, 9, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <Zap className="w-5 h-5 text-success drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm mb-8"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <span className="text-xs sm:text-sm font-semibold text-primary tracking-wide uppercase">AI-Powered Intelligence Platform</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-8xl font-extrabold tracking-tight mb-6"
          >
            <span className="block text-foreground drop-shadow-sm">Predict Demand.</span>
            <span className="block gradient-text drop-shadow-[0_0_15px_rgba(99,102,241,0.25)]">Optimize Inventory.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 text-balance px-2"
          >
            Make smarter, automated business decisions with deep AI-driven demand forecasting 
            and inventory optimization that continually learns from your data.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 px-4 sm:px-0"
          >
            <Button asChild size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-semibold rounded-xl glow transition-transform duration-350 hover:scale-[1.03]">
              <Link to="/dashboard">
                View Live Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-semibold rounded-xl transition-all duration-350 hover:bg-muted/80 hover:scale-[1.03]">
              <Link to="/dashboard">
                <Play className="mr-2 h-5 w-5 fill-current" />
                Try AI Forecast
              </Link>
            </Button>
          </motion.div>

          {/* Interactive 3D Parallax Tilt Hero Chart */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative mx-auto max-w-4xl perspective-1000"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            
            <motion.div
              ref={cardRef}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              style={{ rotateX, rotateY }}
              className="relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-4 sm:p-7 shadow-2xl preserve-3d transition-shadow duration-300 hover:shadow-[0_0_50px_rgba(99,102,241,0.25)]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-destructive/80" />
                  <div className="w-3.5 h-3.5 rounded-full bg-warning/80" />
                  <div className="w-3.5 h-3.5 rounded-full bg-success/80" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-muted-foreground tracking-wider uppercase">Demand Forecast — Interactive Live Preview</span>
              </div>
              
              <div className="h-44 sm:h-72">
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
    </section>
  );
};
