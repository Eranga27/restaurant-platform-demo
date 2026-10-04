import type { CSSProperties, ReactNode } from "react";

import { fontVariables } from "@/config/fonts";

/** The `<html>` shell shared by the site and staff root layouts. */
export function Document({
  lang,
  style,
  children,
}: {
  lang: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <html lang={lang} className={fontVariables} style={style}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
