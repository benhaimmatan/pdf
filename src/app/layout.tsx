import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "מפצל תלושי שכר",
  description: "העלה קובץ PDF עם תלושי שכר מרובים, בחר עובדים וחודשים, והורד תלושים בודדים",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-gray-100 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
