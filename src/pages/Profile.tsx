import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Users,
  Share2,
  Mail,
  LogOut,
  Plus,
  Pencil,
  Info,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { FloatingMiniPlayer } from "@/components/FloatingMiniPlayer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/myproject/client";

type Kid = {
  id: string;
  name: string;
  age: number;
  gender: string | null;
  family_type: string | null;
  city: string | null;
  personality: string | null;
  home_type: string | null;
  family_members: string | null;
  family_address_terms: string | null;
};

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

const InfoTooltip = ({ text }: { text: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block align-middle">
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="ml-1 text-muted-foreground hover:text-primary-deep"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {show && (
        <div
          className="absolute left-1/2 top-full z-10 mt-1 w-56 -translate-x-1/2 rounded-xl border border-border bg-card p-2.5 text-[11px] text-foreground shadow-soft"
          onClick={(e) => e.stopPropagation()}
        >
          {text}
          <button
            onClick={() => setShow(false)}
            className="mt-1 block w-full text-center text-[10px] font-semibold text-primary-deep"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

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
  const [kids, setKids] = useState<Kid[]>([]);
  const activeId = typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;
  const [showKids, setShowKids] = useState(false);
  const [editingKidId, setEditingKidId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Kid>>({});
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
    supabase
      .from("child_profiles")
      .select(
        "id, name, age, gender, family_type, city, personality, home_type, family_members, family_address_terms"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setKids(data ?? []));
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


  const switchTo = (k: Kid) => {
    localStorage.setItem("lulutales_profile_id", k.id);
    localStorage.setItem("lulutales_child_name", k.name);
    localStorage.setItem("lulutales_child_age", String(k.age));
    nav("/");
  };

  const startEdit = (k: Kid) => {
    setEditingKidId(k.id);
    setEditForm({ ...k });
  };

  const cancelEdit = () => {
    setEditingKidId(null);
    setEditForm({});
  };

  const saveKid = async (id: string) => {
    const updateData = {
      name: editForm.name?.trim() || "",
      age: editForm.age || 0,
      gender: editForm.gender || null,
      family_type: editForm.family_type || null,
      city: editForm.city?.trim() || null,
      personality: editForm.personality?.trim() || null,
      home_type: editForm.home_type?.trim() || null,
      family_members: editForm.family_members?.trim() || null,
      family_address_terms: editForm.family_address_terms?.trim() || null,
    };

    if (!updateData.name) {
      toast.error("Name is required");
      return;
    }
    if (!updateData.age || updateData.age < 2 || updateData.age > 14) {
      toast.error("Age must be between 2 and 14");
      return;
    }

    const { error } = await supabase.from("child_profiles").update(updateData).eq("id", id);

    if (error) {
      toast.error("Failed to save profile");
      return;
    }

    setKids((prev) => prev.map((k) => (k.id === id ? { ...k, ...updateData } as Kid : k)));

    if (id === activeId) {
      localStorage.setItem("lulutales_child_name", updateData.name);
      localStorage.setItem("lulutales_child_age", String(updateData.age));
    }

    setEditingKidId(null);
    setEditForm({});
    toast.success("Profile updated");
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
      <header className="px-5 pt-4 pb-3">
        <button onClick={() => nav(-1)} className="mb-3 flex items-center gap-1 text-xs text-primary-deep">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-card text-2xl ring-2 ring-card">
            👩
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-extrabold capitalize text-foreground truncate">{parentForm.name || parentName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {user?.email} · {kids.length} child {kids.length === 1 ? "profile" : "profiles"}
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
          <Row icon={Users} label="Open / Add kids' profiles" onClick={() => setShowKids((v) => !v)} />
          {showKids && (
            <div className="space-y-2 bg-secondary/30 px-4 py-3">
              {kids.map((k) => {
                const isActive = k.id === activeId;
                const isEditing = editingKidId === k.id;
                return (
                  <div
                    key={k.id}
                    className={`rounded-2xl border bg-card transition-colors ${
                      isActive ? "border-primary" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <button
                        onClick={() => !isEditing && switchTo(k)}
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-extrabold text-primary-foreground">
                          {k.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-foreground">{k.name}</div>
                          <div className="text-[11px] text-muted-foreground">{k.age} years</div>
                        </div>
                      </button>

                      {!isEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(k);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary-deep hover:bg-primary/10"
                          aria-label="Edit profile"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {isActive && !isEditing && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-deep">
                          Active
                        </span>
                      )}
                    </div>

                    {isEditing && (
                      <div className="border-t border-border p-3 space-y-3">
                        <div>
                          <Label>Name</Label>
                          <TextInput
                            value={editForm.name ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Child's name"
                          />
                        </div>
                        <div>
                          <Label>Age</Label>
                          <TextInput
                            type="number"
                            min={2}
                            max={14}
                            value={editForm.age ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, age: parseInt(e.target.value, 10) || 0 }))}
                          />
                        </div>
                        <div>
                          <Label>Gender</Label>
                          <TextInput
                            value={editForm.gender ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
                            placeholder="e.g. Girl, Boy"
                          />
                        </div>
                        <div>
                          <Label>Family setup</Label>
                          <TextInput
                            value={editForm.family_type ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, family_type: e.target.value }))}
                            placeholder="e.g. Single parent, Two parents"
                          />
                        </div>

                        <div className="pt-1">
                          <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-primary-deep">
                            About your child
                          </div>
                          <div className="space-y-3">
                            <div>
                              <Label>City</Label>
                              <TextInput
                                value={editForm.city ?? ""}
                                onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label>Personality</Label>
                              <TextInput
                                value={editForm.personality ?? ""}
                                onChange={(e) => setEditForm((f) => ({ ...f, personality: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label>Home type</Label>
                              <TextInput
                                value={editForm.home_type ?? ""}
                                onChange={(e) => setEditForm((f) => ({ ...f, home_type: e.target.value }))}
                                placeholder="e.g. apartment, independent house, society"
                              />
                            </div>
                            <div>
                              <Label>Family members</Label>
                              <TextInput
                                value={editForm.family_members ?? ""}
                                onChange={(e) => setEditForm((f) => ({ ...f, family_members: e.target.value }))}
                                placeholder="e.g. Dadi, Papa, older sibling"
                              />
                            </div>
                            <div>
                              <div className="mb-1.5 flex items-center">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Family address terms
                                </span>
                                <InfoTooltip text="What the child calls each family member, e.g. Father: Papa, Mother: Mummy, Grandmother: Dadi" />
                              </div>
                              <TextInput
                                value={editForm.family_address_terms ?? ""}
                                onChange={(e) => setEditForm((f) => ({ ...f, family_address_terms: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => saveKid(k.id)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-glow"
                          >
                            <Check className="h-3.5 w-3.5" /> Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-card py-2.5 text-xs font-bold text-muted-foreground"
                          >
                            <X className="h-3.5 w-3.5" /> Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => nav("/onboarding")}
                className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border p-3 text-left text-muted-foreground hover:border-primary hover:text-primary"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="text-sm font-bold">Add child</div>
              </button>
            </div>
          )}
          <Row icon={Share2} label="Share app" sub="Copies link to clipboard" onClick={handleShare} />
          <Row icon={Mail} label="Contact us" sub="jainaagam1109@gmail.com" onClick={() => (window.location.href = "mailto:jainaagam1109@gmail.com")} />

          <Row icon={LogOut} label="Log out" onClick={handleSignOut} danger />
        </section>
      </main>

      <FloatingMiniPlayer />
    </PhoneShell>
  );
};

export default Profile;
