import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";

export async function getAnyUserId(req: Request): Promise<string | null> {
  const session = (await getServerSession(authOptions as any)) as any;
  if (session?.user?.id) return session.user.id as string;

  const mobileUser = await getMobileUserFromRequest(req);
  return mobileUser?.id ?? null;
}
