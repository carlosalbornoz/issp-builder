"use client";

import { Suspense } from "react";
import { ExaminerBrief } from "@/components/budget/examiner-brief";

export default function ExaminerPage() {
  return (
    <Suspense fallback={null}>
      <ExaminerBrief />
    </Suspense>
  );
}
