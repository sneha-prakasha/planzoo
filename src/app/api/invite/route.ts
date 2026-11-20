import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { projectId?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const projectId = body.projectId;
  const email = body.email?.trim().toLowerCase();
  if (!projectId || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  // Run everything as the signed-in user so Row Level Security protects the data.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: status, error } = await supabase.rpc("add_member_by_email", {
    p_project_id: projectId,
    p_email: email,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();

  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
      const projectName = project?.name ?? "a project";
      const isNew = status === "invited";
      const { error: sendError } = await resend.emails.send({
        from: process.env.RESEND_FROM || "PlanZoo <onboarding@resend.dev>",
        to: email,
        subject: `You've been invited to ${projectName} on PlanZoo`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px">
            <h2>You're invited to ${escapeHtml(projectName)}</h2>
            <p>${
              isNew
                ? "Create a PlanZoo account with this email address and the project will appear on your dashboard automatically."
                : "You have been added to this project. Log in to see it on your dashboard."
            }</p>
            <p><a href="${siteUrl}/login${isNew ? "?mode=signup" : ""}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open PlanZoo</a></p>
          </div>`,
      });
      emailSent = !sendError;
    } catch {
      emailSent = false;
    }
  }

  return NextResponse.json({ status, emailSent });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
