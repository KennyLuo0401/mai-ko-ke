import { Home } from "@/components/game-room";

/**
 * `?host=<passcode>` lets the owner keep one private bookmark that opens rooms,
 * while the plain URL they hand out is join-only.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ host?: string | string[] }>;
}) {
  const { host } = await searchParams;
  return <Home initialHostKey={typeof host === "string" ? host : ""} />;
}
