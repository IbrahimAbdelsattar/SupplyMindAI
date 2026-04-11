import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, User, Briefcase, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'manager' | 'analyst'>('manager');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password, selectedRole);
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${selectedRole === 'manager' ? 'Manager' : 'Analyst'}`,
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to login',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'manager' | 'analyst') => {
    setIsLoading(true);
    try {
      await login('demo@company.com', 'demo', role);
      toast({
        title: 'Demo Mode Activated',
        description: `Exploring as ${role === 'manager' ? 'Business Manager' : 'Data Analyst'}`,
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start demo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.1),transparent_50%)]" />

      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-6"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-primary-foreground" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to access your dashboard</p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Choose a demo account or enter your credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="demo" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="demo">Demo Access</TabsTrigger>
                <TabsTrigger value="credentials">Credentials</TabsTrigger>
              </TabsList>

              <TabsContent value="demo" className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Select a role to explore the platform with demo data
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDemoLogin('manager')}
                    disabled={isLoading}
                    className="p-6 rounded-xl border-2 border-border hover:border-primary/50 bg-card transition-all duration-200 text-center group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                      <Briefcase className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">Manager</h3>
                    <p className="text-xs text-muted-foreground">Business overview</p>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDemoLogin('analyst')}
                    disabled={isLoading}
                    className="p-6 rounded-xl border-2 border-border hover:border-accent/50 bg-card transition-all duration-200 text-center group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-accent/20 transition-colors">
                      <User className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="font-semibold mb-1">Analyst</h3>
                    <p className="text-xs text-muted-foreground">Technical details</p>
                  </motion.button>
                </div>
                {isLoading && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mt-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading dashboard...</span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="credentials">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={selectedRole === 'manager' ? 'default' : 'outline'}
                        onClick={() => setSelectedRole('manager')}
                        className="h-11"
                      >
                        <Briefcase className="w-4 h-4 mr-2" />
                        Manager
                      </Button>
                      <Button
                        type="button"
                        variant={selectedRole === 'analyst' ? 'default' : 'outline'}
                        onClick={() => setSelectedRole('analyst')}
                        className="h-11"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Analyst
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
