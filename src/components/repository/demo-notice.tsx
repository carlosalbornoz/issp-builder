"use client";

import { Callout } from "@/components/ui/callout";

/**
 * The standing disclaimer on both demonstration surfaces. Every agency,
 * officer, program and figure in the corpus is invented — this notice keeps
 * the mockup honest when screenshots travel without their context.
 */
export function DemoNotice({ className }: { className?: string }) {
  return (
    <Callout variant="info" className={className}>
      <span className="font-semibold">Demonstration data.</span> Every agency, officer, program and figure on this
      page comes from a generated corpus of fictitious ISSPs — nothing here reflects a real agency or real budget
      data.
    </Callout>
  );
}
