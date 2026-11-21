import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedRoles = new Set(["manajer", "admin_keuangan", "kasir", "admin_gudang", "pengurus"]);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

function makeTemporaryPassword() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, message: "Method tidak diizinkan." }, 405);

  let adminClient: ReturnType<typeof createClient> | null = null;
  let createdUserId: string | null = null;
  let membershipId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const publishableRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "";
    const secretRaw = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const emailFrom = Deno.env.get("INVITE_EMAIL_FROM") ?? "";
    const appLoginUrl = Deno.env.get("APP_LOGIN_URL") ?? "";

    if (!supabaseUrl || !publishableRaw || !secretRaw || !resendApiKey || !emailFrom || !appLoginUrl) {
      return jsonResponse({
        success: false,
        message: "Konfigurasi server belum lengkap. Periksa secret Supabase, Resend, alamat pengirim, dan link aplikasi.",
      }, 500);
    }

    let publishableKey = "";
    let secretKey = "";
    try {
      publishableKey = JSON.parse(publishableRaw).default ?? "";
      secretKey = JSON.parse(secretRaw).default ?? "";
    } catch {
      return jsonResponse({ success: false, message: "Format secret key Supabase tidak valid." }, 500);
    }
    if (!publishableKey || !secretKey) return jsonResponse({ success: false, message: "API key Supabase tidak ditemukan." }, 500);

    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) return jsonResponse({ success: false, message: "Silakan login terlebih dahulu." }, 401);

    const userClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData?.user) return jsonResponse({ success: false, message: "Sesi login tidak valid. Silakan login ulang." }, 401);

    const body = await req.json();
    const cooperativeId = String(body?.cooperative_id ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const fullName = String(body?.nama_lengkap ?? "").trim();
    const role = String(body?.role ?? "").trim().toLowerCase();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(cooperativeId)) return jsonResponse({ success: false, message: "ID koperasi tidak valid." }, 400);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ success: false, message: "Alamat email tidak valid." }, 400);
    if (!fullName || fullName.length > 120) return jsonResponse({ success: false, message: "Nama lengkap wajib diisi, maksimal 120 karakter." }, 400);
    if (!allowedRoles.has(role)) return jsonResponse({ success: false, message: "Role tidak diizinkan." }, 400);

    adminClient = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: managerProfile, error: managerProfileError } = await adminClient
      .from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (managerProfileError || managerProfile?.role !== "manajer") {
      return jsonResponse({ success: false, message: "Hanya akun dengan role Manajer yang boleh mengundang pengguna." }, 403);
    }

    const { data: managerMembership, error: managerError } = await adminClient
      .from("cooperative_memberships").select("id")
      .eq("cooperative_id", cooperativeId)
      .eq("user_id", authData.user.id)
      .eq("role", "manajer")
      .eq("status", "active")
      .maybeSingle();
    if (managerError) return jsonResponse({ success: false, message: "Gagal memeriksa hak akses Manajer." }, 500);
    if (!managerMembership) return jsonResponse({ success: false, message: "Hanya Manajer aktif koperasi ini yang boleh membuat akun." }, 403);

    const { data: cooperative, error: cooperativeError } = await adminClient
      .from("cooperatives").select("id,name")
      .eq("id", cooperativeId).eq("status", "active").maybeSingle();
    if (cooperativeError || !cooperative) return jsonResponse({ success: false, message: "Koperasi tidak ditemukan atau tidak aktif." }, 404);

    const temporaryPassword = makeTemporaryPassword();
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        nama_lengkap: fullName,
        cooperative_name: cooperative.name,
        invited_by: authData.user.id,
        role,
      },
    });
    if (createError || !created.user) {
      const detail = createError?.message ?? "Akun pengguna gagal dibuat.";
      if (/already|registered|exists/i.test(detail)) {
        return jsonResponse({ success: false, message: "Email ini sudah memiliki akun DAGBOEK. Gunakan akun yang ada atau alamat email lain." }, 409);
      }
      return jsonResponse({ success: false, message: "Gagal membuat akun pengguna." }, 400);
    }
    createdUserId = created.user.id;

    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: createdUserId,
      nama_lengkap: fullName,
      role,
    }, { onConflict: "id" });
    if (profileError) throw new Error("Profil pengguna gagal disiapkan: " + profileError.message);

    const { data: membership, error: membershipError } = await adminClient
      .from("cooperative_memberships").insert({
        cooperative_id: cooperativeId,
        user_id: createdUserId,
        role,
        status: "active",
      }).select("id").single();
    if (membershipError || !membership) throw new Error("Hak akses koperasi gagal disimpan: " + (membershipError?.message ?? "unknown error"));
    membershipId = membership.id;

    const { data: recoveryData, error: recoveryError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: appLoginUrl },
    });
    const actionLink = recoveryData?.properties?.action_link;
    if (recoveryError || !actionLink) throw new Error("Tautan pembuatan password gagal dibuat.");

    const safeName = escapeHtml(fullName);
    const safeEmail = escapeHtml(email);
    const safeCooperative = escapeHtml(cooperative.name);
    const roleLabels: Record<string, string> = { manajer: "Manajer — Hak Akses Penuh", admin_keuangan: "Admin Keuangan", kasir: "Kasir", admin_gudang: "Admin Gudang", pengurus: "Pengurus" };
    const safeRole = escapeHtml(roleLabels[role] ?? role);
    const safeActionLink = escapeHtml(actionLink);
    const safeLoginUrl = escapeHtml(appLoginUrl);

    const html = `<!doctype html><html lang="id"><body style="font-family:Arial,sans-serif;color:#202a3c;line-height:1.65;background:#f7f6f1;padding:24px">
      <div style="max-width:560px;margin:auto;padding:28px;background:#fff;border:1px solid #e7dfcf;border-radius:14px">
        <h2 style="color:#172033;margin-top:0">Undangan akun KDMP by Nusa Pixel</h2>
        <p>Halo <b>${safeName}</b>, Manajer telah mengundang Anda bergabung ke <b>${safeCooperative}</b>.</p>
        <p><b>Email akun:</b> ${safeEmail}<br><b>Hak akses:</b> ${safeRole}</p>
        <p>Gunakan tombol berikut untuk membuat password pribadi. Tautan ini bersifat pribadi dan hanya boleh digunakan oleh penerima undangan.</p>
        <p><a href="${safeActionLink}" style="display:inline-block;background:#172033;color:#f4dfaa;padding:13px 22px;text-decoration:none;border-radius:8px;font-weight:bold">Buat Password Saya</a></p>
        <p>Setelah membuat password, masuk ke KDMP melalui <a href="${safeLoginUrl}">halaman login</a>.</p>
        <p style="font-size:12px;color:#7b8495">Jika Anda tidak mengenal undangan ini, abaikan email ini dan hubungi Manajer koperasi.</p>
      </div></body></html>`;

    const mailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: `Undangan DAGBOEK — ${cooperative.name}`,
        html,
      }),
    });
    if (!mailResponse.ok) {
      console.error("Resend invite error:", (await mailResponse.text()).slice(0, 300));
      throw new Error("Email undangan gagal dikirim. Periksa konfigurasi email dan coba lagi.");
    }

    return jsonResponse({
      success: true,
      message: "Undangan aman berhasil dikirim. Pengguna dapat membuat password pribadinya melalui email.",
      email,
      cooperative: cooperative.name,
      role,
    });
  } catch (error) {
    console.error("Invite-user error:", error);
    if (adminClient && membershipId) await adminClient.from("cooperative_memberships").delete().eq("id", membershipId);
    if (adminClient && createdUserId) {
      await adminClient.from("profiles").delete().eq("id", createdUserId);
      await adminClient.auth.admin.deleteUser(createdUserId);
    }
    return jsonResponse({
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan pada server.",
    }, 500);
  }
});
