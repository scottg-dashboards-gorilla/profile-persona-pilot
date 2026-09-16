import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? null;

  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);

  /**
   * Accounts are invite-only: the person must already exist in the Datapath
   * staff list. Signing in with a work account that isn't on the list is
   * turned away instead of quietly creating an empty account.
   */
  const admitOrTurnAway = async () => {
    const { data } = await supabase.rpc("claim_employee_link");
    const status = (data as { status?: string } | null)?.status;
    if (status !== "linked") {
      await supabase.auth.signOut();
      setBlocked(
        "This account isn't on the Datapath staff list yet. Ask HR to add you, then sign in again.",
      );
      return;
    }

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
      // Only admins have the Overview dashboard; everyone else starts on their own review.
      if ((roles ?? []).some((r) => r.role === "admin")) destination = "/";
    }
    navigate(destination, { replace: true });
  };

  // Already signed in? Run the same staff check, then go through.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) admitOrTurnAway();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMicrosoft = async () => {
    setLoading(true);
    setBlocked(null);
    const result = await lovable.auth.signInWithOAuth("microsoft", {
      redirect_uri: window.location.origin,
    });

    if (result.error) {
      toast({
        title: "Couldn't sign you in",
        description: result.error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    if (result.redirected) return; // browser is heading to Microsoft
    await admitOrTurnAway();
    setLoading(false);
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setBlocked(null);

    if (resetMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      setLoading(false);
      toast({
        title: error ? "Couldn't send the reset email" : "Check your inbox",
        description: error
          ? error.message
          : "If that address is on the staff list, a password reset link is on its way.",
        variant: error ? "destructive" : undefined,
      });
      if (!error) setResetMode(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      toast({
        title: "Couldn't sign you in",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    await admitOrTurnAway();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="card-elevated p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold font-display text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Use your Datapath Microsoft 365 account, or your work email and password
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleMicrosoft}
            disabled={loading}
          >
            {loading ? "Please wait…" : "Continue with Microsoft"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handlePassword} className="space-y-3">
            <Input
              type="email"
              autoComplete="username"
              placeholder="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {!resetMode && (
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Please wait…"
                : resetMode
                  ? "Send reset link"
                  : "Sign in with email"}
            </Button>
            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setResetMode((v) => !v)}
            >
              {resetMode ? "Back to sign in" : "Forgot your password?"}
            </button>
          </form>

          {blocked && (
            <p className="text-xs text-center text-destructive">{blocked}</p>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Accounts are set up by HR. If you can't get in, ask HR to add you to the
            staff list and send you an invite.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
