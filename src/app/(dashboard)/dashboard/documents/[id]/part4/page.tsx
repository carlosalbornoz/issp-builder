import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, BarChart3 } from "lucide-react";

export default async function Part4Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const doc = await db.isspDocument.findFirst({
    where: { id, agencyId: session.user.agencyId },
    select: { title: true, startYear: true, endYear: true },
  });
  if (!doc) notFound();

  const years = [
    { year: 1, label: `Year 1 (${doc.startYear})`, href: `/dashboard/documents/${id}/part4/year1` },
    { year: 2, label: `Year 2 (${doc.startYear + 1})`, href: `/dashboard/documents/${id}/part4/year2` },
    { year: 3, label: `Year 3 (${doc.endYear})`, href: `/dashboard/documents/${id}/part4/year3` },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 mb-1">
          Part IV
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Resource Requirements</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Provide the 3-year budget breakdown and summary of investments for all ICT projects.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {years.map(({ year, label, href }) => (
          <Link key={year} href={href}>
            <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700 mb-2">
                  <Calendar className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{label}</CardTitle>
                <CardDescription>
                  Itemized cost breakdown by category and project
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
        <Link href={`/dashboard/documents/${id}/part4/summary`}>
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700 mb-2">
                <BarChart3 className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Summary of Investments</CardTitle>
              <CardDescription>
                Auto-calculated totals by year, fund source, and expenditure type
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" nativeButton={false} render={<a href={`/dashboard/documents/${id}/part3/f`} />}>
          ← Performance Framework
        </Button>
        <Button nativeButton={false} render={<a href={`/dashboard/documents/${id}/part4/year1`} />}>
          Start Year 1 Breakdown →
        </Button>
      </div>
    </div>
  );
}
