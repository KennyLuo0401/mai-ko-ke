"use client";

/**
 * The live game screens / 正式遊戲畫面
 *
 * Keeps the visual language and copy of the frontend preview, but every phase,
 * count and reveal now comes from the server's authorized RoomView. Buttons are
 * presentation only — the backend decides what may happen next.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type {
  ConsensusStatement,
  CreateRoomResponse,
  GameState,
  JoinRoomResponse,
  MapSection,
  PublicConfig,
  RoomView,
} from "@/lib/contracts";
import { ANSWER_SECONDS, MIN_PLAYERS } from "@/lib/contracts";
import { ApiCallError, apiFetch, useRoomView } from "@/lib/client/api";
import {
  changes,
  choices,
  decisions,
  errorMessage,
  looksLikeBareLink,
  phaseTitles,
  reactions,
  sectionLabels,
  stepIndex,
  steps,
  text,
  toggleReason,
  validCard,
  validateJoin,
  type Language,
} from "@/lib/client/game-ui";
import type { Sample } from "@/lib/game/samples";

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function Header({ language, setLanguage }: { language: Language; setLanguage: (language: Language) => void }) {
  return <header className="site-header">
    <Link href="/" className="brand" aria-label="麥擱假 · Home"><span className="brand-mark" aria-hidden="true">?</span><span>麥擱假<span className="brand-en">MAI KO KE</span></span></Link>
    <div className="header-right"><span className="header-note">{language === "zh-TW" ? "先別急著下結論。" : "A little less certain. A little more curious."}</span>
      <div className="language-switch" aria-label={language === "zh-TW" ? "語言" : "Language"}>
        <button aria-pressed={language === "zh-TW"} onClick={() => setLanguage("zh-TW")}>中文</button><button aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
      </div>
    </div>
  </header>;
}

function Footer({ en }: { en: boolean }) {
  return <footer className="site-footer"><span>MAI KO KE © 2026</span><span>{en ? "Different views. Same table." : "觀點可以不同，我們還在同一桌。"}</span><span>TAIWAN FUTURE FESTIVAL</span></footer>;
}

/* -------------------------------------------------------------------------- */
/* Home / 入口                                                                */
/* -------------------------------------------------------------------------- */

