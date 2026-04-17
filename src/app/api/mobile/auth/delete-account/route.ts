export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import { assertHipaaReady, hipaaFailureResponse, isHipaaMode } from "@/lib/hipaa";

function getStorageConfig() {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documents";
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return { bucket, supabaseUrl: supabaseUrl.replace(/\/$/, ""), supabaseServiceKey };
}

async function listStoredDocuments(prefix: string): Promise<string[]> {
  const config = getStorageConfig();
  if (!config) return [];

  const listUrl = `${config.supabaseUrl}/storage/v1/object/list/${config.bucket}`;
  const response = await fetch(listUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.supabaseServiceKey}`,
      apikey: config.supabaseServiceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prefix,
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`storage list failed (${response.status}): ${errText}`);
  }

  const rows = (await response.json().catch(() => [])) as Array<{ name?: string }>;
  return rows
    .map((row) => row.name?.trim())
    .filter((name): name is string => Boolean(name))
    .map((name) => `${prefix}${name}`);
}

async function deleteStoredDocuments(fileKeys: string[]) {
  if (!fileKeys.length) return;
  const config = getStorageConfig();
  if (!config) return;

  const results = await Promise.allSettled(
    fileKeys.map(async (fileKey) => {
      const deleteUrl = `${config.supabaseUrl}/storage/v1/object/${config.bucket}/${fileKey}`;
      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${config.supabaseServiceKey}`,
          apikey: config.supabaseServiceKey,
        },
      });
      if (!response.ok && response.status != 404) {
        const errText = await response.text().catch(() => "");
        throw new Error(`storage delete failed (${response.status}): ${errText}`);
      }
    })
  );

  const failures = results.filter((result) => result.status === "rejected") as PromiseRejectedResult[];
  if (failures.length > 0) {
    throw new Error(
      failures
        .map((failure) => String(failure.reason))
        .join("; ")
    );
  }
}

async function purgeUserStorageObjects(userId: string, fileKeys: string[]) {
  const prefix = `documents/${userId}/`;
  const listedKeys = await listStoredDocuments(prefix).catch((error) => {
    console.error("storage list during account delete failed:", error);
    return [];
  });
  const allKeys = Array.from(new Set([...fileKeys, ...listedKeys].filter(Boolean)));
  if (allKeys.length === 0) return;
  await deleteStoredDocuments(allKeys);
}

