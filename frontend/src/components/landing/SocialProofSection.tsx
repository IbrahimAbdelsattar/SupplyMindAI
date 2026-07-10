import { useTranslation } from "react-i18next";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { viewportFadeUp, staggerContainer, staggerItem } from "@/lib/animations";
import { motion } from "framer-motion";

const LOGOS = [
  "NexusRetail",
  "MedLogix",
  "SwiftGoods",
  "AeroSupply",
  "GreenPharma",
  "Skyline Mfg",
  "OmniMart",
  "LogiCore",
];

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

export function SocialProofSection() {
  const { t } = useTranslation("landing");
  const reduceMotion = usePrefersReducedMotion();

  const badge = t("socialProof.badge");
  const title = t("socialProof.title");
  const subtitle = t("socialProof.subtitle");
  const testimonials = t("socialProof.testimonials", { returnObjects: true }) as {
    name: string;
    role: string;
    company: string;
    quote: string;
  }[];

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-[1140px] mx-auto px-6">
        {/* Badge */}
        <motion.div
          {...animProps(reduceMotion)}
          className="inline-block mb-6 px-4 py-1.5 rounded-full bg-[var(--color-fg-brand)]/10 text-[var(--color-fg-brand)] text-xs font-semibold tracking-wide uppercase"
        >
          {badge}
        </motion.div>

        {/* Heading */}
        <motion.h2
          {...animProps(reduceMotion)}
          className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-4"
        >
          {title}
        </motion.h2>
        <motion.p
          {...animProps(reduceMotion)}
          className="text-slate-600 text-lg mb-12 max-w-2xl"
        >
          {subtitle}
        </motion.p>

        {/* Logo Marquee */}
        <motion.div {...animProps(reduceMotion)} className="mb-16">
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]">
            <div
              className="flex w-max"
              style={reduceMotion ? {} : { animation: 'marquee 20s linear infinite' }}
            >
              {[...LOGOS, ...LOGOS].map((logo, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 px-8 py-3 mx-2 rounded-lg bg-white text-slate-400 text-sm font-medium tracking-wide shadow-sm flex items-center justify-center min-w-[140px] select-none opacity-60 hover:opacity-100 transition-opacity"
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Testimonial Cards */}
        <motion.div
          {...staggerProps(reduceMotion)}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              {...staggerChildProps(reduceMotion)}
              className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col"
            >
              <p className="text-slate-600 text-sm leading-relaxed flex-1 mb-4">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="w-9 h-9 rounded-full bg-[var(--color-fg-brand)]/10 text-[var(--color-fg-brand)] flex items-center justify-center text-sm font-semibold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{testimonial.name}</p>
                  <p className="text-xs text-slate-500">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
