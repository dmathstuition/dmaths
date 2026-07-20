"use client";
import Link from "next/link";
import { Icon } from "@/components/Icons";

// Print / back controls for the certificate page. Hidden when printing so
// only the certificate itself lands on the page (users "Save as PDF").
export default function CertificateActions({ backHref }: { backHref: string }) {
  return (
    <div className="no-print mx-auto mt-6 flex max-w-3xl items-center justify-center gap-3 px-4">
      <button onClick={() => window.print()} className="btn-gold inline-flex items-center gap-2 !rounded-full">
        <Icon name="download" className="h-4 w-4" /> Download / Print
      </button>
      <Link href={backHref} className="btn !rounded-full border border-line bg-white px-5 text-ink hover:bg-chalk">
        Back
      </Link>
    </div>
  );
}
