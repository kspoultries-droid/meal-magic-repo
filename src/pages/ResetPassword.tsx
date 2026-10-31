import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, ArrowLeft, MailCheck } from "lucide-react";

const ResetPassword = () => {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      // Recovery links land here with tokens in the URL hash; the client starts a session.
      if (!cancelled && (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY")) {
        clearTimeout(timeout);
        setHasSession(true);
        setChecking(false);
      }
    });
    // Fallback for a session restored before this listener attached.
    timeout = setTimeout(async () => {
      if (cancelled) return;
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        setHasSession(!!data.session);
        setChecking(false);
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("پاسورڈ کم از کم 6 حروف کا ہو / Minimum 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("دونوں پاسورڈ ایک جیسے نہیں / Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("پاسورڈ بدل گیا! اب نئے پاسورڈ سے لاگ ان کریں۔");
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 relative">
      <Card className="w-full max-w-md bg-card border-border shadow-elegant animate-scale-in relative">
        <CardHeader className="text-center relative">
          <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={() => navigate("/auth")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> واپس
          </Button>
          <div className="w-16 h-16 mx-auto mb-2 rounded-lg bg-primary flex items-center justify-center shadow-soft">
            <span className="text-primary-foreground font-extrabold text-2xl">EL</span>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">نیا پاسورڈ</CardTitle>
          <CardDescription>نیا پاسورڈ لکھ کر محفوظ کریں</CardDescription>
        </CardHeader>
        <CardContent>
          {checking ? (
            <p className="py-8 text-center text-sm text-muted-foreground">جانچ ہو رہی ہے…</p>
          ) : !hasSession ? (
            <div className="py-4 space-y-4 text-center">
              <MailCheck className="w-12 h-12 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                پاسورڈ بدلنے کا لنک پہلے ای میل پر آتا ہے۔ اگر لنک پرانا ہو گیا ہے تو دوبارہ منگوائیں۔
              </p>
              <Button className="w-full" onClick={() => navigate("/auth")}>
                لاگ ان صفحے پر جائیں
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="نیا پاسورڈ"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  aria-label="پاسورڈ دیکھیں"
                  className="absolute right-3 top-3 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="نیا پاسورڈ دوبارہ لکھیں"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "محفوظ ہو رہا ہے…" : "پاسورڈ محفوظ کریں"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
