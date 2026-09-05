-- 《麥擱假》 — when the current answering phase opened
--
-- The countdown is shown to every player, so it has to come from the server:
-- if each client started its own timer on render, a player who joined the
-- phase late would see a different clock from everyone else.
--
-- It is a pacing cue only. Nothing expires, nothing auto-submits, and no answer
-- is penalised for being slow (BUILD_PLAN §3 rules out speed scoring). When it
-- reaches zero the host simply gains a reason to remove someone who has left.
--
-- 倒數只是節奏提示，時間到不會自動送出或跳過；由伺服器提供，所有人看到同一個時鐘。

alter table public.rooms
  add column if not exists phase_started_at timestamptz;
