"use client";

import { redirect } from "next/navigation";

/**
 * The authenticated app root redirects to the main app experience
 */
export default function AppPage() {
  redirect("/app");
}
