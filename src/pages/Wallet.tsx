import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Wallet as WalletIcon, Plus, ArrowDownLeft, ArrowUpRight,
  Clock, CreditCard, Smartphone, Building2, Banknote
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

const paymentMethods = [
  { id: "jazzcash", name: "JazzCash", icon: Smartphone, color: "bg-red-100 text-red-600" },
  { id: "easypaisa", name: "EasyPaisa", icon: Smartphone, color: "bg-green-100 text-green-600" },
  { id: "bank", name: "Bank Transfer", icon: Building2, color: "bg-blue-100 text-blue-600" },
  { id: "cash", name: "Cash (Manual)", icon: Banknote, color: "bg-yellow-100 text-yellow-600" },
];

const Wallet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupMethod, setTopupMethod] = useState("jazzcash");
  const [submitting, setSubmitting] = useState(false);

  const fetchWallet = async () => {
    if (!user) return;
    setLoading(true);

    // Get or create wallet
    let { data: w } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
    if (!w) {
      // Wallet auto-created by trigger, but just in case
      const { data: newW } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
      w = newW;
    }
    setWallet(w);

    // Get transactions
    if (w) {
      const { data: txns } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setTransactions(txns || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchWallet();
  }, [user]);

  const handleTopup = async () => {
    const amt = parseFloat(topupAmount);
    if (!amt || amt < 10) {
      toast.error("Minimum Rs 10 / کم از کم 10 روپے");
      return;
    }
    setSubmitting(true);

    // For JazzCash/EasyPaisa/Bank — in real scenario this would go through payment gateway
    // For now, we create a pending transaction that admin approves
    const { error } = await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      user_id: user!.id,
      type: "topup",
      amount: amt,
      balance_after: wallet.balance, // Will update when admin approves
      description: `Top-up via ${topupMethod}`,
      payment_method: topupMethod,
      status: topupMethod === "cash" ? "pending" : "pending",
    });

    setSubmitting(false);
    if (error) {
      toast.error("Failed / ناکام ہو گیا");
      console.error(error);
    } else {
      toast.success("Top-up request sent! Admin will approve / ٹاپ اپ ریکوئسٹ بھیج دی گئی ✅");
      setTopupOpen(false);
      setTopupAmount("");
      fetchWallet();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "topup": return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case "payment": return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case "payout": return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
      case "advance_fee": return <ArrowUpRight className="w-4 h-4 text-orange-600" />;
      case "refund": return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      topup: "Top-up / ٹاپ اپ",
      payment: "Payment / ادائیگی",
      payout: "Payout / پے آؤٹ",
      advance_fee: "Advance Fee / ایڈوانس فیس",
      refund: "Refund / واپسی",
      commission: "Commission / کمیشن",
    };
    return labels[type] || type;
  };

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading... / لوڈ ہو رہا ہے...</p>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-primary to-primary/80 mx-4 mt-4 rounded-2xl p-6 text-primary-foreground shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
            <WalletIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm opacity-80">My Wallet / میرا والیٹ</p>
            <h1 className="text-3xl font-extrabold">Rs {wallet?.balance?.toFixed(0) || 0}</h1>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setTopupOpen(true)}
            className="flex-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 rounded-xl font-bold"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Money / رقم ڈالیں
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mx-4 mt-4">
        <div className="bg-card rounded-xl p-4 border">
          <p className="text-xs text-muted-foreground">Total Earned / کل کمائی</p>
          <p className="text-lg font-extrabold text-green-600">Rs {wallet?.total_earned?.toFixed(0) || 0}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <p className="text-xs text-muted-foreground">Total Spent / کل خرچ</p>
          <p className="text-lg font-extrabold text-red-600">Rs {wallet?.total_spent?.toFixed(0) || 0}</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-extrabold text-foreground mb-4">Transactions / لین دین</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-8 bg-card rounded-2xl border">
            <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No transactions yet / ابھی کوئی لین دین نہیں</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border">
                <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                  {getTypeIcon(tx.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{getTypeLabel(tx.type)}</p>
                  <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString("ur-PK")}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-extrabold ${
                    ["topup", "refund"].includes(tx.type) ? "text-green-600" : "text-red-600"
                  }`}>
                    {["topup", "refund"].includes(tx.type) ? "+" : "-"}Rs {tx.amount}
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    tx.status === "completed" ? "bg-green-100 text-green-700" :
                    tx.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>{tx.status === "completed" ? "✅" : tx.status === "pending" ? "⏳" : "❌"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top-up Dialog */}
      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">Add Money / رقم ڈالیں 💰</DialogTitle>
            <DialogDescription>Choose method & amount / طریقہ اور رقم منتخب کریں</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Payment Method */}
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">Payment Method / طریقہ</label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setTopupMethod(m.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        topupMethod === m.id ? "border-primary bg-primary/5 shadow-md" : "bg-card"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${m.color} flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground">{m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Amounts */}
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">Quick Amount / فوری رقم</label>
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTopupAmount(String(amt))}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      topupAmount === String(amt)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    Rs {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="text-sm font-bold text-foreground mb-1 block">Custom Amount / اپنی مرضی کی رقم</label>
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="Enter amount / رقم لکھیں..."
                className="w-full px-3 py-2 rounded-xl border bg-card text-foreground text-sm"
                min="10"
              />
            </div>

            {/* Instructions */}
            {topupMethod === "jazzcash" && (
              <div className="bg-red-50 rounded-xl p-3 text-xs text-red-700">
                <p className="font-bold mb-1">JazzCash Instructions:</p>
                <p>Send amount to: <strong>03XX-XXXXXXX</strong></p>
                <p>Screenshot admin ko WhatsApp کریں</p>
              </div>
            )}
            {topupMethod === "easypaisa" && (
              <div className="bg-green-50 rounded-xl p-3 text-xs text-green-700">
                <p className="font-bold mb-1">EasyPaisa Instructions:</p>
                <p>Send amount to: <strong>03XX-XXXXXXX</strong></p>
                <p>Screenshot admin ko WhatsApp کریں</p>
              </div>
            )}
            {topupMethod === "bank" && (
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                <p className="font-bold mb-1">Bank Transfer:</p>
                <p>Account: <strong>XXXX-XXXXXXXX</strong></p>
                <p>Bank: HBL / Meezan</p>
                <p>Receipt admin ko WhatsApp کریں</p>
              </div>
            )}

            <Button
              className="w-full h-12 text-base font-extrabold rounded-xl"
              onClick={handleTopup}
              disabled={submitting || !topupAmount}
            >
              {submitting ? "Sending... / بھیج رہا ہے..." : `Request Top-up Rs ${topupAmount || 0}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomTabBar />
    </div>
  );
};

export default Wallet;
