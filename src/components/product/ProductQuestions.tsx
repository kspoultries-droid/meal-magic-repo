import { useEffect, useState } from "react";
import { MessageCircle, Send, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  productId: string;
  storeId: string;
  storeOwnerId?: string;
}

type Question = {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
  answered_at: string | null;
};

const ProductQuestions = ({ productId, storeId, storeOwnerId }: Props) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [question, setQuestion] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const loadQuestions = async () => {
    const { data, error } = await (supabase.from("product_questions" as any).select("id, question, answer, created_at, answered_at").eq("product_id", productId).order("created_at", { ascending: false }) as any);
    if (error) { console.error("Product questions could not load", error); return; }
    setQuestions((data || []) as Question[]);
  };

  useEffect(() => { loadQuestions(); }, [productId]);

  const askQuestion = async () => {
    if (!user) { toast.error("سوال پوچھنے کے لیے پہلے لاگ اِن کریں"); return; }
    if (!question.trim()) { toast.error("اپنا سوال لکھیں"); return; }
    setSending(true);
    const { error } = await (supabase.from("product_questions" as any).insert({ product_id: productId, store_id: storeId, asked_by: user.id, question: question.trim() }) as any);
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setQuestion("");
    toast.success("سوال دکاندار کو بھیج دیا گیا");
    loadQuestions();
  };

  const answerQuestion = async (item: Question) => {
    const answer = answerDrafts[item.id]?.trim();
    if (!user || !answer) return;
    const { error } = await (supabase.from("product_questions" as any).update({ answer, answered_by: user.id, answered_at: new Date().toISOString() }).eq("id", item.id) as any);
    if (error) { toast.error(error.message); return; }
    setAnswerDrafts((drafts) => ({ ...drafts, [item.id]: "" }));
    toast.success("جواب شائع ہو گیا");
    loadQuestions();
  };

  const canAnswer = Boolean(user && storeOwnerId && user.id === storeOwnerId);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary"><MessageCircle className="size-4" /></span>
        <div><h2 className="text-sm font-extrabold text-foreground">صارفین کے سوالات</h2><p className="text-[11px] text-muted-foreground">پروڈکٹ کے بارے میں دکاندار سے پوچھیں</p></div>
      </div>
      <div className="mt-4 flex gap-2">
        <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="مثلاً کیا اس میں مختلف سائز دستیاب ہیں؟" className="h-10 min-w-0" maxLength={500} />
        <Button type="button" size="icon" aria-label="سوال بھیجیں" onClick={askQuestion} disabled={sending}><Send className="size-4" /></Button>
      </div>
      <div className="mt-4 space-y-3">
        {questions.length === 0 ? <p className="rounded-xl bg-secondary/60 px-3 py-4 text-center text-xs text-muted-foreground">ابھی کوئی سوال نہیں، پہلا سوال آپ پوچھیں۔</p> : questions.map((item) => (
          <article key={item.id} className="rounded-xl border border-border/70 bg-background p-3">
            <div className="flex items-start gap-2"><MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" /><p className="text-sm font-semibold leading-6 text-foreground">{item.question}</p></div>
            {item.answer ? <div className="mt-2 flex items-start gap-2 border-s-2 border-primary/40 ps-3"><Store className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-[10px] font-bold text-primary">دکاندار کا جواب</p><p className="text-sm leading-6 text-muted-foreground">{item.answer}</p></div></div> : canAnswer ? <div className="mt-3 flex gap-2"><Textarea value={answerDrafts[item.id] || ""} onChange={(event) => setAnswerDrafts((drafts) => ({ ...drafts, [item.id]: event.target.value }))} placeholder="جواب لکھیں" rows={2} className="min-h-0" /><Button type="button" size="sm" className="shrink-0 self-end" onClick={() => answerQuestion(item)}>جواب دیں</Button></div> : <p className="mt-2 text-[11px] text-muted-foreground">دکاندار کے جواب کا انتظار ہے</p>}
          </article>
        ))}
      </div>
    </section>
  );
};

export default ProductQuestions;