export async function DELETE(req: Request) {
  let userId: string | null = null;
  let userEmail: string | null = null;
  let documentFileKeys: string[] = [];
  try {
    try {
      assertHipaaReady("storage");
    } catch (error) {
      if (isHipaaMode()) {
        return NextResponse.json(hipaaFailureResponse("storage"), { status: 503 });
      }
      throw error;
    }

    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = checkRateLimit(`mobile-delete-account:${user.id}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many account deletion attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }
    userId = user.id;
    userEmail = user.email;
    const safeUserId = user.id;
    const safeUserEmail = user.email;
    const docs = await db.document.findMany({
      where: { userId: safeUserId },
      select: { id: true, fileKey: true },
    });
    documentFileKeys = docs.map((d) => d.fileKey).filter(Boolean);

    await db.$transaction(async (tx) => {
      const recipes = await tx.recipe.findMany({ where: { userId: safeUserId }, select: { id: true } });
      const recipeIds = recipes.map((r) => r.id);
      if (recipeIds.length > 0) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: { in: recipeIds } } });
      }

      const diaryDays = await tx.diaryDay.findMany({ where: { userId: safeUserId }, select: { id: true } });
      const diaryDayIds = diaryDays.map((d) => d.id);
      if (diaryDayIds.length > 0) {
        await tx.diaryEntry.deleteMany({ where: { dayId: { in: diaryDayIds } } });
      }

      const savedMeals = await tx.savedMeal.findMany({ where: { userId: safeUserId }, select: { id: true } });
      const savedMealIds = savedMeals.map((m) => m.id);
      if (savedMealIds.length > 0) {
        await tx.savedMealItem.deleteMany({ where: { savedMealId: { in: savedMealIds } } });
      }

      const medications = await tx.medication.findMany({ where: { userId: safeUserId }, select: { id: true } });
      const medicationIds = medications.map((m) => m.id);
      if (medicationIds.length > 0) {
        await tx.medLog.deleteMany({ where: { medId: { in: medicationIds } } });
      }

      const appointments = await tx.appointment.findMany({ where: { userId: safeUserId }, select: { id: true } });
      const appointmentIds = appointments.map((a) => a.id);
      if (appointmentIds.length > 0) {
        await tx.documentLink.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
        await tx.appointmentReminder.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
        await tx.task.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
      }

      const docIds = docs.map((d) => d.id);
      if (docIds.length > 0) {
        await tx.documentAccessLog.deleteMany({ where: { documentId: { in: docIds } } });
        await tx.documentTag.deleteMany({ where: { documentId: { in: docIds } } });
        await tx.documentLink.deleteMany({ where: { documentId: { in: docIds } } });
      }

      await tx.documentAccessLog.deleteMany({ where: { userId: safeUserId } });
      await tx.document.deleteMany({ where: { userId: safeUserId } });

      await tx.task.deleteMany({ where: { userId: safeUserId } });
      await tx.appointment.deleteMany({ where: { userId: safeUserId } });

      await tx.diaryEntry.deleteMany({ where: { day: { userId: safeUserId } } });
      await tx.savedMeal.deleteMany({ where: { userId: safeUserId } });
      await tx.diaryDay.deleteMany({ where: { userId: safeUserId } });
      await tx.recipeIngredient.deleteMany({ where: { recipe: { userId: safeUserId } } });
      await tx.recipe.deleteMany({ where: { userId: safeUserId } });
      await tx.nutritionAlert.deleteMany({ where: { userId: safeUserId } });
      await tx.nutritionTarget.deleteMany({ where: { userId: safeUserId } });

      await tx.imagingEvent.deleteMany({ where: { userId: safeUserId } });
      await tx.wellnessLog.deleteMany({ where: { userId: safeUserId } });
      await tx.analyticsCache.deleteMany({ where: { userId: safeUserId } });
      await tx.weeklySummary.deleteMany({ where: { userId: safeUserId } });

      await tx.bloodPressureLog.deleteMany({ where: { userId: safeUserId } });
      await tx.symptomLog.deleteMany({ where: { userId: safeUserId } });
      await tx.observation.deleteMany({ where: { userId: safeUserId } });
      await tx.medication.deleteMany({ where: { userId: safeUserId } });
      await tx.alertEvent.deleteMany({ where: { userId: safeUserId } });
      await tx.savedTrial.deleteMany({ where: { userId: safeUserId } });
      await tx.consent.deleteMany({ where: { userId: safeUserId } });
      await tx.profile.deleteMany({ where: { userId: safeUserId } });
      await tx.auditLog.deleteMany({ where: { userId: safeUserId } });
      await tx.shareToken.deleteMany({ where: { patientId: safeUserId } });
      await tx.caregiverLink.deleteMany({ where: { OR: [{ patientId: safeUserId }, { caregiverId: safeUserId }] } });

      await tx.session.deleteMany({ where: { userId: safeUserId } });
      await tx.account.deleteMany({ where: { userId: safeUserId } });
      await tx.verificationToken.deleteMany({ where: { identifier: safeUserEmail } });

      await tx.user.delete({ where: { id: safeUserId } });
    });

    await purgeUserStorageObjects(safeUserId, documentFileKeys);
    await writeAuditLog({
      userId: safeUserId,
      action: "DELETE",
      resourceType: "ACCOUNT",
      details: JSON.stringify({
        liveDelete: true,
        deletedDocuments: documentFileKeys.length,
      }),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      deleted: true,
      deletedDocuments: documentFileKeys.length,
      backupNotice: "Account data has been removed from active systems. Backup copies may persist temporarily until normal retention windows expire.",
    });
  } catch (e) {
    console.error("mobile delete account error:", e);
    if (userId && userEmail) {
      try {
        const fallbackUserId = userId;
        const fallbackUserEmail = userEmail;
        await db.$transaction(async (tx) => {
          await tx.session.deleteMany({ where: { userId: fallbackUserId } });
          await tx.account.deleteMany({ where: { userId: fallbackUserId } });
          await tx.verificationToken.deleteMany({ where: { identifier: fallbackUserEmail } });
          await tx.profile.deleteMany({ where: { userId: fallbackUserId } });
          await tx.document.deleteMany({ where: { userId: fallbackUserId } });

          await tx.user.update({
            where: { id: fallbackUserId },
            data: {
              email: `deleted-${fallbackUserId}-${Date.now()}@pkdcompass.local`,
              name: "Deleted Account",
              passwordHash: null,
              role: "PATIENT",
              gender: null,
              notificationsEnabled: false,
            },
          });
        });

        await purgeUserStorageObjects(fallbackUserId, documentFileKeys).catch((storageError) => {
          console.error("mobile delete account fallback storage cleanup error:", storageError);
        });

        return NextResponse.json({
          success: true,
          anonymized: true,
          deletedDocuments: documentFileKeys.length,
          backupNotice: "Most account data has been removed from active systems. A minimal anonymized user shell was retained because a dependent record blocked hard deletion.",
        });
      } catch (fallbackError) {
        console.error("mobile delete account fallback error:", fallbackError);
      }
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
