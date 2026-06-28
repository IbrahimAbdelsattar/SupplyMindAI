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
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {title}
          {grounded && (
            <span className="text-xs font-normal text-muted-foreground">(grounded)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Generating summary…
          </div>
        ) : hasCachedValue && summary ? (
          <div className="space-y-4">
            <FormattedMessage content={summary} className="text-sm text-muted-foreground" />
            <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              {formattedTime && (
                <span>
                  {t('ai:lastGenerated')}: {formattedTime}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                className="h-8 px-2 flex items-center gap-1.5 hover:text-foreground text-primary/80 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('ai:regenerate')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="max-w-md">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('ai:notGenerated')}
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              className="relative group bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl px-5 py-2.5 flex items-center gap-2 transition-all duration-300"
            >
              <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
              {t('ai:generate')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

