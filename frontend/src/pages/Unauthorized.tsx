import { motion } from 'framer-motion';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { signOut, isSignedIn } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden py-12 px-4">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-red-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-orange-500/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10 flex flex-col items-center w-full max-w-[480px] text-center"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6"
        >
          <ShieldOff className="w-10 h-10 text-red-500" />
        </motion.div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
          Access Denied
        </h1>
        <p className="text-muted-foreground font-medium mb-8 leading-relaxed">
          You don't have permission to access this page. This could be because:
        </p>

        <div className="w-full neu-card p-6 rounded-2xl bg-card mb-8 text-left">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
              <span>Your account is not authorized for this resource</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
              <span>Your role does not have the required permissions</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
              <span>Your account may have been deactivated</span>
            </li>
          </ul>
        </div>

        <div className="flex gap-4">
          {isSignedIn ? (
            <button
              onClick={() => signOut(() => navigate('/'))}
              className="neu-btn bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-3 rounded-2xl transition-all duration-200 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Sign Out & Try Another Account
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="neu-btn bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-3 rounded-2xl transition-all duration-200 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Login
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Unauthorized;
