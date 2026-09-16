import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("REMINDER_FROM_EMAIL") ?? "Datapath People <onboarding@resend.dev>";
const APP_URL = Deno.env.get("APP_URL") ?? "https://profile-persona-pilot.lovable.app";

type Reminder = {
  id: string;
  review_id: string;
  contributor_id: string | null;
  kind: string;
  recipient_name: string | null;
  recipient_email: string | null;
  due_date: string;
};

function body(name: string, kind: string, employee: string, due: string, url: string) {
  const what =
    kind === "self"
      ? "your own review input"
      : `your feedback on ${employee}`;
  return `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15px;color:#111">
  <p>Hi ${name || "there"},</p>
  <p>This is a reminder that ${what} is still outstanding. It was due on <strong>${due}</strong>.</p>
  <p><a href="${url}" style="display:inline-block;background:#00a366;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Open your form</a></p>
  <p style="font-size:13px;color:#555">The link is private to you. If the button doesn't work, paste this into your browser:<br>${url}</p>
  <p style="font-size:13px;color:#555">Datapath People team</p>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Caller must be a signed-in HR or admin user.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
  const { data: userData } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Sign in required." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
  const allowed = (roles ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "hr");
  const { count: roleCount } = await admin
    .from("user_roles")
    .select("id", { count: "exact", head: true });
  if (!allowed && (roleCount ?? 0) > 0) {
    return new Response(JSON.stringify({ error: "Only HR or admin can send reminders." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "Email sending isn't switched on yet. Connect a sender domain for this workspace first.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: queued, error } = await admin
    .from("review_reminders")
    .select("id, review_id, contributor_id, kind, recipient_name, recipient_email, due_date")
    .eq("status", "queued")
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const r of (queued ?? []) as Reminder[]) {
    if (!r.recipient_email) {
      skipped++;
      await admin
        .from("review_reminders")
        .update({ status: "skipped", last_error: "No email address on file." })
        .eq("id", r.id);
      continue;
    }

    try {
      const { data: token, error: tokenErr } = await admin.rpc("create_review_token", {
        _review_id: r.review_id,
        _kind: r.kind,
        _contributor_id: r.contributor_id,
        _days: 30,
      });
      if (tokenErr) throw tokenErr;

      const { data: review } = await admin
        .from("performance_reviews")
        .select("employee_name")
        .eq("id", r.review_id)
        .maybeSingle();

      const url = `${APP_URL}/review-form?token=${token}`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [r.recipient_email],
          subject:
            r.kind === "self"
              ? "Reminder: your review input is still outstanding"
              : `Reminder: feedback on ${review?.employee_name ?? "a colleague"}`,
          html: body(
            r.recipient_name ?? "",
            r.kind,
            review?.employee_name ?? "a colleague",
            r.due_date,
            url,
          ),
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      await admin
        .from("review_reminders")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
        .eq("id", r.id);
      sent++;
    } catch (e) {
      failed++;
      await admin
        .from("review_reminders")
        .update({
          status: "failed",
          last_error: String((e as Error).message ?? e).slice(0, 500),
        })
        .eq("id", r.id);
    }
  }

  return new Response(JSON.stringify({ sent, failed, skipped }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
