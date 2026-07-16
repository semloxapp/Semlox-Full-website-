import { extractBearerTokenFromRequest, getUserFromAccessToken } from "@/lib/auth";
import { createNotificationsSafely, getUserNotificationCompanyId } from "@/lib/notifications";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function serviceHeaders() {
  return {
    apikey: supabaseServiceRoleKey as string,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function authenticate(request: Request) {
  const token = await extractBearerTokenFromRequest(request);
  if (!token) return null;
  return await getUserFromAccessToken(token);
}

function createSupabaseAdminClient() {
  return createClient(supabaseUrl || "", supabaseServiceRoleKey || "", {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isMissingBucket(error: any) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("bucket") && (message.includes("not found") || message.includes("does not exist"));
}

async function updateAvatarUrl(userId: string, avatarUrl: string) {
  const existingResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=id`, {
    method: "GET",
    headers: serviceHeaders(),
  });
  const existingRows = existingResp.ok ? await existingResp.json().catch(() => []) : [];
  const hasProfile = Array.isArray(existingRows) && existingRows.length > 0;

  if (hasProfile) {
    const patchResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`, {
      method: "PATCH",
      headers: { ...serviceHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({ avatar_url: avatarUrl }),
    });
    const patchData = await patchResp.json().catch(() => null);
    if (patchResp.ok) return Array.isArray(patchData) ? patchData[0] || null : patchData;

    const text = `${patchData?.message || ""} ${patchData?.details || ""} ${patchData?.hint || ""}`.toLowerCase();
    if (text.includes("avatar_url") && text.includes("column")) {
      return null;
    }
    throw new Error("Avatar profile update failed");
  }

  const createResp = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, {
    method: "POST",
    headers: { ...serviceHeaders(), Prefer: "return=representation" },
    body: JSON.stringify({ id: userId, avatar_url: avatarUrl }),
  });
  const createData = await createResp.json().catch(() => null);
  if (!createResp.ok) {
    const text = `${createData?.message || ""} ${createData?.details || ""} ${createData?.hint || ""}`.toLowerCase();
    if (text.includes("avatar_url") && text.includes("column")) {
      return null;
    }
    throw new Error("Avatar profile update failed");
  }
  return Array.isArray(createData) ? createData[0] || null : createData;
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable" }, 500);
  }

  const user = await authenticate(request);
  if (!user?.id) {
    return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("avatar");
    if (!(file instanceof File)) {
      return jsonResponse({ ok: false, code: "AVATAR_FILE_REQUIRED", message: "Please choose an image to upload." }, 400);
    }

    const ext = ALLOWED_MIME_TYPES[file.type];
    if (!ext) {
      return jsonResponse({ ok: false, code: "INVALID_AVATAR_TYPE", message: "Upload a JPG, PNG, or WebP image." }, 400);
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return jsonResponse({ ok: false, code: "AVATAR_TOO_LARGE", message: "Profile picture must be 2 MB or smaller." }, 400);
    }

    const bytes = await file.arrayBuffer();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const supabaseAdmin = createSupabaseAdminClient();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: true });

    if (uploadError) {
      if (isMissingBucket(uploadError)) {
        return jsonResponse({ ok: false, code: "AVATAR_STORAGE_NOT_CONFIGURED", message: "Avatar storage is not configured." }, 500);
      }
      if (process.env.NODE_ENV !== "production") {
        console.log("[user-avatar] upload failed", { message: uploadError.message });
      }
      return jsonResponse({ ok: false, code: "AVATAR_UPLOAD_FAILED", message: "Profile picture could not be uploaded." }, 500);
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const avatarUrl = publicUrlData?.publicUrl || "";
    if (!avatarUrl) {
      return jsonResponse({ ok: false, code: "AVATAR_UPLOAD_FAILED", message: "Profile picture could not be uploaded." }, 500);
    }

    const profile = await updateAvatarUrl(user.id, avatarUrl);
    if (!profile) {
      return jsonResponse({ ok: false, code: "AVATAR_PROFILE_FIELD_MISSING", message: "Profile avatar storage is not configured." }, 500);
    }

    const companyId = await getUserNotificationCompanyId(user.id);
    await createNotificationsSafely([
      {
        companyId,
        userId: user.id,
        audience: "user",
        type: "avatar_updated",
        category: "system",
        severity: "success",
        title: "Profile picture updated",
        message: "Your profile picture was updated successfully.",
        data: { href: "/dashboard/settings" },
      },
    ], "user-avatar");

    return jsonResponse({ ok: true, data: { avatar_url: avatarUrl } }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log("[user-avatar] request failed", { message: err?.message || "Unknown error" });
    return jsonResponse({ ok: false, code: "AVATAR_UPLOAD_FAILED", message: "Profile picture could not be uploaded." }, 500);
  }
}
