import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { supabase } from "@/integrations/myproject/client";

type StoryRow = {
  id: string;
  title: string;
  story_type: string | null;
  created_at: string;
  is_generated: boolean;
};

const AdminHealth = () => {
  const nav = useNavigate();
  const [rows, setRows] = useState<StoryRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("stories")
        .select("id, title, story_type, created_at, is_generated")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!cancelled && data) setRows(data as StoryRow[]);
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const total = rows.length;
  const succeeded = rows.filter((r) => r.is_generated).length;
  const pending = total - succeeded;
  const successRate = total > 0 ? Math.round((succeeded / total) * 100) : 0;

  const Tile = ({ label, value }: { label: string; value: string | number }) => (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-extrabold text-foreground">{value}</div>
    </div>
  );

  return (
    <PhoneShell>
      <div className="flex-1 overflow-y-auto px-5 pt-8 pb-10">
        <button
          onClick={() => nav("/admin")}
          className="mb-3 flex items-center gap-1 text-xs text-primary-deep"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl font-extrabold text-foreground">Generation Health</h1>
        <p className="mb-5 mt-1 text-xs text-muted-foreground">Auto-refreshes every 30s</p>

        <div className="grid grid-cols-2 gap-3">
          <Tile label="Total Requested" value={total} />
          <Tile label="Succeeded" value={succeeded} />
          <Tile label="Pending" value={pending} />
          <Tile label="Success Rate" value={`${successRate}%`} />
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Avg generation time
          </div>
          <div className="mt-1 text-xl font-extrabold text-foreground">—</div>
        </div>

        <h2 className="mt-6 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent generations
        </h2>
        <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-border bg-card">
          {rows.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">No stories yet.</div>
          )}
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs last:border-b-0"
            >
              <div className="flex-1 truncate">
                <div className="font-semibold text-foreground truncate">{r.title}</div>
                <div className="text-[10px] text-muted-foreground">
                  {r.story_type ?? "—"} · {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  r.is_generated
                    ? "bg-secondary text-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {r.is_generated ? "Generated" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
};

export default AdminHealth;
