type HipaaService = "hosting" | "database" | "storage" | "email" | "ai";

function envTrue(value: string | undefined): boolean {
  return typeof value === "string" && ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function isHipaaMode(): boolean {
  return envTrue(process.env.HIPAA_MODE);
}

export function hipaaSetupStatus() {
  return {
    netlifyEnterprise: envTrue(process.env.HIPAA_NETLIFY_ENTERPRISE),
    netlifyBaaExecuted: envTrue(process.env.HIPAA_NETLIFY_BAA_EXECUTED),
    supabaseAddonEnabled: envTrue(process.env.HIPAA_SUPABASE_HIPAA_ADDON),
    supabaseBaaExecuted: envTrue(process.env.HIPAA_SUPABASE_BAA_EXECUTED),
    emailVendorApproved: envTrue(process.env.HIPAA_EMAIL_VENDOR_APPROVED),
    aiVendorApproved: envTrue(process.env.HIPAA_AI_VENDOR_APPROVED),
    openaiBaaExecuted: envTrue(process.env.HIPAA_OPENAI_BAA_EXECUTED),
    noPhIInMarketing: envTrue(process.env.HIPAA_NO_PHI_IN_MARKETING_TOOLS),
  };
}

export function hipaaMissingRequirements(service: HipaaService): string[] {
  if (!isHipaaMode()) return [];

  const status = hipaaSetupStatus();
  const missing: string[] = [];

  if ((service === "hosting" || service === "database" || service === "storage" || service === "email" || service === "ai")) {
    if (!status.netlifyEnterprise) missing.push("HIPAA_NETLIFY_ENTERPRISE=true");
    if (!status.netlifyBaaExecuted) missing.push("HIPAA_NETLIFY_BAA_EXECUTED=true");
    if (!status.noPhIInMarketing) missing.push("HIPAA_NO_PHI_IN_MARKETING_TOOLS=true");
  }

  if (service === "database" || service === "storage" || service === "ai" || service === "email") {
    if (!status.supabaseAddonEnabled) missing.push("HIPAA_SUPABASE_HIPAA_ADDON=true");
    if (!status.supabaseBaaExecuted) missing.push("HIPAA_SUPABASE_BAA_EXECUTED=true");
  }

  if (service === "email") {
    if (!status.emailVendorApproved) missing.push("HIPAA_EMAIL_VENDOR_APPROVED=true");
  }

  if (service === "ai") {
    if (!status.aiVendorApproved) missing.push("HIPAA_AI_VENDOR_APPROVED=true");
    if (!status.openaiBaaExecuted) missing.push("HIPAA_OPENAI_BAA_EXECUTED=true");
  }

  return missing;
}

export function assertHipaaReady(service: HipaaService): void {
  const missing = hipaaMissingRequirements(service);
  if (!missing.length) return;

  throw new Error(
    `HIPAA mode is enabled, but ${service} is not approved for PHI until these environment flags are set: ${missing.join(", ")}`
  );
}

export function hipaaFailureResponse(service: HipaaService) {
  const missing = hipaaMissingRequirements(service);
  return {
    error: `This ${service} feature is disabled in HIPAA mode until vendor and BAA setup is completed.`,
    missing,
  };
}
