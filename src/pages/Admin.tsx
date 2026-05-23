import { useNavigate } from "react-router-dom";
import { PhoneShell } from "@/components/PhoneShell";

const Admin = () => {
  const nav = useNavigate();

  const Card = ({
    emoji,
    title,
    subtitle,
    to,
  }: {
    emoji: string;
    title: string;
    subtitle: string;
    to: string;
  }) => (
    <button
      onClick={() => nav(to)}
      className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-opacity hover:opacity-90"
    >
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary text-3xl">
        {emoji}
      </div>
      <div className="flex-1">
        <div className="text-sm font-extrabold text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </button>
  );

  return (
    <PhoneShell>
      <div className="flex-1 overflow-y-auto px-5 pt-8 pb-10">
        <h1 className="text-2xl font-extrabold text-foreground">Admin</h1>
        <p className="mb-6 mt-1 text-xs text-muted-foreground">Internal tools</p>

        <div className="space-y-3">
          <Card
            emoji="📤"
            title="Upload a Story"
            subtitle="Add a new curated story"
            to="/admin/upload"
          />
          <Card
            emoji="📊"
            title="Generation Health"
            subtitle="Success metrics & pipeline stats"
            to="/admin/health"
          />
        </div>
      </div>
    </PhoneShell>
  );
};

export default Admin;
