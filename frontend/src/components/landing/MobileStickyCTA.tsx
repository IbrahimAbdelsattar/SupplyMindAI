import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function MobileStickyCTA() {
  const { t } = useTranslation("landing");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="fixed bottom-0 inset-x-0 z-50 md:hidden"
        >
          <div className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 safe-area-inset-bottom">
            <Link
              to="/login"
              className="block w-full text-center py-3 rounded-lg bg-[var(--color-fg-brand)] text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
            >
              {t("stickyCta.label")}
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
