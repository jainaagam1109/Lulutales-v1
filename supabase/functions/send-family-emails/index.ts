// Sends LuluTales family emails waiting in the email_outbox table, through Resend.
// Called every minute by a scheduled job in the database. Requires the x-outbox-key header.
import { createClient } from "jsr:@supabase/supabase-js@2";

const WELCOME_HTML = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"color-scheme\" content=\"light only\"><title>LuluTales</title></head>\n<body style=\"margin:0;padding:0;background:#F8F7FC\">\n<div style=\"display:none;max-height:0;overflow:hidden;opacity:0\">Thank you for registering. Here\u2019s what happens next.</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:#F8F7FC\"><tr><td align=\"center\" style=\"padding:28px 12px\">\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"max-width:560px\">\n<tr><td style=\"padding:0 8px 18px\">\n  <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>\n    <td style=\"width:34px;height:34px;border-radius:50%;background:#5B4BD6;text-align:center;vertical-align:middle;font-family:Quicksand,'Trebuchet MS',Arial,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF\">L</td>\n    <td style=\"padding-left:10px;font-family:Quicksand,'Trebuchet MS',Arial,sans-serif;font-size:22px;color:#2A2540\"><b>Lulu</b>Tales</td>\n  </tr></table>\n</td></tr>\n<tr><td style=\"background:#FFFFFF;border:1px solid #E4E1EE;border-radius:24px;padding:32px 28px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#3D3856\">\n<h1 style=\"margin:0 0 14px;font-family:Quicksand,'Trebuchet MS',Arial,sans-serif;font-size:26px;line-height:1.25;color:#2A2540\">Thank you for joining LuluTales</h1><p style=\"margin:0 0 14px;\">Hi there,</p><p style=\"margin:0 0 14px;\">Thank you for registering with LuluTales. We\u2019re so glad your family is here.</p><p style=\"margin:0 0 14px;\">We\u2019re welcoming families a few at a time, so every child gets our full care. Our team will review your request shortly, and you\u2019ll receive an email from us as soon as you\u2019re in.</p><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:6px 0 18px\"><tr><td style=\"background:#FBEFE2;border-radius:18px;padding:18px 20px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#2A2540\"><b>While you wait, the story library is open.</b><br>Calm bedtime stories, first-day courage, sharing, big feelings and more. Every story is designed with certified child psychologists, in English and \u0939\u093f\u0902\u0926\u0940.</td></tr></table><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:8px 0 4px\"><tr><td style=\"border-radius:999px;background:#5B4BD6\">\n<a href=\"https://lulutales.in/library\" style=\"display:inline-block;padding:15px 28px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px\">Explore the story library</a></td></tr></table><p style=\"margin:0 0 14px;margin-top:18px;font-size:15px;color:#6B6785\">Have a friend who\u2019s already on LuluTales? Ask them for their invite link and you\u2019ll skip the wait.</p><p style=\"margin:0 0 14px;margin:18px 0 0\">Warmly,<br><b style=\"color:#2A2540\">The LuluTales team</b></p>\n</td></tr>\n<tr><td style=\"padding:20px 8px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6B6785;text-align:center\">\nQuestions? Just reply to this email. It comes straight to us.<br>\nLuluTales \u00b7 Personalised stories that help children grow \u00b7 <a href=\"https://lulutales.in\" style=\"color:#6B6785\">lulutales.in</a>\n</td></tr>\n</table></td></tr></table></body></html>";
const APPROVED_HTML = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"color-scheme\" content=\"light only\"><title>LuluTales</title></head>\n<body style=\"margin:0;padding:0;background:#F8F7FC\">\n<div style=\"display:none;max-height:0;overflow:hidden;opacity:0\">Your family is in. Make your first personalised story tonight.</div>\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:#F8F7FC\"><tr><td align=\"center\" style=\"padding:28px 12px\">\n<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"max-width:560px\">\n<tr><td style=\"padding:0 8px 18px\">\n  <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>\n    <td style=\"width:34px;height:34px;border-radius:50%;background:#5B4BD6;text-align:center;vertical-align:middle;font-family:Quicksand,'Trebuchet MS',Arial,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF\">L</td>\n    <td style=\"padding-left:10px;font-family:Quicksand,'Trebuchet MS',Arial,sans-serif;font-size:22px;color:#2A2540\"><b>Lulu</b>Tales</td>\n  </tr></table>\n</td></tr>\n<tr><td style=\"background:#FFFFFF;border:1px solid #E4E1EE;border-radius:24px;padding:32px 28px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#3D3856\">\n<h1 style=\"margin:0 0 14px;font-family:Quicksand,'Trebuchet MS',Arial,sans-serif;font-size:26px;line-height:1.25;color:#2A2540\">You\u2019re in. Let\u2019s make your child\u2019s first story</h1><p style=\"margin:0 0 14px;\">Hi there,</p><p style=\"margin:0 0 14px;\">Great news: your family is now one of LuluTales\u2019 <b style=\"color:#2A2540\">founding families</b>. Everything is free until 31 December 2026.</p><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:8px 0 4px\"><tr><td style=\"border-radius:999px;background:#5B4BD6\">\n<a href=\"https://lulutales.in/magic-hub\" style=\"display:inline-block;padding:15px 28px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px\">Make your first story</a></td></tr></table><h2 style=\"margin:26px 0 12px;font-family:Quicksand,'Trebuchet MS',Arial,sans-serif;font-size:19px;color:#2A2540\">What you can do</h2><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td style=\"padding:0 0 12px;vertical-align:top;width:26px\"><div style=\"width:20px;height:20px;border-radius:50%;background:#5B4BD6;color:#fff;font-size:12px;line-height:20px;text-align:center;font-weight:700\">&#10003;</div></td>\n<td style=\"padding:0 0 12px 8px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#3D3856\"><b style=\"color:#2A2540\">Stories starring your child.</b> Your child is the hero, with your family\u2019s names, your city and the things they love.</td></tr><tr><td style=\"padding:0 0 12px;vertical-align:top;width:26px\"><div style=\"width:20px;height:20px;border-radius:50%;background:#5B4BD6;color:#fff;font-size:12px;line-height:20px;text-align:center;font-weight:700\">&#10003;</div></td>\n<td style=\"padding:0 0 12px 8px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#3D3856\"><b style=\"color:#2A2540\">A story for the moment they\u2019re in.</b> First day at school, a new sibling, bedtime fears, sharing toys. Pick the moment and we write the story around it.</td></tr><tr><td style=\"padding:0 0 12px;vertical-align:top;width:26px\"><div style=\"width:20px;height:20px;border-radius:50%;background:#5B4BD6;color:#fff;font-size:12px;line-height:20px;text-align:center;font-weight:700\">&#10003;</div></td>\n<td style=\"padding:0 0 12px 8px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#3D3856\"><b style=\"color:#2A2540\">Listen or read together.</b> A warm voice tells it, no screen needed. Or read it aloud at bedtime. In English or \u0939\u093f\u0902\u0926\u0940.</td></tr><tr><td style=\"padding:0 0 12px;vertical-align:top;width:26px\"><div style=\"width:20px;height:20px;border-radius:50%;background:#5B4BD6;color:#fff;font-size:12px;line-height:20px;text-align:center;font-weight:700\">&#10003;</div></td>\n<td style=\"padding:0 0 12px 8px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#3D3856\"><b style=\"color:#2A2540\">5 new stories every month,</b> plus the full story library and story worlds.</td></tr><tr><td style=\"padding:0 0 12px;vertical-align:top;width:26px\"><div style=\"width:20px;height:20px;border-radius:50%;background:#5B4BD6;color:#fff;font-size:12px;line-height:20px;text-align:center;font-weight:700\">&#10003;</div></td>\n<td style=\"padding:0 0 12px 8px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#3D3856\"><b style=\"color:#2A2540\">Invite friends.</b> They skip the wait, and you get 2 extra stories for each friend who joins.</td></tr></table><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:6px 0 18px\"><tr><td style=\"background:#FBEFE2;border-radius:18px;padding:18px 20px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#2A2540\"><b>How it helps your child</b><br>Every LuluTales story is designed with certified child psychologists. When children hear themselves as the hero, solving a problem they really face, they practise courage, kindness and calm in a safe way. Each story quietly builds one skill, and you can see what your child is learning in the Parents section.</td></tr></table><table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:8px 0 4px\"><tr><td style=\"border-radius:999px;background:#5B4BD6\">\n<a href=\"https://lulutales.in/magic-hub\" style=\"display:inline-block;padding:15px 28px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px\">Make your first story</a></td></tr></table><p style=\"margin:0 0 14px;margin:22px 0 0\">Warmly,<br><b style=\"color:#2A2540\">The LuluTales team</b></p>\n</td></tr>\n<tr><td style=\"padding:20px 8px;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6B6785;text-align:center\">\nQuestions? Just reply to this email. It comes straight to us.<br>\nLuluTales \u00b7 Personalised stories that help children grow \u00b7 <a href=\"https://lulutales.in\" style=\"color:#6B6785\">lulutales.in</a>\n</td></tr>\n</table></td></tr></table></body></html>";

