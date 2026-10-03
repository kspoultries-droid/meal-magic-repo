import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, Lock, User, ArrowLeft, Phone, Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { lovable } from "@/integrations/lovable/index";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("لاگ ان کامیاب!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("اکاؤنٹ بن گیا! ای میل چیک کریں۔");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const funcUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn/auth-options`;
      
      // Get authentication options (no email needed - discoverable credentials)
      const optRes = await fetch(funcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({}),
      });
      const optData = await optRes.json();
      if (optData.error) throw new Error(optData.error);

      // Start biometric authentication - browser shows registered passkeys
      const credential = await startAuthentication({ optionsJSON: optData });

      // Verify with server
      const verifyRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn/auth-verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ credential }),
        }
      );
      const verifyData = await verifyRes.json();
      if (verifyData.error) throw new Error(verifyData.error);

      // Use the token to verify OTP
      const { error } = await supabase.auth.verifyOtp({
        token_hash: verifyData.token_hash,
        type: "magiclink",
      });
      if (error) throw error;

      toast.success("فنگر پرنٹ سے لاگ ان کامیاب! 🎉");
      navigate("/");
    } catch (error: any) {
      if (error.name === "NotAllowedError") {
        toast.error("فنگر پرنٹ منسوخ ہو گیا / Biometric cancelled");
      } else {
        toast.error(error.message || "Biometric login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary-foreground/10 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-primary-foreground/10 blur-3xl" />

      <Card className="w-full max-w-md glass border-white/20 shadow-elegant animate-scale-in relative z-10">
        <CardHeader className="text-center relative">
          <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> واپس
          </Button>
          <div className="w-16 h-16 mx-auto mb-2 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-primary-foreground font-extrabold text-2xl">EL</span>
          </div>
          <CardTitle className="text-2xl font-extrabold bg-gradient-primary bg-clip-text text-transparent">
            {isLogin ? "خوش آمدید / Welcome" : "نیا اکاؤنٹ / Sign Up"}
          </CardTitle>
          <CardDescription>
            {isLogin ? "EasyLife میں لاگ ان کریں" : "EasyLife پر نیا اکاؤنٹ بنائیں"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLogin ? (
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="email" className="text-xs"><Mail className="h-3 w-3 mr-1" /> ای میل</TabsTrigger>
                <TabsTrigger value="phone" className="text-xs"><Phone className="h-3 w-3 mr-1" /> فون</TabsTrigger>
                <TabsTrigger value="biometric" className="text-xs"><Fingerprint className="h-3 w-3 mr-1" /> فنگر پرنٹ</TabsTrigger>
              </TabsList>

              {/* Email Login */}
              <TabsContent value="email">
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="ای میل" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="پاسورڈ" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "لوڈ ہو رہا ہے..." : "لاگ ان"}
                  </Button>
                </form>
              </TabsContent>

              {/* Phone Login - Coming Soon */}
              <TabsContent value="phone">
                <div className="text-center py-8 space-y-3">
                  <Phone className="w-12 h-12 text-muted-foreground mx-auto" />
                  <h3 className="font-bold text-foreground">جلد آ رہا ہے! / Coming Soon!</h3>
                  <p className="text-sm text-muted-foreground">فون نمبر سے لاگ ان جلد دستیاب ہوگا</p>
                  <p className="text-xs text-muted-foreground">Phone login will be available soon ⏳</p>
                </div>
              </TabsContent>

              {/* Biometric Login */}
              <TabsContent value="biometric">
                <div className="space-y-4">
                  <div className="text-center pb-2">
                    <Fingerprint className="w-16 h-16 text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">صرف فنگر لگائیں — ای میل کی ضرورت نہیں</p>
                    <p className="text-xs text-muted-foreground">Just touch — no email needed</p>
                  </div>
                  <Button onClick={handleBiometricLogin} className="w-full h-14 text-base" disabled={loading}>
                    <Fingerprint className="w-5 h-5 mr-2" />
                    {loading ? "تصدیق ہو رہی ہے..." : "فنگر پرنٹ سے لاگ ان 👆"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    پہلے پروفائل سے فنگر پرنٹ رجسٹر کریں / Register fingerprint from Profile first
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            // Signup form (email only)
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="پورا نام" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="ای میل" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="پاسورڈ" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "لوڈ ہو رہا ہے..." : "سائن اپ"}
              </Button>
            </form>
          )}

          {/* Google Sign In */}
          <div className="mt-4">
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-border w-full" />
              <span className="bg-card px-3 text-xs text-muted-foreground absolute">یا</span>
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (error) toast.error(error.message || "Google sign-in failed");
                setLoading(false);
              }}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google سے {isLogin ? "لاگ ان" : "سائن اپ"}
            </Button>
            <Button
              variant="outline"
              className="w-full mt-2"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                const { error } = await lovable.auth.signInWithOAuth("apple", {
                  redirect_uri: window.location.origin,
                });
                if (error) toast.error(error.message || "Apple sign-in failed");
                setLoading(false);
              }}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Apple سے {isLogin ? "لاگ ان" : "سائن اپ"}
            </Button>
          </div>

          <div className="mt-3 text-center">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "اکاؤنٹ نہیں ہے؟ سائن اپ کریں" : "پہلے سے اکاؤنٹ ہے؟ لاگ ان کریں"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