export function Home({ initialHostKey = "" }: { initialHostKey?: string }) {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("zh-TW");
  const [tab, setTab] = useState<"join" | "host">("join");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [hostKey, setHostKey] = useState(initialHostKey);
  const [hostGated, setHostGated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const en = language === "en";

  // Whether this deployment gates hosting. Only the fact, never the passcode.
  useEffect(() => {
    let cancelled = false;
    apiFetch<PublicConfig>("/api/config")
      .then((config) => { if (!cancelled) setHostGated(config.hostKeyRequired); })
      .catch(() => { /* the server refuses anyway if it is gated */ });
    return () => { cancelled = true; };
  }, []);

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issue = validateJoin(code, nickname);
    if (issue) {
      setError(issue === "nickname"
        ? (en ? "Enter a nickname (1–20 characters)." : "請輸入 1–20 字的暱稱。")
        : (en ? "Enter a six-digit room code." : "請輸入六位數房號。"));
      return;
    }
    setBusy(true);
    try {
      const data = await apiFetch<JoinRoomResponse>("/api/rooms/join", {
        method: "POST",
        body: { roomCode: code.trim(), nickname: nickname.trim(), language },
      });
      router.push(`/room/${data.roomId}?lang=${language}`);
    } catch (caught) {
      setError(caught instanceof ApiCallError ? errorMessage(language, caught.code) : errorMessage(language, "internal_error"));
      setBusy(false);
    }
  }

  async function host() {
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<CreateRoomResponse>("/api/rooms", { method: "POST", body: { language, hostKey } });
      router.push(`/host/${data.roomId}?lang=${language}`);
    } catch (caught) {
      setError(caught instanceof ApiCallError ? errorMessage(language, caught.code) : errorMessage(language, "internal_error"));
      setBusy(false);
    }
  }

  return <div className="site-shell" lang={language}>
    <Header language={language} setLanguage={setLanguage} />
    <main className="home-main">
      <section className="home-intro">
        <div className="hero-quote"><span className="quote-open" aria-hidden="true">“</span><h1 className={en ? "english-headline" : undefined}>{en ? <><span>You don’t have to agree.</span><span>Just bring a reason.</span></> : <>不用想得一樣，<br />但可以多想一點。</>}</h1><span className="quote-close" aria-hidden="true">”</span></div>
        <p className="intro-copy">{en ? "Bring a questionable post. Take a position, draw a perspective, and discover how your friends think." : "丟一則讓你半信半疑的貼文。先表態、抽個角度，再看看朋友們怎麼想。"}</p>
      </section>
      <section className="entry-card" aria-label={en ? "Enter the game" : "進入遊戲"}>
        <div className="entry-card-top"><span className="eyebrow">PULL UP A CHAIR</span></div>
        <h2>{en ? "There’s a seat for you." : "留了一個位子給你。"}</h2>
        <div className="entry-tabs"><button aria-pressed={tab === "join"} onClick={() => { setTab("join"); setError(null); }}>{en ? "Join friends" : "加入朋友"}</button><button aria-pressed={tab === "host"} onClick={() => { setTab("host"); setError(null); }}>{en ? "Host a room" : "我來開房"}</button></div>
        <div className="entry-panels">
        <form className="entry-panel" data-active={tab === "join"} inert={tab !== "join"} onSubmit={join} noValidate>
          <label htmlFor="room-code">{en ? "Six-digit room code" : "六位數房號"}</label>
          <input className="code-input" id="room-code" value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }} inputMode="numeric" autoComplete="off" placeholder="000000" maxLength={6} aria-invalid={Boolean(error)} aria-describedby={error ? "join-error" : undefined} />
          <label htmlFor="nickname">{en ? "What should we call you?" : "怎麼稱呼你？"}</label>
          <input id="nickname" value={nickname} onChange={(event) => { setNickname(event.target.value); setError(null); }} placeholder={en ? "Your nickname" : "輸入你的暱稱"} maxLength={20} autoComplete="nickname" aria-invalid={Boolean(error)} aria-describedby={error ? "join-error" : undefined} />
          {error && <p id="join-error" className="error" role="alert">{error}</p>}
          <button className="button primary full" type="submit" disabled={busy}>{en ? "Take my seat" : "入座，開始想"}<Arrow /></button>
        </form><div className="host-entry entry-panel" data-active={tab === "host"} inert={tab !== "host"}><p>{en ? "Bring everyone together. As host, you guide the conversation and let each person think for themselves." : "把朋友揪到同一桌。你負責帶大家往前走，每個人負責保留自己的想法。"}</p><div className="host-checklist"><span>01　{en ? "Share the room code" : "分享房號，讓朋友入座"}</span><span>02　{en ? "Paste something worth discussing" : "貼一則值得討論的素材"}</span><span>03　{en ? "Reveal everyone’s views" : "等大家想好，一起翻牌"}</span></div>{hostGated && <>
          <label htmlFor="host-key">{en ? "Host passcode" : "主持人通行碼"}</label>
          <input id="host-key" type="password" value={hostKey} onChange={(event) => { setHostKey(event.target.value); setError(null); }} placeholder={en ? "Ask whoever set this up" : "向主辦者索取"} autoComplete="off" />
          <p className="preview-hint">{en ? "Only the organiser opens rooms. Everyone else joins with a room code." : "只有主辦者能開房，其他人用房號加入。"}</p>
        </>}
        {error && <p className="error" role="alert">{error}</p>}<button className="button primary full" onClick={host} disabled={busy || (hostGated && !hostKey.trim())}>{en ? "Open a room" : "開一間房"}<Arrow /></button></div>
        </div>
      </section>
    </main>
    <Footer en={en} />
  </div>;
}

/* -------------------------------------------------------------------------- */
/* Room / 房間                                                                */
/* -------------------------------------------------------------------------- */

