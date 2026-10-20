import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { RepositoryBrowser } from "@/components/repository/repository-browser";

export const metadata: Metadata = pageMetadata({
  title: "Public ISSP Repository — demonstration preview",
  description:
    "A centralized, searchable archive of agency ISSPs as structured data. Demonstration preview with a fictitious corpus — no real agency data.",
  path: "/repository",
});

export default function RepositoryPage() {
  return <RepositoryBrowser />;
}
