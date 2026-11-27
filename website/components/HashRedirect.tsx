"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HashRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash) return;

    // Handle Flutter Web style hash routing e.g. /#/scan/TAG123 or /#/qr/TAG123
    const scanMatch = hash.match(/^#\/?scan\/([^/?#]+)/i);
    if (scanMatch && scanMatch[1]) {
      window.location.replace(`/scan/${scanMatch[1]}`);
      return;
    }

    const qrMatch = hash.match(/^#\/?qr\/([^/?#]+)/i);
    if (qrMatch && qrMatch[1]) {
      window.location.replace(`/scan/${qrMatch[1]}`);
      return;
    }
  }, [router]);

  return null;
}
