"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/** Opens the print dialog once the ticket has rendered, with a button to print again. */
export function AutoPrint() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Button type="button" className="no-print" onClick={() => window.print()}>
      <Printer data-icon="inline-start" aria-hidden />
      Print
    </Button>
  );
}
