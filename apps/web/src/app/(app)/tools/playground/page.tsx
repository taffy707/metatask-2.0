"use client";

import { Suspense } from "react";
import ToolsPlaygroundInterface from "@/features/tools/playground/index";

export const dynamic = 'force-dynamic';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import React from "react";

/**
 * The /tools page.
 * Contains the list of tools the user has access to.
 */
export default function ToolsPage(): React.ReactNode {
  return (
    <>
      <Toaster />
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/tools">Tools</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Playground</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <Suspense fallback={<div className="flex h-full w-full flex-col items-center justify-center"><div className="text-lg">Loading playground...</div></div>}>
        <ToolsPlaygroundInterface />
      </Suspense>
    </>
  );
}
