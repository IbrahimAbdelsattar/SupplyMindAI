import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, Area, AreaChart } from 'recharts';

const heroChartData = Array.from({ length: 50 }, (_, i) => ({
  value: 30 + Math.sin(i / 5) * 20 + Math.random() * 10 + i * 0.5,
}));

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.1),transparent_50%)]" />
      
      {/* Animated Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

      {/* Floating Elements - hidden on mobile */}
      <motion.div
        className="absolute top-1/4 left-[10%] w-20 h-20 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/20 hidden md:flex"
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex items-center justify-center h-full w-full">
          <TrendingUp className="w-8 h-8 text-primary" />
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-1/4 right-[15%] w-16 h-16 rounded-2xl bg-accent/10 backdrop-blur-sm border border-accent/20 hidden md:flex"
        animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <div className="flex items-center justify-center h-full w-full">
          <BarChart3 className="w-6 h-6 text-accent" />
        </div>
      </motion.div>

      <motion.div
        className="absolute top-1/3 right-[20%] w-14 h-14 rounded-2xl bg-success/10 backdrop-blur-sm border border-success/20 hidden lg:flex"
        animate={{ y: [0, -15, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <div className="flex items-center justify-center h-full w-full">
          <Zap className="w-5 h-5 text-success" />
        </div>
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm mb-6 sm:mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs sm:text-sm font-medium text-primary">AI-Powered Intelligence Platform</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 sm:mb-6"
          >
            <span className="block">Predict Demand.</span>
            <span className="block gradient-text">Optimize Inventory.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 sm:mb-10 text-balance px-2"
          >
            Make smarter business decisions with AI-driven demand forecasting 
            and inventory optimization that learns from your data.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-16 px-4 sm:px-0"
          >
            <Button asChild size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-semibold rounded-xl glow">
              <Link to="/login">
                View Live Dashboard
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-semibold rounded-xl">
              <Link to="/login">
                <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Try AI Forecast
              </Link>
            </Button>
          </motion.div>

          {/* Hero Chart */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative mx-auto max-w-4xl"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-3 sm:p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-destructive/80" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-warning/80" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-success/80" />
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">Demand Forecast — Live Preview</span>
              </div>
              <div className="h-40 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={heroChartData}>
                    <defs>
                      <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#heroGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
