import { useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Palette, Bell, Globe, Shield, User, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { isAuthenticated, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState({
    stockAlerts: true,
    forecastUpdates: true,
    weeklyReports: true,
    systemUpdates: false,
  });
  
  const [region, setRegion] = useState('us');
  const [currency, setCurrency] = useState('usd');

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleSave = () => {
    toast({
      title: 'Settings saved',
      description: 'Your preferences have been updated successfully.',
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          title="Settings" 
          subtitle="Customize your platform experience" 
        />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {/* Profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <CardTitle className="text-base sm:text-lg">Profile</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">Your account information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl sm:text-2xl font-bold text-primary">
                      {user?.name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-base sm:text-lg font-semibold truncate">{user?.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                    <p className="text-xs sm:text-sm text-primary capitalize mt-0.5 sm:mt-1">
                      {user?.role} Account
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Appearance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <CardTitle className="text-base sm:text-lg">Appearance</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Label className="text-sm sm:text-base">Dark Mode</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Toggle between light and dark themes
                    </p>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={toggleTheme}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <CardTitle className="text-base sm:text-lg">Notifications</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">Configure alert preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {[
                  { key: 'stockAlerts', label: 'Stock Alerts', desc: 'Get notified about stock-out and overstock risks' },
                  { key: 'forecastUpdates', label: 'Forecast Updates', desc: 'Receive alerts when forecasts are updated' },
                  { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Get weekly summary reports via email' },
                  { key: 'systemUpdates', label: 'System Updates', desc: 'Notifications about platform updates' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <Label className="text-sm sm:text-base">{item.label}</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key as keyof typeof notifications]}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Regional Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <CardTitle className="text-base sm:text-lg">Regional Settings</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">Configure region and currency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Region</Label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger className="bg-background h-9 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="eu">Europe</SelectItem>
                        <SelectItem value="asia">Asia Pacific</SelectItem>
                        <SelectItem value="mena">Middle East & Africa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="bg-background h-9 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="usd">USD ($)</SelectItem>
                        <SelectItem value="eur">EUR (€)</SelectItem>
                        <SelectItem value="gbp">GBP (£)</SelectItem>
                        <SelectItem value="egp">EGP (E£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Role-based View */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <CardTitle className="text-base sm:text-lg">Role-Based Features</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">Features available for your role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {(user?.role === 'manager' ? [
                    { title: 'Executive Reports', desc: 'Access to high-level summaries' },
                    { title: 'Budget Controls', desc: 'Set inventory budgets' },
                    { title: 'Team Management', desc: 'Manage team access' },
                    { title: 'Approval Workflows', desc: 'Approve reorder requests' },
                  ] : [
                    { title: 'Technical Details', desc: 'Model metrics and parameters' },
                    { title: 'Data Exploration', desc: 'Advanced data analysis' },
                    { title: 'Model Configuration', desc: 'Adjust forecast parameters' },
                    { title: 'API Access', desc: 'Programmatic data access' },
                  ]).map((feature) => (
                    <div key={feature.title} className="p-3 sm:p-4 rounded-xl border border-border bg-muted/50">
                      <p className="font-medium text-sm sm:text-base">{feature.title}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex justify-end pb-4"
          >
            <Button onClick={handleSave} size="lg" className="gap-2 w-full sm:w-auto">
              <Save className="w-4 h-4" />
              Save Settings
            </Button>
          </motion.div>
        </main>
      </div>

      <AIChatbot />
    </div>
  );
};

export default Settings;
