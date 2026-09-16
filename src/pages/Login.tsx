import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

type Mode = "signin" | "signup" | "reset";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");

  // Already signed in? Go straight through.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(from ?? "/me", { replace: true });
    });
  }, [from, navigate]);

  /** Link the account to its staff record, then land on the right home page. */
  const afterSignIn = async () => {
    await supabase.rpc("claim_employee_link");
    if (from) {
      navigate(from, { replace: true });
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let destination = "/me";
    if (user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if ((roles ?? []).length > 0) destination = "/";
    }
    navigate(destination, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) {
        toast({ title: "Couldn't send the reset link", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a link to set a new password.",
        });
        setMode("signin");
      }
    } else if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/me` },
      });
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else if (data.session) {
        toast({ title: "Welcome to Datapath", description: "Your review page is ready." });
        await afterSignIn();
      } else {
        toast({
          title: "Account created",
          description: "Check your email to confirm, then sign in.",
        });
        setMode("signin");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      } else {
        await afterSignIn();
      }
    }
    setLoading(false);
  };

  const heading =
    mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : "Sign in";
  const blurb =
    mode === "signup"
      ? "Use your Datapath work email so we can find your record"
      : mode === "reset"
        ? "We'll email you a link to set a new password"
        : "Use your Datapath work email to see your own review";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="card-elevated p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold font-display text-foreground">{heading}</h1>
            <p className="text-sm text-muted-foreground">{blurb}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Work email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@mydatapath.com"
                required
              />
            </div>
            {mode !== "reset" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : mode === "reset"
                    ? "Email me a reset link"
                    : "Sign in"}
            </Button>
            <div className="space-y-1 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="block w-full text-xs text-muted-foreground hover:text-foreground"
              >
                {mode === "signup"
                  ? "Already have an account? Sign in"
                  : "First time here? Create your account"}
              </button>
              {mode !== "reset" && (
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="block w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Forgot your password?
                </button>
              )}
              {mode === "reset" && (
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="block w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
