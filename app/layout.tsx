import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "麥擱假 MAI KO KE — 先聊一下",
  description: "丟一則半信半疑的貼文，和朋友換個角度想。A thinking game for friends with different perspectives.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-TW"><body>{children}</body></html>;
}
