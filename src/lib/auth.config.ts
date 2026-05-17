import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// This config is safe for Edge runtime (no database dependency)
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Dynamic import to avoid loading DB in Edge
        const { db } = await import("./db");
        const { compare } = await import("bcryptjs");

        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          include: { agency: true },
        });

        if (!user) return null;

        const isValid = await compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          agencyId: user.agencyId,
          agencyName: user.agency.acronym,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & { role: string; agencyId: string; agencyName: string };
        token.id = u.id;
        token.role = u.role;
        token.agencyId = u.agencyId;
        token.agencyName = u.agencyName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.agencyId = token.agencyId as string;
        session.user.agencyName = token.agencyName as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
