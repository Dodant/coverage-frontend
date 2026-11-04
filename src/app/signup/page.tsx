import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Join" };
export default function Page() {
  return <Suspense><SignupForm /></Suspense>;
}
