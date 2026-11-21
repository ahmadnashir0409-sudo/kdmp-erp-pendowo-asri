import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getPublishableKey(): string {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (raw) {
    try {
      const keys = JSON.parse(raw);
      if (typeof keys.default === "string") return keys.default;
      const first = Object.values(keys).find((value) => typeof value === "string");
      if (typeof first === "string") return first;
    } catch {
      // Fall through to the legacy anon key.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

function extractOutputText(payload: any): string {
  const parts = Array.isArray(payload?.output) ? payload.output : [];
  return parts
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((part: any) => part?.type === "output_text" && typeof part?.text === "string")
    .map((part: any) => part.text)
    .join("\n")
    .trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Sesi login tidak ditemukan. Silakan login ulang." }, 401);

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    return json({
      error: "DABU belum dikonfigurasi. Admin perlu menambahkan OPENAI_API_KEY pada Supabase Edge Function Secrets.",
      code: "DABU_NOT_CONFIGURED",
    }, 503);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = getPublishableKey();
  if (!supabaseUrl || !publishableKey) return json({ error: "Konfigurasi Supabase belum lengkap." }, 500);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Format permintaan tidak valid." }, 400);
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const conversationId = typeof body?.conversation_id === "string" ? body.conversation_id : null;
  if (!message || message.length > 2500) return json({ error: "Pesan wajib diisi dan maksimal 2.500 karakter." }, 400);

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData?.user) return json({ error: "Sesi login tidak valid. Silakan login ulang." }, 401);
  const user = authData.user;

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile?.role) return json({ error: "Profil atau role pengguna tidak ditemukan." }, 403);

  let previousMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (conversationId) {
    const { data: conversation, error: conversationError } = await userClient
      .from("dabu_conversations")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle();
    if (conversationError || !conversation) return json({ error: "Percakapan tidak ditemukan atau bukan milik akun ini." }, 404);

    const { data: history } = await userClient
      .from("dabu_messages")
      .select("role,content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(12);
    previousMessages = (history ?? [])
      .reverse()
      .filter((item: any) => (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
      .map((item: any) => ({ role: item.role, content: item.content.slice(0, 4000) }));
  }

  const { data: memoryRow } = await userClient
    .from("dabu_user_memory")
    .select("memory_summary")
    .eq("user_id", user.id)
    .maybeSingle();
  const memorySummary = typeof memoryRow?.memory_summary === "string" ? memoryRow.memory_summary : "";

  const context: Record<string, unknown> = { role: profile.role };
  const safeQuery = async (table: string, select: string, configure: (query: any) => any) => {
    try {
      const { data, error } = await configure(userClient.from(table).select(select));
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  };

  context.inventory = await safeQuery("inventory_products", "product_name,current_stock,unit,selling_price", (q) =>
    q.order("product_name", { ascending: true }).limit(25));
  context.recent_sales = await safeQuery("store_sales", "sale_number,total,status,created_at", (q) =>
    q.order("created_at", { ascending: false }).limit(8));

  if (["manajer", "admin_keuangan", "pengurus"].includes(profile.role)) {
    context.recent_financial_transactions = await safeQuery("financial_transactions", "jenis,nominal,tanggal,keterangan", (q) =>
      q.order("tanggal", { ascending: false }).limit(8));
    context.recent_journals = await safeQuery("journal_entries", "tanggal,keterangan,status", (q) =>
      q.order("tanggal", { ascending: false }).limit(8));
  }

  if (["manajer", "admin_keuangan"].includes(profile.role)) {
    context.accounts = await safeQuery("accounts", "kode_akun,nama_akun,kategori,aktif", (q) =>
      q.order("kode_akun", { ascending: true }).limit(35));
  }

  const instructions = [
    "Kamu adalah DABU, asisten AI internal DAGBOEK by Nusa Pixel untuk membantu pengurus koperasi memahami ERP, akuntansi, transaksi, stok, laporan, dan prosedur aplikasi.",
    "Gunakan bahasa Indonesia yang santai, ramah, jelas, dan praktis. Jangan mengarang angka atau status. Jika konteks tidak memuat data yang diminta, katakan bahwa datanya belum tersedia.",
    "Kamu hanya asisten baca-saja. Jangan mengaku telah membuat, mengubah, menghapus, memposting, atau membatalkan transaksi. Jangan meminta password, token, API key, atau data autentikasi.",
    "Jika menjelaskan akuntansi, jelaskan logika debit/kredit secara sederhana. Bedakan fakta dari asumsi. Untuk koreksi saldo atau jurnal produksi, sarankan transaksi koreksi yang dapat diaudit dan persetujuan manajer.",
    "Jika pengguna meminta tindakan yang mengubah database, jelaskan bahwa versi ini belum memiliki izin untuk mengeksekusi perubahan dan arahkan ke modul terkait.",
    "Role pengguna saat ini: " + profile.role,
    "Ringkasan memori pengguna (jika ada): " + (memorySummary || "Belum ada memori tersimpan."),
    "Konteks data ERP yang boleh dibaca oleh role pengguna: " + JSON.stringify(context),
  ].join("\n\n");

  const input = [
    ...previousMessages,
    { role: "user", content: message },
  ];

  let answer = "";
  try {
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-6.2-astra",
        instructions,
        input,
        max_output_tokens: 850,
      }),
    });
    const aiPayload = await aiResponse.json();
    if (!aiResponse.ok) {
      return json({ error: "Layanan AI sedang tidak tersedia. Coba lagi sebentar lagi." }, 502);
    }
    answer = extractOutputText(aiPayload);
  } catch {
    return json({ error: "DABU gagal terhubung ke layanan AI. Periksa koneksi lalu coba lagi." }, 502);
  }

  if (!answer) return json({ error: "DABU belum menghasilkan jawaban. Coba ubah pertanyaan." }, 502);

  let finalConversationId = conversationId;
  if (!finalConversationId) {
    const title = message.replace(/\s+/g, " ").slice(0, 72) || "Percakapan DABU";
    const { data: newConversation, error: createError } = await userClient
      .from("dabu_conversations")
      .insert({ user_id: user.id, title })
      .select("id")
      .single();
    if (createError || !newConversation) return json({ error: "Jawaban tersedia, tetapi percakapan gagal disimpan." }, 500);
    finalConversationId = newConversation.id;
  }

  const { error: saveError } = await userClient.from("dabu_messages").insert([
    { conversation_id: finalConversationId, user_id: user.id, role: "user", content: message },
    { conversation_id: finalConversationId, user_id: user.id, role: "assistant", content: answer },
  ]);
  if (saveError) return json({ error: "Jawaban tersedia, tetapi riwayat percakapan gagal disimpan." }, 500);

  await userClient.from("dabu_conversations")
    .update({ updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() })
    .eq("id", finalConversationId);

  return json({ answer, conversation_id: finalConversationId });
});
