import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AudioProvider } from "@/features/shared/audio/AudioProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "high6-play",
  description: "Weekly meeting game hub for High6 Corporation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AudioProvider>{children}</AudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
