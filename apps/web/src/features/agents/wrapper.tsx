"use client";

import { Suspense } from "react";
import AgentsInterface from "./index";

export const dynamic = 'force-dynamic';

export default function AgentsWrapper() {
  return (
    <Suspense fallback={<div>Loading agents...</div>}>
      <AgentsInterface />
    </Suspense>
  );
}