-- 《麥擱假》 — the closing summary shown above the consensus map
--
-- Written after publication, when the votes are known, so it can say what the
-- table actually concluded rather than what was merely proposed. Best-effort:
-- a room publishes with or without it, because the map is the record and the
-- summary is the reading of it.
--
-- 於發布後產生，屆時票數已確定；若產生失敗仍可發布，地圖才是正式紀錄。

alter table public.rooms
  add column if not exists map_summary jsonb;
