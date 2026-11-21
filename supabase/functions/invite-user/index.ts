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
    if (!supabaseUrl || !publishableRaw || !secretRaw) {
      return jsonResponse({ success: false, message: "Konfigurasi server Supabase belum lengkap." }, 500);
    }

    let publishableKey = "";
    let secretKey = "";
    try {
      publishableKey = JSON.parse(publishableRaw).default ?? "";
      secretKey = JSON.parse(secretRaw).default ?? "";
    } catch {
      return jsonResponse({ success: false, message: "Format secret key Supabase tidak valid." }, 500);
    }
    if (!publishableKey || !secretKey) {
      return jsonResponse({ success: false, message: "API key Supabase tidak ditemukan." }, 500);
    }

    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) return jsonResponse({ success: false, message: "Silakan login terlebih dahulu." }, 401);

    const userClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData?.user) {
      return jsonResponse({ success: false, message: "Sesi login tidak valid. Silakan login ulang." }, 401);
    }

    const body = await req.json();
    const cooperativeId = String(body?.cooperative_id ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    const role = String(body?.role ?? "").trim().toLowerCase();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(cooperativeId)) return jsonResponse({ success: false, message: "ID koperasi tidak valid." }, 400);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ success: false, message: "Alamat email tidak valid." }, 400);
    if (password.length < 8 || password.length > 72) return jsonResponse({ success: false, message: "Password harus terdiri dari 8 sampai 72 karakter." }, 400);
    if (!allowedRoles.has(role)) return jsonResponse({ success: false, message: "Role tidak diizinkan." }, 400);

    adminClient = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: managerProfile, error: managerProfileError } = await adminClient
      .from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (managerProfileError || managerProfile?.role !== "manajer") {
      return jsonResponse({ success: false, message: "Hanya akun dengan role Manajer yang boleh membuat pengguna." }, 403);
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
    if (cooperativeError || !cooperative) {
      return jsonResponse({ success: false, message: "Koperasi tidak ditemukan atau tidak aktif." }, 404);
    }

    // Kolom nama profil tetap diisi otomatis dari bagian email sebelum @;
    // form tidak meminta atau menyimpan nama terpisah.
    const profileName = email.split("@")[0].slice(0, 120);
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nama_lengkap: profileName,
        cooperative_name: cooperative.name,
        invited_by: authData.user.id,
        role,
      },
    });
    if (createError || !created.user) {
      const detail = createError?.message ?? "Akun pengguna gagal dibuat.";
      if (/already|registered|exists/i.test(detail)) {
        return jsonResponse({ success: false, message: "Email ini sudah memiliki akun. Gunakan akun yang ada atau alamat email lain." }, 409);
      }
      console.error("Create user error:", detail);
      return jsonResponse({ success: false, message: "Gagal membuat akun pengguna." }, 400);
    }
    createdUserId = created.user.id;

    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: createdUserId,
      nama_lengkap: profileName,
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
    if (membershipError || !membership) {
      throw new Error("Hak akses koperasi gagal disimpan: " + (membershipError?.message ?? "unknown error"));
    }
    membershipId = membership.id;

    return jsonResponse({
      success: true,
      message: "Akun pengguna berhasil dibuat dan password awal telah ditetapkan.",
      email,
      cooperative: cooperative.name,
      role,
    }, 201);
  } catch (error) {
    console.error("Create-user error:", error);
    if (adminClient && membershipId) {
      await adminClient.from("cooperative_memberships").delete().eq("id", membershipId);
    }
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
