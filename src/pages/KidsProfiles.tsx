import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Check, X, Info, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AddressTermsEditor,
  parseAddressTerms,
  serializeAddressTerms,
  FieldLabel,
  Select,
  type AddressTerm,
  CompanionFields,
  splitCompanion,
  joinCompanion,
} from "@/components/StoryFormFields";
import { softDeleteProfile, loadActiveProfileForUser } from "@/lib/activeProfile";
import { useQueryClient } from "@tanstack/react-query";

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
  sibling_age: number | null;
  companion: string | null;
  favourite_place: string | null;
  status: "active" | "inactive" | "deleted";
};

const GENDERS = [
  { label: "Girl", value: "Girl" },
  { label: "Boy", value: "Boy" },
  { label: "Prefer not to say", value: "Prefer not to say" },
];

const FAMILY_SETUPS = [
  { label: "Nuclear family", value: "Nuclear family" },
  { label: "Single parent", value: "Single parent" },
  { label: "Joint family", value: "Joint family" },
  { label: "Lives with grandparents", value: "Lives with grandparents" },
  { label: "Other", value: "Other" },
];

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-1.5 text-[10px] font-semibold text-muted-foreground">{children}</div>
);

const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none ${
      props.className ?? ""
    }`}
  />
);

const InfoTooltip = ({ text, label = "info" }: { text: string; label?: string }) => {
  const [show, setShow] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!show) {
      setPos(null);
      return;
    }
    const compute = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const margin = 8;
      const width = Math.min(240, window.innerWidth - margin * 2);
      let left = r.left + r.width / 2 - width / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
      setPos({ top: r.bottom + 6, left, width });
    };
    compute();
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setShow(false);
    };
    const onDismiss = () => setShow(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [show]);

  return (
    <span className="relative inline-block align-middle">
      <button
        ref={btnRef}
        type="button"
        aria-label={`About ${label}`}
        onClick={() => setShow((v) => !v)}
        className="ml-1 text-muted-foreground hover:text-primary-deep"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {show && pos && (
        <span
          role="tooltip"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 block rounded-xl border border-border bg-card p-2.5 text-[11px] text-foreground shadow-soft"
          onClick={(e) => e.stopPropagation()}
        >
          {text}
        </span>
      )}
    </span>
  );
};

const KidsProfiles = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [kids, setKids] = useState<Kid[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Kid>>({});
  const [editTerms, setEditTerms] = useState<AddressTerm[]>([]);
  const [editCompanion, setEditCompanion] = useState<{ name: string; what: string }>({ name: "", what: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("child_profiles")
      .select(
        "id, name, age, gender, family_type, city, personality, home_type, family_members, family_address_terms, sibling_age, companion, favourite_place, status"
      )
      .eq("user_id", user.id)
      .neq("status", "deleted")
      .order("status", { ascending: true }) // active < inactive alphabetically: 'active' first
      .order("created_at", { ascending: true });
    setKids((data ?? []) as Kid[]);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const startEdit = (k: Kid) => {
    setEditingId(k.id);
    setEditForm({ ...k });
    setEditTerms(parseAddressTerms(k.family_address_terms ?? ""));
    setEditCompanion(splitCompanion(k.companion));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setEditTerms([]);
    setEditCompanion({ name: "", what: "" });
  };

  const saveKid = async (id: string) => {
    const name = (editForm.name ?? "").trim();
    const age = editForm.age ?? 0;
    if (!name) return toast.error("Name is required");
    if (!age || age < 2 || age > 9) return toast.error("Stories are crafted for ages 2–9.");
    const siblingRaw = editForm.sibling_age;
    const siblingNum =
      siblingRaw === null || siblingRaw === undefined || String(siblingRaw).trim() === ""
        ? null
        : Number(siblingRaw);
    const updateData = {
      name,
      age,
      gender: editForm.gender || null,
      family_type: editForm.family_type || null,
      city: editForm.city?.trim() || null,
      personality: editForm.personality?.trim() || null,
      home_type: editForm.home_type?.trim() || null,
      family_members: editForm.family_members?.trim() || null,
      family_address_terms: serializeAddressTerms(editTerms) || null,
      sibling_age: Number.isFinite(siblingNum) ? siblingNum : null,
      companion: joinCompanion(editCompanion.name, editCompanion.what),
      favourite_place: editForm.favourite_place?.trim() || null,
    };
    const { error } = await (supabase as any).from("child_profiles").update(updateData).eq("id", id);
    if (error) return toast.error("Failed to save profile");
    const k = kids.find((x) => x.id === id);
    if (k?.status === "active") {
      localStorage.setItem("lulutales_child_name", updateData.name);
      localStorage.setItem("lulutales_child_age", String(updateData.age));
    }
    cancelEdit();
    toast.success("Profile updated");
    reload();
  };


  const makeActive = async (id: string) => {
    try {
      setBusy(true);
      const { error } = await (supabase as any).rpc("set_active_profile", { _profile_id: id });
      if (error) throw error;
      if (user) {
        await loadActiveProfileForUser(user.id);
      }
      await qc.invalidateQueries();
      toast.success("Active profile switched");
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't switch profile");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (id: string) => {
    try {
      setBusy(true);
      const nextId = await softDeleteProfile(id);
      setConfirmDeleteId(null);
      // Re-hydrate localStorage cache & cached queries from the newly active row
      if (user) await loadActiveProfileForUser(user.id);
      qc.invalidateQueries();
      toast.success("Profile removed");
      if (!nextId) {
        // No profiles left — explorer mode.
        nav("/", { replace: true });
        return;
      }
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't delete profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PhoneShell>
      <PageHeader title="Kids' profiles" />

      <main className="flex-1 overflow-y-auto px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] space-y-3">
        {kids.map((k) => {
          const isActive = k.status === "active";
          const isEditing = editingId === k.id;
          const isConfirmingDelete = confirmDeleteId === k.id;
          return (
            <div
              key={k.id}
              className={`rounded-2xl border bg-card transition-colors ${
                isActive ? "border-primary" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-extrabold text-primary-foreground">
                  {k.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-foreground truncate">{k.name}</div>
                    {isActive && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary-deep">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{k.age} years</div>
                </div>
                {!isEditing && !isConfirmingDelete && (
                  <div className="flex items-center gap-1">
                    {!isActive && (
                      <button
                        onClick={() => makeActive(k.id)}
                        disabled={busy}
                        className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary-deep hover:bg-primary/10 disabled:opacity-50"
                        aria-label="Make active"
                      >
                        <Star className="h-3 w-3" /> Make active
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(k)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary-deep hover:bg-primary/10"
                      aria-label="Edit profile"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(k.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20"
                      aria-label="Delete profile"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {isConfirmingDelete && (
                <div className="border-t border-border p-3 space-y-3">
                  <p className="text-sm text-foreground">
                    Delete <span className="font-bold">{k.name}</span>'s profile?
                    {isActive && " Another profile will become active."}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Their stories stay in your account but will be hidden.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => doDelete(k.id)}
                      disabled={busy}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-destructive py-2.5 text-xs font-bold text-destructive-foreground disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={busy}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-card py-2.5 text-xs font-bold text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="border-t border-border p-3 space-y-3">
                  <div>
                    <FieldLabel tooltip="Your child's first name — used to personalise the story.">Name</FieldLabel>
                    <TextInput
                      value={editForm.name ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Aanya"
                    />
                  </div>
                  <div>
                    <FieldLabel tooltip="Helps us pitch the language and length just right.">Age</FieldLabel>
                    <TextInput
                      type="number"
                      min={2}
                      max={9}
                      value={editForm.age ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, age: parseInt(e.target.value, 10) || 0 }))}
                      placeholder="e.g. 5"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">Stories are crafted for ages 2–9.</p>
                  </div>
                  <div>
                    <FieldLabel tooltip="So we use the right pronouns in the story.">Gender</FieldLabel>
                    <Select
                      value={editForm.gender ?? ""}
                      onChange={(v) => setEditForm((f) => ({ ...f, gender: v }))}
                      options={GENDERS}
                      placeholder="Select gender"
                    />
                  </div>
                  <div>
                    <FieldLabel tooltip="This gives a quick overview. You can add more details about family members below.">
                      Family setup
                    </FieldLabel>
                    <Select
                      value={editForm.family_type ?? ""}
                      onChange={(v) => setEditForm((f) => ({ ...f, family_type: v }))}
                      options={FAMILY_SETUPS}
                      placeholder="Select family setup"
                    />
                  </div>
                  <div>
                    <FieldLabel tooltip="Adds local flavour and familiar places.">City</FieldLabel>
                    <TextInput
                      value={editForm.city ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="e.g. Bengaluru"
                    />
                  </div>
                  <div>
                    <FieldLabel tooltip="Shapes how the child behaves in the story.">Personality</FieldLabel>
                    <TextInput
                      value={editForm.personality ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, personality: e.target.value }))}
                      placeholder="e.g. playful, shy, curious"
                    />
                  </div>
                  <div>
                    <FieldLabel tooltip="So the setting feels like your child's everyday world.">Home type</FieldLabel>
                    <TextInput
                      value={editForm.home_type ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, home_type: e.target.value }))}
                      placeholder="e.g. Apartment, Independent House"
                    />
                  </div>
                  <div>
                    <FieldLabel tooltip="The people who appear around your child every day.">Family members</FieldLabel>
                    <TextInput
                      value={editForm.family_members ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, family_members: e.target.value }))}
                      placeholder="e.g. Father, Mother, Grandparents"
                    />
                  </div>
                  <div>
                    <FieldLabel
                      optional
                      tooltip="If your child has a sibling, their age helps us write a more realistic family dynamic."
                    >
                      Sibling's age
                    </FieldLabel>
                    <TextInput
                      inputMode="numeric"
                      value={editForm.sibling_age ?? ""}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          sibling_age: e.target.value === "" ? null : (parseInt(e.target.value, 10) as any),
                        }))
                      }
                      placeholder="e.g. 3"
                    />
                  </div>
                  <CompanionFields
                    name={editCompanion.name}
                    what={editCompanion.what}
                    onChange={setEditCompanion}
                  />
                  <div>
                    <FieldLabel tooltip="Helps us make the story feel more personal and familiar.">
                      Family address terms
                    </FieldLabel>
                    <p className="-mt-1 mb-2 text-[11px] text-muted-foreground">
                      e.g. Mother → Mummy, Father → Papa, Dog → Doggo
                    </p>
                    <AddressTermsEditor value={editTerms} onChange={setEditTerms} />
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
          onClick={() => nav("/add-child")}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border p-3 text-left text-muted-foreground hover:border-primary hover:text-primary"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border">
            <Plus className="h-4 w-4" />
          </div>
          <div className="text-sm font-bold">Add child</div>
        </button>

        <p className="px-1 pt-1 text-[11px] text-muted-foreground">
          Your child's details stay private to your account — never sold or shared — and are used only to personalise stories.
        </p>
      </main>

      <BottomNav />
    </PhoneShell>
  );
};

export default KidsProfiles;
