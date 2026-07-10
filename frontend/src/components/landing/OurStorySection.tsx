import { useTranslation } from "react-i18next";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { viewportFadeUp, staggerContainer, staggerItem } from "@/lib/animations";
import { motion } from "framer-motion";
import { Lightbulb, Rocket, Users, Globe } from "lucide-react";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function animProps(reduceMotion: boolean) {
  return reduceMotion
    ? { initial: { opacity: 1 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0 } }
    : viewportFadeUp;
}

function staggerProps(reduceMotion: boolean) {
  return reduceMotion
    ? { initial: { opacity: 1 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0 } }
    : staggerContainer;
}

function staggerChildProps(reduceMotion: boolean) {
  return reduceMotion
    ? { initial: { opacity: 1 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0 } }
    : staggerItem;
}

const MILESTONE_ICONS = [Lightbulb, Rocket, Users, Globe];

export function OurStorySection() {
  const { t } = useTranslation("landing");
  const reduceMotion = usePrefersReducedMotion();

  const badge = t("ourStory.badge");
  const title = t("ourStory.title");
  const subtitle = t("ourStory.subtitle");
  const narrative = t("ourStory.narrative");
  const milestones = t("ourStory.milestones", { returnObjects: true }) as {
    year: string;
    headline: string;
    description: string;
  }[];

  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: "var(--neu-bg, #dde1e7)" }}>
      {/* Subtle gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30"
          style={{ background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)" }} />
      </div>

      <div className="max-w-[1140px] mx-auto px-6 relative z-10">
        {/* Badge */}
        <motion.div
          {...animProps(reduceMotion)}
          className="inline-block mb-6 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase text-primary"
          style={{
            background: "var(--neu-bg, #dde1e7)",
            boxShadow: "4px 4px 10px rgba(163,177,198,0.5), -4px -4px 10px rgba(255,255,255,0.8)",
          }}
        >
          {badge}
        </motion.div>

        {/* Heading */}
        <motion.h2
          {...animProps(reduceMotion)}
          className="font-heading text-3xl md:text-5xl font-semibold text-foreground mb-4 leading-tight"
        >
          {title}
        </motion.h2>
        <motion.p
          {...animProps(reduceMotion)}
          className="text-muted-foreground text-lg md:text-xl mb-6 max-w-3xl leading-relaxed"
        >
          {subtitle}
        </motion.p>

        {/* Narrative */}
        <motion.p
          {...animProps(reduceMotion)}
          className="text-muted-foreground/80 text-base mb-16 max-w-3xl leading-relaxed"
        >
          {narrative}
        </motion.p>

        {/* Milestones Timeline */}
        <motion.div
          {...staggerProps(reduceMotion)}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {milestones.map((milestone, i) => {
            const Icon = MILESTONE_ICONS[i] || Lightbulb;
            return (
              <motion.div
                key={i}
                {...staggerChildProps(reduceMotion)}
                className="rounded-2xl p-6 relative group"
                style={{
                  background: "var(--neu-bg, #dde1e7)",
                  boxShadow: "6px 6px 14px rgba(163,177,198,0.55), -6px -6px 14px rgba(255,255,255,0.85)",
                }}
              >
                {/* Year badge */}
                <span className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-bold tracking-wider text-primary bg-primary/10">
                  {milestone.year}
                </span>

                {/* Icon */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    boxShadow: "inset 3px 3px 6px rgba(163,177,198,0.35), inset -3px -3px 6px rgba(255,255,255,0.7)",
                    background: "var(--neu-bg, #dde1e7)",
                  }}
                >
                  <Icon className="w-5 h-5 text-primary" />
                </div>

                {/* Content */}
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  {milestone.headline}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {milestone.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
