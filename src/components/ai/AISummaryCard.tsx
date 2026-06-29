import { useEffect, useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ragQuery } from '@/lib/knowledgeApi';
import { FormattedMessage } from './FormattedMessage';
import { useTranslation } from 'react-i18next';

type Props = {
  title?: string;
  question: string;
  productId?: string;
  sourceType?: string;
  className?: string;
};

export function AISummaryCard({
  title = 'AI Summary',
  question,
  productId,
  sourceType,
  className,
}: Props) {
  const { t, i18n } = useTranslation();
  
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [grounded, setGrounded] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [hasCachedValue, setHasCachedValue] = useState(false);

  // Compute a unique cache key based on configuration
  const cacheKey = `ai_summary:${sourceType || 'general'}:${productId || 'all'}:${question}`;

  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setSummary(parsed.answer);
        setGrounded(Boolean(parsed.grounded));
        setLastGenerated(parsed.timestamp || null);
        setHasCachedValue(true);
      } else {
        setSummary(null);
        setGrounded(false);
        setLastGenerated(null);
        setHasCachedValue(false);
      }
    } catch (e) {
      console.error('Error reading AI Summary from cache:', e);
      setSummary(null);
      setGrounded(false);
      setLastGenerated(null);
      setHasCachedValue(false);
    }
  }, [cacheKey]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await ragQuery({
        question,
        product_id: productId,
        source_type: sourceType,
      });
      const timestamp = new Date().toISOString();
      const cacheData = {
        answer: res.answer,
        grounded: Boolean(res.grounded),
        timestamp,
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      setSummary(res.answer);
      setGrounded(Boolean(res.grounded));
      setLastGenerated(timestamp);
      setHasCachedValue(true);
    } catch (err) {
      console.error(err);
      // Fallback message, but do not cache it in localStorage so the user can retry
      setSummary('AI summary will appear after knowledge is indexed. Run forecasts or generate insights.');
      setGrounded(false);
      setLastGenerated(null);
      setHasCachedValue(true); // set true in-memory to display the error, but localStorage remains clean
    } finally {
      setLoading(false);
    }
  };

  const formattedTime = lastGenerated
    ? new Date(lastGenerated).toLocaleString(i18n.language, {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '';

  return (
    <div className={cn("neu-panel rounded-3xl p-6", className)}>
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/40">
        <div className="w-8 h-8 rounded-xl neu-panel-inset flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          {title}
          {grounded && (
            <span className="text-xs font-semibold text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">Grounded</span>
          )}
        </h3>
      </div>
      
      <div className="pt-2">
        {loading ? (
          <div className="flex items-center justify-center gap-3 text-sm font-semibold text-muted-foreground py-12 neu-panel-inset rounded-2xl">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            Synthesizing Insights…
          </div>
        ) : hasCachedValue && summary ? (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl neu-panel-inset">
              <FormattedMessage content={summary} className="text-[15px] leading-relaxed text-foreground" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-muted-foreground px-2">
              {formattedTime && (
                <span className="opacity-80">
                  {t('ai:lastGenerated')}: {formattedTime}
                </span>
              )}
              <button
                onClick={handleGenerate}
                className="h-9 px-4 rounded-xl neu-panel active:neu-button-active flex items-center gap-2 hover:text-primary transition-all duration-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('ai:regenerate')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-6 neu-panel-inset rounded-2xl">
            <div className="w-16 h-16 rounded-3xl neu-panel flex items-center justify-center text-primary relative">
              <div className="absolute inset-0 rounded-3xl animate-ping opacity-20 bg-primary" />
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <div className="max-w-md">
              <p className="text-[15px] font-medium text-muted-foreground leading-relaxed">
                {t('ai:notGenerated')}
              </p>
            </div>
            <button
              onClick={handleGenerate}
              className="group neu-panel active:neu-button-active text-primary font-bold rounded-xl px-6 py-3 flex items-center gap-2 transition-all duration-300 hover:scale-105"
            >
              <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
              {t('ai:generate')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

