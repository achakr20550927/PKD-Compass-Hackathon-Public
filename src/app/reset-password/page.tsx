export const dynamic = "force-dynamic";

import ResetPasswordClient from "./ResetPasswordClient";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const params = await searchParams;
  const email = (params?.email ?? "").toString();
  const token = (params?.token ?? "").toString();
  return <ResetPasswordClient email={email} token={token} />;
}
