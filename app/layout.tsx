import type { Metadata } from "next";
import type React from "react";
import { AuthProvider } from "@/components/app/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "JewelPack",
  description: "Stock and invoice management for jewellery businesses."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
