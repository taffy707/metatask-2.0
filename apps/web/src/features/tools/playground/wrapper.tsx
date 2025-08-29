"use client";

import { Suspense } from "react";
import ToolsPlaygroundInterface from "./index";

export const dynamic = 'force-dynamic';

export default function ToolsPlaygroundWrapper() {
  return (
    <Suspense fallback={<div className="flex h-full w-full flex-col items-center justify-center"><div className="text-lg">Loading playground...</div></div>}>
      <ToolsPlaygroundInterface />
    </Suspense>
  );
}