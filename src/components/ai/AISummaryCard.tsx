import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ragQuery } from '@/lib/knowledgeApi';
import { FormattedMessage } from './FormattedMessage';

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
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [grounded, setGrounded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ragQuery({
      question,
      product_id: productId,
      source_type: sourceType,
    })
      .then((res) => {
        if (!cancelled) {
          setSummary(res.answer);
          setGrounded(Boolean(res.grounded));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary('AI summary will appear after knowledge is indexed. Run forecasts or generate insights.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [question, productId, sourceType]);

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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating summary…
          </div>
        ) : (
          <FormattedMessage content={summary ?? ''} className="text-sm text-muted-foreground" />
        )}
      </CardContent>
    </Card>
  );
}
