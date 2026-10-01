import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "interviewOS — AI Interview Practice Portal",
  description: "Practice smarter with technical and behavioral mock interviews, optional voice tools, transparent feedback, and a personal progress dashboard.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
