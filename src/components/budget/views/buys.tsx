"use client";

/**
 * Expenditure by category: where the selection's proposed investment goes,
 * by DICT expense category (B.4).
 */

import { BarList } from "@/components/dataviz/charts";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import { phpCompact } from "@/lib/utils";
import { SCREENS } from "../nav";
import { Panel, ViewHeader, ViewProps, pct } from "./shared";

const categoryNameById = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c.name]));

export function BuysView({ lines, fy }: ViewProps) {
  const scope: typeof lines = fy === "all" ? lines : lines.filter((l) => l.year === fy);
  const total = scope.reduce((s, l) => s + l.total, 0);
  const byCategory = new Map<string, number>();
  scope.forEach((l) => byCategory.set(l.categoryId || "uncategorized", (byCategory.get(l.categoryId || "uncategorized") ?? 0) + l.total));
  const categories = [...byCategory.entries()]
    .map(([id, v]) => ({ id, name: id === "uncategorized" ? "Uncategorized" : categoryNameById.get(id) ?? id, total: v }))
    .sort((x, y) => y.total - x.total);
  const top3 = categories.slice(0, 3).reduce((s, c) => s + c.total, 0);
  const insights: React.ReactNode[] = [
    top3 > 0 && total > 0 ? (
      <span key="top3">
        <strong>The three largest categories account for {pct(top3, total)} of the request</strong>, led by{" "}
        {categories[0]?.name ?? ""}.
      </span>
    ) : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <ViewHeader title={SCREENS.buys.label} lede={SCREENS.buys.summary} insights={insights} />
      <Panel title="DICT expense categories" sub="Part IV B.4 · ten largest">
        <BarList
          items={[
            ...categories.slice(0, 10).map((c) => ({
              key: c.id,
              label: c.name,
              value: c.total,
            })),
            ...(categories.length > 10
              ? [
                  {
                    key: "__other",
                    label: `Other ${categories.length - 10} categories`,
                    value: categories.slice(10).reduce((s, c) => s + c.total, 0),
                    color: "var(--muted-foreground)",
                  },
                ]
              : []),
          ]}
          total={categories.reduce((s, c) => s + c.total, 0)}
          format={phpCompact}
        />
      </Panel>
    </div>
  );
}