export function Room({ roomId, initialLanguage }: { roomId: string; initialLanguage: Language }) {
  const { view, error, apply } = useRoomView(roomId);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [initial, setInitial] = useState("");
  const [reaction, setReaction] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [change, setChange] = useState("");
  const [finalChoice, setFinalChoice] = useState("");
  const [comment, setComment] = useState("");
  const [source, setSource] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const en = language === "en";
  const bareLink = looksLikeBareLink(source);
  const [samples, setSamples] = useState<Sample[]>([]);

  // Ticks only while a phase is waiting on answers, to drive the countdown.
  const [now, setNow] = useState(() => Date.now());
  const phaseStartedAt = view?.phaseStartedAt;
  useEffect(() => {
    if (!phaseStartedAt) return;
    // The interval is the only writer: setting state synchronously here would
    // cascade a render on every phase change for no benefit.
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [phaseStartedAt]);

  // Ready-made material, so a host never has to type a paragraph on stage.
  useEffect(() => {
    let cancelled = false;
    apiFetch<Sample[]>("/api/samples")
      .then((loaded) => { if (!cancelled) setSamples(loaded); })
      .catch(() => { /* samples are a convenience; the textarea still works */ });
    return () => { cancelled = true; };
  }, []);

  async function call(path: string, body?: unknown) {
    setBusy(true);
    setActionError(null);
    try {
      apply(await apiFetch<RoomView>(path, { method: "POST", body }));
    } catch (caught) {
      setActionError(caught instanceof ApiCallError ? errorMessage(language, caught.code) : errorMessage(language, "internal_error"));
    } finally {
      setBusy(false);
    }
  }

  const advance = (expectedState: GameState, action: string) => call(`/api/rooms/${roomId}/advance`, { expectedState, action });
  const answer = (body: unknown) => call(`/api/rooms/${roomId}/responses`, body);

  if (error && !view) {
    return <div className="site-shell" lang={language}><Header language={language} setLanguage={setLanguage} /><main className="not-found-panel"><p className="eyebrow">ROOM NOT FOUND</p><h1>{en ? "This seat isn’t available." : "這個位子還沒開放。"}</h1><p>{errorMessage(language, error.code)}</p><Link href="/" className="button primary">{en ? "Back to the table" : "回到入口"}<Arrow /></Link></main><Footer en={en} /></div>;
  }
  if (!view) {
    return <div className="site-shell" lang={language}><Header language={language} setLanguage={setLanguage} /><main className="not-found-panel"><p className="eyebrow">…</p><h1>{en ? "Finding your table." : "正在找你的位子。"}</h1></main></div>;
  }

  const host = view.role === "host";
  const index = stepIndex(view.state);
  const reasonIds = (view.reasons ?? []).map((reason) => reason.id);
  const mine = view.myResponses;
  const waitingLabel = `${view.completion.done} / ${view.completion.required}`;
  const secondsLeft = view.phaseStartedAt
    ? Math.max(0, ANSWER_SECONDS - Math.floor((now - view.phaseStartedAt) / 1000))
    : null;
  const removePlayer = (playerId: string) =>
    call(`/api/rooms/${roomId}/remove-player`, { playerId });
  // Publishing is only legal once every player has responded to every line, so
  // the control stays disabled until then rather than failing on click.
  const everyoneVoted =
    (view.consensusStatements ?? []).length > 0 &&
    view.consensusStatements!.every(
      (statement) =>
        (view.consensusProgress?.[statement.id] ?? 0) >= view.requiredPlayerIds.length,
    );

  return <div className="site-shell" lang={language}>
    <Header language={language} setLanguage={setLanguage} />
    <div className="room-topline"><Link href="/">← {en ? "Leave the room" : "離開房間"}</Link>{/* Reported by the server, so it cannot drift when the adapter is switched.
          The live case says nothing: a badge is only worth the space when it is
          warning you that every room gets the same briefing. */}
      {view.analysis === "fixture"
        ? <span className="preview-pill">{en ? "FIXTURE BRIEFING · SAME FOR EVERY POST" : "固定導讀 · 每則貼文都相同"}</span>
        : <span />}<span>{host ? (en ? "HOST" : "主持人") : view.players.find((player) => player.playerId === view.playerId)?.nickname}</span></div>
    <main className="room-layout">
      <aside className="room-sidebar">
        <div className="room-ticket"><p className="eyebrow">{en ? "OUR TABLE" : "這一桌的房號"}</p><div className="room-code">{view.roomCode}</div><button className="text-button" onClick={() => { void navigator.clipboard?.writeText(view.roomCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? (en ? "Copied" : "已複製") : (en ? "Copy room code ↗" : "複製房號 ↗")}</button></div>
        <ol className="phase-list" aria-label={en ? "Game progress" : "遊戲進度"}>{steps.map((step, position) => <li key={step.state} aria-current={position === index ? "step" : undefined} className={position < index ? "done" : ""}><span>{position < index ? "✓" : `0${position + 1}`}</span>{text(language, step.label)}</li>)}</ol>
        <div className="sidebar-note"><span aria-hidden="true">↳</span><p>{en ? "Uncertainty is a perfectly good place to start." : "不確定，\n也是很好的起點。"}</p></div>
      </aside>
      <div className="room-content">
        <div className="section-heading"><p className="eyebrow">{`0${index + 1} / 0${steps.length}`}<span className="heading-separator">/</span>{text(language, steps[index].label)}</p><h1>{text(language, phaseTitles[view.state])}</h1></div>
        <div aria-live="polite" className="sr-only">{text(language, steps[index].label)}</div>

        {/* Lobby — roster for everyone, material form for the host. */}
        {(view.state === "LOBBY" || view.state === "MATERIAL_SUBMITTED") && <>
          <section className="surface lobby-surface"><div className="surface-heading"><h2>{en ? "At this table" : "這一桌的朋友"}</h2><span className="small-tag">{view.players.length} {en ? "seated" : "位已入座"}</span></div>
            {view.players.length === 0 ? <p className="muted">{en ? "Nobody has taken a seat yet. Share the room code." : "還沒有人入座，把房號分享出去吧。"}</p> : view.players.map((player, position) => <div className="player-row" key={player.playerId}><span className={`avatar ${position % 2 === 0 ? "lime" : "lavender"}`}>{Array.from(player.nickname)[0]}</span><div><strong>{player.nickname}{player.playerId === view.playerId && <span className="you-tag">{en ? "YOU" : "你"}</span>}</strong><small>{player.language === "zh-TW" ? "繁體中文" : "English"}</small></div><span className="player-status"><span className="status-dot" />{en ? "Seated" : "已入座"}</span></div>)}
            {host && view.players.length < MIN_PLAYERS && <p className="muted">{en ? `At least ${MIN_PLAYERS} players are needed before you can start.` : `至少要 ${MIN_PLAYERS} 位玩家才能開始。`}</p>}
          </section>
          {host ? <section className="surface material-surface"><p className="eyebrow">{en ? "TODAY’S CONVERSATION" : "今天聊這個"}</p><h2>{en ? "What made you pause?" : "什麼讓你停下來？"}</h2>
            {view.processing?.kind === "analysis" && view.processing.status === "pending"
              ? <div className="waiting-surface"><div className="waiting-symbol" aria-hidden="true">…</div><p>{en ? "Reading it over…" : "正在讀這段話…"}</p></div>
              : <>
                <label htmlFor="source-material">{en ? "Paste the original text — not a link" : "貼上原文，不是連結"}</label>
                <textarea id="source-material" rows={5} value={source} onChange={(event) => setSource(event.target.value)} placeholder={en ? "Paste the words themselves — a post, message or article…" : "直接貼上文字內容：貼文、訊息或文章…"} />
                {bareLink && <p className="error" role="alert">{en ? "That looks like just a link. 麥擱假 can’t open links, so there would be nothing to read together — paste the words themselves." : "這看起來只有連結。麥擱假 沒辦法打開連結，這樣大家就沒有東西可以一起讀——請把文字內容貼上來。"}</p>}
                <label htmlFor="host-question">{en ? "What do you want to ask the table? (optional)" : "你想問大家什麼？（選填）"}</label>
                <input id="host-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={en ? "e.g. Is this worth believing?" : "例如：這則訊息值得相信嗎？"} maxLength={280} />
                <p className="muted">{en ? "The original stays on screen beside the briefing, so everyone can check the framing." : "原文會和導讀並列，讓大家自己核對。"}</p>
                {samples.length > 0 && <div className="sample-row">
                  <span className="sample-label">{en ? "Nothing to hand? Start from one of these:" : "沒有素材？從這幾則開始："}</span>
                  <div className="sample-chips">{samples.map((sample) => <button key={sample.id} type="button" className="sample-chip" disabled={busy} onClick={() => { setSource(text(language, sample.text)); setQuestion(text(language, sample.question)); }}>{text(language, sample.label)}</button>)}</div>
                </div>}
                <div className="host-actions">
                  <button className="button primary" disabled={busy || !source.trim() || bareLink} onClick={() => call(`/api/rooms/${roomId}/material`, { sourceText: source, hostQuestion: question })}>{en ? "Write the briefing" : "產生中立導讀"}<Arrow /></button>
                </div>
                {view.processing?.status === "failed" && <p className="error" role="alert">{errorMessage(language, view.processing.code ?? "analysis_failed")}</p>}
              </>}
          </section> : <section className="surface waiting-surface"><div className="waiting-symbol" aria-hidden="true">…</div><p className="eyebrow">{en ? "HOLD ON A MOMENT" : "稍等一下"}</p><h2>{en ? "The host is choosing something to discuss." : "主持人正在挑今天的素材。"}</h2></section>}
        </>}

        {/* Briefing — the original sits beside it so framing stays checkable. */}
        {view.state === "BRIEFING_READY" && <section className="surface briefing-surface"><span className="small-tag">{en ? "NEUTRAL BRIEFING · NOT A VERDICT" : "中立導讀 · 不判斷真假"}</span>
          {view.material?.hostQuestion && <h2>{view.material.hostQuestion}</h2>}
          <p className="large-copy">{view.briefing && text(language, view.briefing)}</p>
          {view.claims?.map((claim) => <div className="evidence-note" key={claim.id}><span aria-hidden="true">i</span><p><strong>{text(language, claim.text)}</strong><br />{text(language, claim.evidenceBoundary)}</p></div>)}
          {view.material && <details><summary>{en ? "Read the original text" : "看看原文"}</summary><blockquote>{view.material.sourceText}</blockquote></details>}
          {host ? <>
            <button className="button primary" disabled={busy || view.players.length < MIN_PLAYERS} onClick={() => advance("BRIEFING_READY", "start_initial_vote")}>{en ? "Open private answers" : "開始秘密作答"}<Arrow /></button>
            {/* A disabled control with no reason beside it stalls a live game. */}
            {view.players.length < MIN_PLAYERS && <p className="muted" style={{ marginTop: "12px" }}>{en ? `Waiting for ${MIN_PLAYERS - view.players.length} more player${MIN_PLAYERS - view.players.length === 1 ? "" : "s"} — share room code ${view.roomCode}.` : `還差 ${MIN_PLAYERS - view.players.length} 位玩家，把房號 ${view.roomCode} 分享出去。`}</p>}
          </> : <p className="muted">{en ? "Waiting for the host to open answering." : "等主持人開放作答。"}</p>}
        </section>}

        {/* Initial vote — host sees only counts, never answers. */}
        {view.state === "INITIAL_VOTE" && (host
          ? <HostWaiting en={en} view={view} secondsLeft={secondsLeft} busy={busy} onRemove={removePlayer} />
          : mine?.initial
            ? <Saved en={en} count={waitingLabel} secondsLeft={secondsLeft} />
            : <section className="surface"><p className="privacy-note">{en ? "PRIVATE ANSWER · REVEALED TOGETHER LATER" : "秘密作答 · 等大家一起翻牌"}</p>
              {view.material?.hostQuestion && <h2>{view.material.hostQuestion}</h2>}
              <fieldset className="choices"><legend>{en ? "Your initial view" : "你的初始立場"}</legend>{choices.map((choice) => <label className={`choice-card ${initial === choice.id ? "selected" : ""}`} key={choice.id}><input type="radio" name="initial" value={choice.id} checked={initial === choice.id} onChange={() => setInitial(choice.id)} /><span><strong>{text(language, choice.label)}</strong><small>{text(language, choice.detail)}</small></span><span className="choice-index" aria-hidden="true">{choice.id === "yes" ? "+" : choice.id === "no" ? "−" : "?"}</span></label>)}</fieldset>
              <p className="muted">{en ? "Your choice is only a starting point, not a commitment." : "這只是現在的想法，不是不能改變的承諾。"}</p>
              <button className="button primary" disabled={busy || !initial} onClick={() => answer({ stage: "initial", initialChoice: initial })}>{en ? "Save my view & draw a card" : "收好想法，抽一張卡"}<Arrow /></button>
            </section>)}

        {/* Private card — each player was dealt a different angle. */}
        {view.state === "PRIVATE_CARD" && (host
          ? <HostWaiting en={en} view={view} secondsLeft={secondsLeft} busy={busy} onRemove={removePlayer} />
          : mine?.card
            ? <Saved en={en} count={waitingLabel} secondsLeft={secondsLeft} />
            : <>
              {view.myCard && <section className="thinking-card"><div className="thinking-top"><span>{en ? "YOUR THINKING CARD" : "你的思考卡"}</span><span>{en ? "YOURS ALONE" : "只有你拿到"}</span></div><div className="thinking-body"><span className="big-question" aria-hidden="true">?</span><div><p className="eyebrow">{en ? "A DIFFERENT ANGLE" : "換一個角度"}</p><h2>{text(language, view.myCard.perspective)}</h2><p>{text(language, view.myCard.prompt)}</p></div></div><div className="thinking-bottom">{en ? "A perspective, not an instruction to agree." : "這是一個角度，不是要你同意它。"}</div></section>}
              <section className="surface">
                <fieldset className="reaction-options"><legend>{en ? "How does this angle affect your view?" : "這個角度，讓你怎麼想？"}</legend>{reactions.map((option) => <label key={option.id} className={`option-chip ${reaction === option.id ? "selected" : ""}`}><input type="radio" name="reaction" checked={reaction === option.id} onChange={() => setReaction(option.id)} />{text(language, option.label)}</label>)}</fieldset>
                <fieldset className="reason-options"><legend>{en ? "What matters most to you?" : "你最在意哪些理由？"}<small>{en ? "Choose 1–2" : "選 1–2 個"}<span aria-live="polite"> · {reasons.length}/2</span></small></legend>{(view.reasons ?? []).map((reason) => <label key={reason.id} className={`option-chip ${reasons.includes(reason.id) ? "selected" : ""}`}><input type="checkbox" checked={reasons.includes(reason.id)} disabled={reasons.length === 2 && !reasons.includes(reason.id)} onChange={() => setReasons(toggleReason(reasons, reason.id, reasonIds))} />{text(language, reason.label)}</label>)}</fieldset>
                <button className="button primary" disabled={busy || !validCard(reaction, reasons, reasonIds)} onClick={() => answer({ stage: "card", reactionChoice: reaction, reasonIds: reasons })}>{en ? "Save my card response" : "收好這個角度"}<Arrow /></button>
              </section>
            </>)}

        {view.state === "READY_TO_REVEAL" && <Saved en={en} count={waitingLabel} secondsLeft={secondsLeft} />}

        {/* Reveal and discussion both show everyone's reasoning. */}
        {(view.state === "REVEALED" || view.state === "IN_PERSON_DISCUSSION") && <>
          {view.state === "REVEALED" && <div className="reveal-banner"><span aria-hidden="true">↗</span><p>{en ? "Now ask each other: what brought you to that answer?" : "現在問問彼此：你是怎麼想到這個答案的？"}</p></div>}
          <div className="reveal-grid">{view.reveal?.map((entry, position) => <article className="surface reveal-card" key={entry.playerId}>
            <div className="reveal-person"><span className={`avatar ${position % 2 === 0 ? "lime" : "lavender"}`}>{Array.from(entry.nickname)[0]}</span><strong>{entry.nickname}{entry.playerId === view.playerId && <span className="you-tag">{en ? "YOU" : "你"}</span>}</strong><span className="small-tag">{text(language, entry.cardPerspective)}</span></div>
            <p className="eyebrow">{en ? "INITIAL VIEW" : "一開始的想法"}</p>
            <h2>{text(language, choices.find((choice) => choice.id === entry.initialChoice)!.label)}</h2>
            <p>{text(language, reactions.find((option) => option.id === entry.reactionChoice)!.label)}</p>
            <div className="reason-tags">{entry.reasonIds.map((id) => <span key={id}>{text(language, view.reasons!.find((reason) => reason.id === id)!.label)}</span>)}</div>
          </article>)}</div>
          <section className="discussion-note"><span className="eyebrow">{en ? "TAKE IT OFF SCREEN" : "先把螢幕放下"}</span><h2>{en ? "Which missing detail would change your mind?" : "多知道哪件事，會讓你改變想法？"}</h2><p>{en ? "Talk it through together. Nothing here is scored." : "一起聊聊，這裡不計分。"}</p>
            {host && <button className="button primary" disabled={busy} onClick={() => view.state === "REVEALED" ? advance("REVEALED", "start_discussion") : advance("IN_PERSON_DISCUSSION", "start_final_vote")}>{view.state === "REVEALED" ? (en ? "Start the discussion" : "開始面對面討論") : (en ? "Ask for final positions" : "開始最終表態")}<Arrow /></button>}
          </section>
        </>}

        {/* Final position — the one optional comment lives here. */}
        {view.state === "FINAL_VOTE" && (host
          ? <>
            <HostWaiting en={en} view={view} secondsLeft={secondsLeft} busy={busy} onRemove={removePlayer} drafting={view.processing?.kind === "consensus" && view.processing.status === "pending"} />
            {view.processing?.status === "failed" && <section className="surface"><p className="error" role="alert">{errorMessage(language, view.processing.code ?? "consensus_failed")}</p><button className="button primary" disabled={busy} onClick={() => call(`/api/rooms/${roomId}/retry-consensus`)}>{en ? "Try again" : "再試一次"}<Arrow /></button></section>}
          </>
          : mine?.final
            ? <Saved en={en} count={waitingLabel} secondsLeft={secondsLeft} />
            : <section className="surface">
              <fieldset className="reaction-options"><legend>{en ? "Did your view move?" : "你的看法有變化嗎？"}</legend>{changes.map((option) => <label key={option.id} className={`option-chip ${change === option.id ? "selected" : ""}`}><input type="radio" name="change" checked={change === option.id} onChange={() => setChange(option.id)} />{text(language, option.label)}</label>)}</fieldset>
              <fieldset className="choices"><legend>{en ? "Where do you land now?" : "現在你的判斷是？"}</legend>{choices.map((choice) => <label className={`choice-card ${finalChoice === choice.id ? "selected" : ""}`} key={choice.id}><input type="radio" name="final" checked={finalChoice === choice.id} onChange={() => setFinalChoice(choice.id)} /><span><strong>{text(language, choice.label)}</strong><small>{text(language, choice.detail)}</small></span><span className="choice-index" aria-hidden="true">{choice.id === "yes" ? "+" : choice.id === "no" ? "−" : "?"}</span></label>)}</fieldset>
              <label htmlFor="comment">{en ? "Anything to add? (optional)" : "想補充一句嗎？（選填）"}</label>
              <input id="comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={280} placeholder={en ? "One short sentence" : "一句話就好"} />
              <button className="button primary" disabled={busy || !change || !finalChoice} onClick={() => answer({ stage: "final", changeChoice: change, finalChoice, ...(comment.trim() ? { comment: comment.trim() } : {}) })}>{en ? "Save my final position" : "送出最終想法"}<Arrow /></button>
            </section>)}

        {/* Consensus review — players approve; the model never approves itself. */}
        {view.state === "CONSENSUS_REVIEW" && <section className="surface"><span className="small-tag">{en ? "DRAFTED FOR YOU TO JUDGE" : "草稿由你們決定"}</span><h2>{en ? "Only what everyone signs becomes “we agree”." : "只有大家都同意的，才會進入「我們都同意」。"}</h2>
          <ul className="statement-list">{(view.consensusStatements ?? []).map((statement: ConsensusStatement) => <li className="statement" key={statement.id}>
            <p>{text(language, statement.text)}</p>
            {host
              ? <span className="statement-count">{view.consensusProgress?.[statement.id] ?? 0} / {view.requiredPlayerIds.length} {en ? "voted" : "已表態"}</span>
              : <div className="statement-actions">{decisions.map((decision) => <button key={decision.id} className={`option-chip ${view.myConsensusVotes?.[statement.id] === decision.id ? "selected" : ""}`} disabled={busy} onClick={() => call(`/api/rooms/${roomId}/consensus-votes`, { statementId: statement.id, decision: decision.id })}>{text(language, decision.label)}</button>)}</div>}
          </li>)}</ul>
          {host && <><p className="muted">{everyoneVoted ? (en ? "Everyone has responded. You can publish the map." : "所有玩家都表態了，可以發布地圖。") : (en ? "Everyone must respond to every line before you can publish." : "所有玩家都對每一則表態後，才能發布。")}</p><button className="button primary" disabled={busy || !everyoneVoted} onClick={() => advance("CONSENSUS_REVIEW", "publish")}>{en ? "Publish the map" : "發布共識地圖"}<Arrow /></button></>}
        </section>}

        {/* The map — disagreement is kept, not resolved away. */}
        {view.state === "COMPLETED" && <>
          {/* The summary is the conclusion; the statements are its evidence. */}
          {view.mapSummary && <section className="outcome">
            <p className="eyebrow">{en ? "WHERE YOU GOT TO" : "這一桌談到哪裡"}</p>
            <p className="outcome__text">{text(language, view.mapSummary)}</p>
          </section>}
          <MapSections view={view} language={language} collapsed={Boolean(view.mapSummary)} en={en} />
          <section className="discussion-note"><h2>{en ? "Consensus isn’t everyone agreeing." : "凝聚共識，不是大家想得一樣。"}</h2><p>{en ? "It’s knowing what you already agree on, what you still don’t, and what evidence is missing." : "而是知道我們已經同意什麼、還不同意什麼，以及還缺少什麼證據。"}</p><Link className="button secondary" href="/">{en ? "Back to the entrance" : "回到入口，再玩一次"}<Arrow /></Link></section>
        </>}

        {actionError && <p className="error" role="alert">{actionError}</p>}
      </div>
    </main>
    <Footer en={en} />
  </div>;
}

/**
 * The four map sections. Tucked behind a disclosure once a summary exists —
 * a wall of voted bullet points reads as a pile of fragments, not a conclusion.
 */
function MapSections({ view, language, collapsed, en }: {
  view: RoomView;
  language: Language;
  collapsed: boolean;
  en: boolean;
}) {
  const sections = (["we_agree", "we_differ", "missing_evidence", "uncertainty"] as MapSection[])
    .map((section) => ({
      section,
      items: (view.map ?? []).filter((entry) => entry.section === section),
    }))
    .filter((group) => group.items.length > 0);

  const body = sections.map(({ section, items }) => (
    <section className={`map-section map-${section}`} key={section}>
      <h3>{text(language, sectionLabels[section])}</h3>
      <ul>{items.map((entry) => <li key={entry.id}>
        {text(language, entry.text)}
        {/* Tallies only where they explain something: a split vote. */}
        {section === "we_differ" && entry.tally.agree > 0 && <span className="statement-count"> — {en ? `${entry.tally.agree} agreed, ${entry.tally.needs_revision + entry.tally.disagree} did not` : `${entry.tally.agree} 人同意，${entry.tally.needs_revision + entry.tally.disagree} 人沒有`}</span>}
      </li>)}</ul>
    </section>
  ));

  if (!collapsed) return <>{body}</>;
  return <details className="map-detail">
    <summary>{en ? "See every statement behind this" : "看看背後的每一則敘述"}</summary>
    <div className="map-detail__body">{body}</div>
  </details>;
}

function Clock({ en, secondsLeft }: { en: boolean; secondsLeft: number | null }) {
  if (secondsLeft === null) return null;
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");
  // Zero is not a deadline: nothing is submitted or skipped on its behalf.
  return <div className={`phase-clock${secondsLeft === 0 ? " phase-clock--over" : ""}`}>
    <span className="phase-clock__time">{mm}:{ss}</span>
    <span className="phase-clock__note">{secondsLeft === 0
      ? (en ? "Over the suggested minute — no rush, nothing expires." : "超過建議的一分鐘了，但不會自動送出，慢慢想沒關係。")
      : (en ? "Suggested time for this question" : "這一題的建議時間")}</span>
  </div>;
}

/**
 * The host waits, but never blindly: they can see exactly who is still thinking,
 * and remove someone who has actually left. Answers themselves stay hidden.
 */
function HostWaiting({ en, view, secondsLeft, busy, onRemove, drafting }: {
  en: boolean;
  view: RoomView;
  secondsLeft: number | null;
  busy: boolean;
  onRemove: (playerId: string) => void;
  drafting?: boolean;
}) {
  const roster = view.players.filter((player) => view.requiredPlayerIds.includes(player.playerId));
  return <section className="surface waiting-surface">
    <p className="eyebrow">{en ? "HOST VIEW" : "主持人畫面"}</p>
    <h2>{drafting ? (en ? "Gathering everyone’s reasoning…" : "正在整理大家的想法…") : (en ? "Give everyone a moment." : "讓每個人自己想一想。")}</h2>
    <p>{en ? "Who has finished — never what they answered." : "只顯示誰完成了，不顯示答案內容。"}</p>
    <div className="waiting-count">{drafting ? "…" : `${view.completion.done} / ${view.completion.required}`}</div>
    {!drafting && <Clock en={en} secondsLeft={secondsLeft} />}
    {!drafting && <ul className="wait-roster">{roster.map((player) => <li key={player.playerId} className={player.done ? "is-done" : ""}>
      <span className="wait-roster__tick" aria-hidden="true">{player.done ? "✓" : "…"}</span>
      <span className="wait-roster__name">{player.nickname}</span>
      <span className="wait-roster__state">{player.done ? (en ? "Answered" : "已作答") : (en ? "Still thinking" : "還在想")}</span>
      {!player.done && <button type="button" className="wait-roster__remove" disabled={busy} onClick={() => onRemove(player.playerId)}>{en ? "Remove" : "移除"}</button>}
    </li>)}</ul>}
    {!drafting && secondsLeft === 0 && view.completion.done < view.completion.required &&
      <p className="muted">{en ? "If someone has actually left, remove them and the round continues without their answer." : "如果有人真的離開了，移除他，這一局就能繼續。"}</p>}
  </section>;
}

function Saved({ en, count, secondsLeft }: { en: boolean; count: string; secondsLeft: number | null }) {
  return <section className="surface waiting-surface"><div className="waiting-symbol" aria-hidden="true">…</div><p className="eyebrow">{en ? "A LITTLE SPACE TO THINK" : "留一點時間，給每個人的想法"}</p><h2>{en ? "Saved. Let’s wait for the others." : "已收好，等朋友們想一想。"}</h2><p>{en ? "Everyone must finish before answers are revealed together." : "等全員完成，才會一起揭曉答案。"}</p><div className="waiting-count">{count}<span>{en ? "ready" : "位完成"}</span></div><Clock en={en} secondsLeft={secondsLeft} /></section>;
}
