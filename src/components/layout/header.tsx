import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

export async function Header() {
  const session = await auth();

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div />
      <div className="flex items-center gap-3">
        {session?.user && (
          <>
            <span className="text-sm text-gray-600">{session.user.email}</span>
            <Badge variant="secondary">{session.user.role}</Badge>
            <Badge variant="outline">{session.user.agencyName}</Badge>
          </>
        )}
      </div>
    </header>
  );
}
