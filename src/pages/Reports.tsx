import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar, TrendingUp, Package, Eye } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const reports = [
  {
    id: 1,
    title: 'Weekly Demand Forecast Summary',
    description: 'Comprehensive forecast for all products with accuracy metrics',
    type: 'Forecast',
    date: '2025-01-24',
    status: 'ready',
  },
  {
    id: 2,
    title: 'Monthly Inventory Optimization Report',
    description: 'Inventory recommendations and potential cost savings analysis',
    type: 'Inventory',
    date: '2025-01-20',
    status: 'ready',
  },
  {
    id: 3,
    title: 'Q4 2024 Executive Summary',
    description: 'High-level overview of AI performance and business impact',
    type: 'Executive',
    date: '2025-01-15',
    status: 'ready',
  },
  {
    id: 4,
    title: 'Model Performance Analysis',
    description: 'Detailed breakdown of forecast accuracy by product category',
    type: 'Technical',
    date: '2025-01-10',
    status: 'ready',
  },
  {
    id: 5,
    title: 'Stock-out Risk Assessment',
    description: 'Products at risk of stock-out in the next 30 days',
    type: 'Risk',
    date: '2025-01-08',
    status: 'generating',
  },
];

const typeColors: Record<string, string> = {
  Forecast: 'bg-primary/10 text-primary',
  Inventory: 'bg-accent/10 text-accent',
  Executive: 'bg-success/10 text-success',
  Technical: 'bg-warning/10 text-warning',
  Risk: 'bg-destructive/10 text-destructive',
};

const Reports = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleDownload = (format: 'pdf' | 'csv') => {
    console.log(`Downloading as ${format}`);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          title="Reports & Exports" 
          subtitle="AI-generated reports and data exports" 
        />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            {[
              { icon: FileText, label: 'Reports Generated', value: '24', color: 'primary' },
              { icon: Download, label: 'Downloads This Month', value: '156', color: 'accent' },
              { icon: Calendar, label: 'Scheduled Reports', value: '4', color: 'success' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                        <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${stat.color}`} />
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="text-[10px] sm:text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Reports List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-6">
                <div>
                  <CardTitle className="text-base sm:text-lg">Available Reports</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">AI-generated reports ready for download</CardDescription>
                </div>
                <Button className="gap-2 w-full sm:w-auto" size="sm">
                  <FileText className="w-4 h-4" />
                  Generate New
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {reports.map((report, index) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base truncate">{report.title}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{report.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className={`${typeColors[report.type]} text-xs`}>
                            {report.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{report.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-13 sm:ml-0 flex-shrink-0">
                      {report.status === 'generating' ? (
                        <Button variant="outline" disabled size="sm" className="text-xs">
                          Generating...
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" className="gap-1 text-xs hidden sm:flex">
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownload('pdf')} className="text-xs">
                            PDF
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownload('csv')} className="text-xs">
                            CSV
                          </Button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Executive Report Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card className="border-primary/30">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary text-xs">Executive Report</Badge>
                </div>
                <CardTitle className="text-lg sm:text-2xl">Q4 2024 AI Platform Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
                  <div className="text-center p-3 sm:p-4 rounded-xl bg-success/5 border border-success/20">
                    <TrendingUp className="w-5 h-5 sm:w-8 sm:h-8 text-success mx-auto mb-1 sm:mb-2" />
                    <p className="text-lg sm:text-3xl font-bold text-success">94.5%</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Forecast Accuracy</p>
                  </div>
                  <div className="text-center p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <Package className="w-5 h-5 sm:w-8 sm:h-8 text-primary mx-auto mb-1 sm:mb-2" />
                    <p className="text-lg sm:text-3xl font-bold text-primary">-25%</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Inventory Costs</p>
                  </div>
                  <div className="text-center p-3 sm:p-4 rounded-xl bg-accent/5 border border-accent/20">
                    <TrendingUp className="w-5 h-5 sm:w-8 sm:h-8 text-accent mx-auto mb-1 sm:mb-2" />
                    <p className="text-lg sm:text-3xl font-bold text-accent">+18%</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Revenue Impact</p>
                  </div>
                </div>
                <p className="text-xs sm:text-base text-muted-foreground leading-relaxed">
                  The AI-powered demand forecasting platform delivered exceptional results in Q4 2024. 
                  With 94.5% forecast accuracy, the system enabled a 25% reduction in inventory holding 
                  costs while improving product availability. Stock-out incidents decreased by 30%, 
                  contributing to an 18% increase in sales revenue compared to the previous quarter.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>

      <AIChatbot />
    </div>
  );
};

export default Reports;
