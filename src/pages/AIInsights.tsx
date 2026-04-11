import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, TrendingUp, Calendar, Sun, Tag, Lightbulb, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const insights = [
  {
    title: 'Seasonal Demand Pattern Detected',
    description: 'AI has identified a recurring 7-day cycle in your demand data, with peaks on Fridays and troughs on Mondays. This pattern accounts for approximately 23% of demand variability.',
    impact: 'high',
    direction: 'up',
    factor: 'Seasonality',
    confidence: 94,
  },
  {
    title: 'Promotion Effect Analysis',
    description: 'Historical data shows promotions increase demand by an average of 34% for the first 3 days, followed by a 15% decrease in the week after. Consider staggering promotional campaigns.',
    impact: 'medium',
    direction: 'up',
    factor: 'Promotions',
    confidence: 87,
  },
  {
    title: 'Weather Correlation Discovered',
    description: 'Analysis reveals a moderate correlation (r=0.42) between temperature and demand for outdoor-related products. Warmer weather drives 18% higher sales on average.',
    impact: 'low',
    direction: 'up',
    factor: 'External',
    confidence: 72,
  },
  {
    title: 'Competitor Activity Impact',
    description: 'When competitor A runs sales, your demand decreases by approximately 12%. We recommend counter-promotional strategies during these periods.',
    impact: 'medium',
    direction: 'down',
    factor: 'Competition',
    confidence: 81,
  },
];

const factors = [
  { name: 'Seasonality', weight: 35, icon: Sun, color: 'primary' },
  { name: 'Historical Trends', weight: 25, icon: TrendingUp, color: 'accent' },
  { name: 'Promotions', weight: 20, icon: Tag, color: 'success' },
  { name: 'External Factors', weight: 12, icon: Calendar, color: 'warning' },
  { name: 'Other', weight: 8, icon: Lightbulb, color: 'muted' },
];

const AIInsights = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          title="AI Insights" 
          subtitle="Explainable AI analysis of demand patterns" 
        />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {/* AI Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">AI Analysis Summary</h3>
                    <p className="text-xs sm:text-base text-muted-foreground leading-relaxed">
                      Based on analysis of <span className="font-semibold text-foreground">2.4M data points</span> across 
                      your product catalog, the AI model has identified several key patterns. Current forecast accuracy 
                      is at <span className="font-semibold text-success">94.5%</span>, with the model continuously 
                      learning from new data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Factor Weights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Demand Factor Weights</CardTitle>
                <CardDescription className="text-xs sm:text-sm">How different factors contribute to demand predictions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4">
                  {factors.map((factor, index) => (
                    <motion.div
                      key={factor.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="text-center p-3 sm:p-4 rounded-xl border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className={cn(
                        'w-10 h-10 sm:w-12 sm:h-12 rounded-xl mx-auto mb-2 sm:mb-3 flex items-center justify-center',
                        `bg-${factor.color}/10`
                      )}>
                        <factor.icon className={cn('w-5 h-5 sm:w-6 sm:h-6', `text-${factor.color}`)} />
                      </div>
                      <p className="text-lg sm:text-2xl font-bold gradient-text">{factor.weight}%</p>
                      <p className="text-[10px] sm:text-sm text-muted-foreground">{factor.name}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Insights List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Key Insights</CardTitle>
                <CardDescription className="text-xs sm:text-sm">AI-discovered patterns and recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {insights.map((insight, index) => (
                  <motion.div
                    key={insight.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                    className="p-3 sm:p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className={cn(
                        'w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        insight.direction === 'up' ? 'bg-success/10' : insight.direction === 'down' ? 'bg-destructive/10' : 'bg-muted'
                      )}>
                        {insight.direction === 'up' ? (
                          <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                        ) : insight.direction === 'down' ? (
                          <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                        ) : (
                          <Minus className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 mb-1">
                          <h4 className="font-semibold text-sm sm:text-base">{insight.title}</h4>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={cn(
                              'inline-block px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-medium',
                              insight.impact === 'high' ? 'bg-destructive/10 text-destructive' :
                              insight.impact === 'medium' ? 'bg-warning/10 text-warning' :
                              'bg-muted text-muted-foreground'
                            )}>
                              {insight.impact}
                            </span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">
                              {insight.confidence}%
                            </span>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-border ml-11 sm:ml-14">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">Factor:</span>
                      <span className="px-2 py-0.5 text-[10px] sm:text-xs rounded-full bg-secondary text-secondary-foreground">
                        {insight.factor}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>

      <AIChatbot />
    </div>
  );
};

export default AIInsights;
