import { motion } from 'framer-motion';
import { SupplyMindLogo } from '@/components/brand/SupplyMindLogo';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
};

export const Footer = () => {
  const { t } = useTranslation('common');

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      className="py-8 border-t border-border bg-card"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <motion.div variants={item}>
            <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Link to="/">
                <SupplyMindLogo iconClassName="w-7 h-7" />
              </Link>
            </motion.div>
          </motion.div>
          
          <motion.div variants={item} className="flex items-center gap-6 text-sm text-muted-foreground">
            <motion.a
              href="#"
              whileHover={{ scale: 1.05, x: 2 }}
              className="hover:text-foreground transition-colors"
            >
              {t('footer.privacy')}
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.05, x: 2 }}
              className="hover:text-foreground transition-colors"
            >
              {t('footer.terms')}
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.05, x: 2 }}
              className="hover:text-foreground transition-colors"
            >
              {t('footer.contact')}
            </motion.a>
          </motion.div>
          
          <motion.p
            variants={item}
            className="text-xs sm:text-sm text-muted-foreground"
          >
            {t('footer.copyright')}
          </motion.p>
        </motion.div>
      </div>
    </motion.footer>
  );
};
