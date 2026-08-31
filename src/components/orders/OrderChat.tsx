import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

type Kind = "food" | "grocery" | "grocery_list";

interface Msg {
  id: string;
  sender_id: string;
  sender_role: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface Props {
  orderId: string;
  orderKind?: Kind;
  role: "customer" | "rider" | "admin" | "support";
  /** Optional custom trigger button label */
  label?: string;
  className?: string;
}

const OrderChat = ({ orderId, orderKind = "food", role, label = "چیٹ", className }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("order_messages")
      .select("id, sender_id, sender_role, body, created_at, read_at")
      .eq("order_id", orderId)
      .eq("order_kind", orderKind)
      .order("created_at", { ascending: true });
    const list: Msg[] = data || [];
    setMessages(list);
    setUnread(list.filter((m) => m.sender_id !== user?.id && !m.read_at).length);
  };

  useEffect(() => {
    if (!orderId || !user) return;
    load();
    const channel = supabase
      .channel(`order-chat-${orderKind}-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_messages", filter: `order_id=eq.${orderId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, orderKind, user?.id]);

  // Mark incoming messages read while the sheet is open
  useEffect(() => {
    if (!open || !user) return;
    const unreadIds = messages.filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id);
    if (unreadIds.length === 0) return;
    (supabase as any)
      .from("order_messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(() => setUnread(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, messages, user?.id]);

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [open, messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !user) return;
    setSending(true);
    const { error } = await (supabase as any).from("order_messages").insert({
      order_id: orderId,
      order_kind: orderKind,
      sender_id: user.id,
      sender_role: role,
      body,
    });
    setSending(false);
    if (error) { toast.error("پیغام نہیں بھیجا جا سکا"); return; }
    setText("");
    load();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`relative h-9 rounded-full font-bold text-xs gap-1.5 ${className || ""}`}
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {label}
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-extrabold flex items-center justify-center">
            {unread}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[75vh] flex flex-col p-0 rounded-t-2xl">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-base font-extrabold">
              آرڈر چیٹ <span className="font-mono text-xs text-muted-foreground">#{orderId.slice(0, 8)}</span>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-10">
                ابھی کوئی پیغام نہیں — گفتگو شروع کریں
              </p>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`text-[10px] mt-0.5 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleTimeString("ur-PK", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t p-3 flex items-center gap-2 bg-card">
            <Input
              value={text}
              maxLength={1000}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
              placeholder="پیغام لکھیں..."
              className="h-11 rounded-xl"
            />
            <Button onClick={send} disabled={sending || !text.trim()} className="h-11 w-11 rounded-xl p-0 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default OrderChat;
