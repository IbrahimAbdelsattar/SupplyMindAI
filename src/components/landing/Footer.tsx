import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Footer = () => {
  const { t } = useTranslation('common');

  return (
    <footer className="py-8 border-t border-border bg-card/30 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight">{t('app.name')}</span>
          </Link>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">{t('footer.privacy')}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t('footer.terms')}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t('footer.contact')}</a>
          </div>
          
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
};
