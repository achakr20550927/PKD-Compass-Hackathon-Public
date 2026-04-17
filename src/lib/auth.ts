import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(db) as any,
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await db.user.findUnique({
                    where: { email: credentials.email }
                });

                if (!user || !user.passwordHash) {
                    return null;
                }

                const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
                if (!isValid) {
                    return null;
                }
                return {
                    id: user.id,
                    email: user.email,
                    name: (user as any).name,
                };
            }
        })
    ],
    session: {
        strategy: "jwt",
        // Shorter rolling session window for better compromise resilience.
        maxAge: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // refresh every 24h
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: false, // Set to false in production
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async session({ session, token }: any) {
            if (token && session.user) {
                if (token.id) {
                    session.user.id = token.id;
                } else if (session.user.email) {
                    const dbUser = await db.user.findUnique({
                        where: { email: session.user.email },
                        select: { id: true }
                    });
                    if (dbUser?.id) {
                        session.user.id = dbUser.id;
                    }
                }
            }
            return session;
        },
        async jwt({ token, user }: any) {
            if (user) {
                token.id = user.id;
            } else if (!token.id && token.email) {
                const dbUser = await db.user.findUnique({
                    where: { email: token.email },
                    select: { id: true }
                });
                if (dbUser?.id) {
                    token.id = dbUser.id;
                }
            }
            return token;
        }
    }
};
