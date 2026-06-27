import { lazy, Suspense } from "react";
import { SignUp } from "@clerk/clerk-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

const SignUpPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.18),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.12),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.25)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.25)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)] pointer-events-none" />

      <div className="w-full max-w-md px-6 relative z-10 my-auto">
        <div className="text-center mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 mb-4 hover:scale-105 transition-transform duration-250"
          >
            Back to sign in
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-foreground">Create account</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Join to continue</p>
        </div>

        <Card className="border border-border/60 bg-card/40 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 via-accent/60 to-primary/60" />

          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">Sign up with Clerk</CardTitle>
            <CardDescription>Use your email to create an account.</CardDescription>
          </CardHeader>

          <CardContent>
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/login"
              appearance={{
                elements: {
                  formButton: "w-full h-11 text-base font-semibold mt-6 transition-transform hover:scale-[1.01]",
                },
              }}
              afterSignUpUrl="/dashboard"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUpPage;
