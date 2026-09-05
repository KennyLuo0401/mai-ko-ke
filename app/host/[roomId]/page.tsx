import { RoomPreview } from "@/components/game-preview";

export default async function Page({ params, searchParams }: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const { roomId } = await params;
  const { lang } = await searchParams;
  return <RoomPreview role="host" roomId={roomId} initialLanguage={lang === "en" ? "en" : "zh-TW"} nickname="Kenny" />;
}
