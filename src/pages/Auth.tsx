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

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> واپس
          </Button>
          <CardTitle className="text-2xl font-bold text-primary">
            {isLogin ? "لاگ ان" : "سائن اپ"}
          </CardTitle>
          <CardDescription>
            {isLogin ? "اپنے اکاؤنٹ میں لاگ ان کریں" : "نیا اکاؤنٹ بنائیں"}
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

          <div className="mt-4 text-center">
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
