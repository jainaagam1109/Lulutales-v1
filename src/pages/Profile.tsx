import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  BarChart3,
  Users,
  Share2,
  Mail,
  LogOut,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Row = ({
  icon: Icon,
  label,
  onClick,
  sub,
  danger,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  sub?: string;
  danger?: boolean;
}) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-3 border-b border-border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary/40"
  >
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
        danger ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary-deep"
      }`}
    >
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex-1">
      <div className={`text-sm font-bold ${danger ? "text-destructive" : "text-foreground"}`}>{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
    {!danger && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
  </button>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>
);

const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none ${
      props.className ?? ""
    }`}
  />
);

const Profile = () => {
  const nav = useNavigate();
  const { user, signOut } = useAuth();
  const [kidsCount, setKidsCount] = useState(0);
  const [editingParent, setEditingParent] = useState(false);
  const [parentForm, setParentForm] = useState({
    name: (user?.user_metadata?.full_name as string) ?? user?.email?.split("@")[0] ?? "",
    email: user?.email ?? "",
    phone: (user?.user_metadata?.phone as string) ?? "",
  });

  useEffect(() => {
    if (!user) return;
    setParentForm({
      name: (user.user_metadata?.full_name as string) ?? user.email?.split("@")[0] ?? "",
      email: user.email ?? "",
      phone: (user.user_metadata?.phone as string) ?? "",
    });
    (supabase as any)
      .from("child_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "deleted")
      .then(({ count }: { count: number | null }) => setKidsCount(count ?? 0));
  }, [user]);

  const saveParent = async () => {
    const name = parentForm.name.trim();
    const email = parentForm.email.trim();
    if (!name) return toast.error("Name is required");
    if (!email) return toast.error("Email is required");
    const payload: { email?: string; data?: Record<string, unknown> } = {
      data: { full_name: name, phone: parentForm.phone.trim() || null },
    };
    if (email && email !== user?.email) payload.email = email;
    const { error } = await supabase.auth.updateUser(payload);
    if (error) return toast.error(error.message);
    setEditingParent(false);
    toast.success(
      email !== user?.email ? "Saved. Check your new email to confirm the change." : "Profile updated"
    );
  };

  const handleSignOut = async () => {
    await signOut();
    nav("/auth", { replace: true });
  };

  const handleShare = async () => {
    const url = window.location.origin;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const parentName = user?.email?.split("@")[0] ?? "Parent";

  return (
    <PhoneShell>
      <PageHeader showProfile={false} />

      <main className="flex-1 overflow-y-auto px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-card text-2xl ring-2 ring-card">
            👩
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-extrabold capitalize text-foreground truncate">{parentForm.name || parentName}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            <div className="text-xs text-muted-foreground">
              {kidsCount} child {kidsCount === 1 ? "profile" : "profiles"}
            </div>
          </div>
          {!editingParent && (
            <button
              onClick={() => setEditingParent(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary-deep hover:bg-primary/10"
              aria-label="Edit parent account"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {editingParent && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-deep">Edit parent account</div>
            <div>
              <Label>Name</Label>
              <TextInput
                value={parentForm.name}
                onChange={(e) => setParentForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label>Email</Label>
              <TextInput
                type="email"
                value={parentForm.email}
                onChange={(e) => setParentForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label>Contact number</Label>
              <TextInput
                type="tel"
                value={parentForm.phone}
                onChange={(e) => setParentForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91 ..."
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveParent}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-glow"
              >
                <Check className="h-3.5 w-3.5" /> Save
              </button>
              <button
                onClick={() => setEditingParent(false)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-card py-2.5 text-xs font-bold text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <Row icon={BarChart3} label="View Insights" onClick={() => nav("/insights")} />
          <Row icon={Users} label="Kids' profiles" onClick={() => nav("/profiles")} />
          <Row icon={Share2} label="Share app" sub="Copies link to clipboard" onClick={handleShare} />
          <Row icon={Mail} label="Contact us" sub="jainaagam1109@gmail.com" onClick={() => (window.location.href = "mailto:jainaagam1109@gmail.com")} />
          <Row icon={LogOut} label="Log out" onClick={handleSignOut} danger />
        </section>
      </main>

      <BottomNav />
    </PhoneShell>
  );
};

export default Profile;