const EMAILS = {
  welcome: { subject: "Thank you for joining LuluTales", html: WELCOME_HTML },
  approved: { subject: "You’re in. Let’s make your child’s first story", html: APPROVED_HTML },
} as const;

const WELCOME_DELAY_MS = 10 * 60 * 1000; // give invite sign-ups time to be approved first

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  // Only the database's scheduled job knows this key (kept in a private table).
  const { data: k } = await db.from("app_secrets").select("value").eq("name", "outbox_key").maybeSingle();
  const given = req.headers.get("x-outbox-key");
  if (!k?.value || !given || given !== k.value) return new Response("forbidden", { status: 403 });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return new Response("RESEND_API_KEY missing", { status: 500 });

  const { data: settings } = await db.from("app_settings").select("emails_enabled, email_test_recipients").limit(1).maybeSingle();
  const live = !!settings?.emails_enabled;
  const testList = ((settings?.email_test_recipients ?? []) as string[]).map((e) => e.toLowerCase());

  const { data: rows } = await db
    .from("email_outbox")
    .select("id, user_id, kind, created_at, attempts")
    .is("sent_at", null)
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(25);

  const results: unknown[] = [];
  for (const row of rows ?? []) {
    const { data: u } = await db.auth.admin.getUserById(row.user_id);
    const email = u?.user?.email?.toLowerCase();
    const mark = (patch: Record<string, unknown>) => db.from("email_outbox").update(patch).eq("id", row.id);
    if (!email) {
      await mark({ sent_at: new Date().toISOString(), last_error: "no email on account (skipped)" });
      continue;
    }
    // Before launch, only test addresses receive emails; everyone else waits in the queue.
    if (!live && !testList.includes(email)) continue;

    const { data: fa } = await db.from("family_access").select("status").eq("user_id", row.user_id).maybeSingle();
    if (row.kind === "welcome") {
      if (Date.now() - new Date(row.created_at).getTime() < WELCOME_DELAY_MS) continue;
      if (fa?.status !== "waiting") {
        await mark({ sent_at: new Date().toISOString(), last_error: "not waiting any more (skipped)" });
        continue;
      }
    }
    if (row.kind === "approved" && fa?.status !== "approved") {
      await mark({ sent_at: new Date().toISOString(), last_error: "not approved any more (skipped)" });
      continue;
    }

    const tpl = EMAILS[row.kind as keyof typeof EMAILS];
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "LuluTales <hello@lulutales.in>",
        to: [email],
        reply_to: "hello@lulutales.in",
        subject: tpl.subject,
        html: tpl.html,
      }),
    });
    if (res.ok) {
      await mark({ sent_at: new Date().toISOString(), attempts: row.attempts + 1, last_error: null });
      results.push({ id: row.id, sent: true });
    } else {
      const err = (await res.text()).slice(0, 500);
      await mark({ attempts: row.attempts + 1, last_error: err });
      results.push({ id: row.id, sent: false, err });
    }
  }
  return new Response(JSON.stringify({ live, processed: results }), { headers: { "Content-Type": "application/json" } });
});
