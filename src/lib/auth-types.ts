import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      agencyId: string;
      agencyName: string;
    };
  }

  interface User {
    role: string;
    agencyId: string;
    agencyName: string;
  }
}
