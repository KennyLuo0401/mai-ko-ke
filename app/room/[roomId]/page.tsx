import { RoomPreview } from "@/components/game-preview";

export default async function Page({ params, searchParams }: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ lang?: string | string[]; name?: string | string[] }>;
}) {
  const { roomId } = await params;
  const { lang, name } = await searchParams;
  return <RoomPreview role="player" roomId={roomId} initialLanguage={lang === "en" ? "en" : "zh-TW"} nickname={typeof name === "string" ? name.trim().slice(0, 20) || "Kenny" : "Kenny"} />;
}
