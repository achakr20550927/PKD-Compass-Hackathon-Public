export function operatorEndpointsEnabled(): boolean {
  const envEntries = Object.entries(process.env);
  const raw =
    process.env.ENABLE_OPERATOR_ENDPOINTS ||
    process.env.ALLOW_OPERATOR_ENDPOINTS ||
    envEntries.find(([key]) => key.toLowerCase() === "enable_operator_endpoints")?.[1] ||
    envEntries.find(([key]) => key.toLowerCase() === "allow_operator_endpoints")?.[1] ||
    "";

  return String(raw).trim() === "1";
}

export function operatorEndpointError() {
  return { error: "Not found" };
}
