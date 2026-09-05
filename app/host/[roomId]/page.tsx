import { Room } from "@/components/game-room";

/** Knowing the URL grants nothing — the server authorizes every RoomView read. */
export default async function Page({ params, searchParams }: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const { roomId } = await params;
  const { lang } = await searchParams;
  return <Room roomId={roomId} initialLanguage={lang === "en" ? "en" : "zh-TW"} />;
}
