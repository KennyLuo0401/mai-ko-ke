"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { choices, demoCode, fixture, phaseLabels, phases, reactions, toggleReason, validCard, validateJoin, type Choice, type Language, type Phase } from "@/lib/client/preview";

function Arrow() { return <span aria-hidden="true">↗</span>; }

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

export function Home() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("zh-TW");
  const [tab, setTab] = useState<"join" | "host">("join");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const en = language === "en";

  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issue = validateJoin(code, nickname);
    if (issue) { setError(issue); return; }
    router.push(`/room/${demoCode}?${new URLSearchParams({ lang: language, name: nickname.trim() })}`);
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
        {tab === "join" ? <form onSubmit={join} noValidate>
          <label htmlFor="room-code">{en ? "Six-digit room code" : "六位數房號"}</label>
          <input className="code-input" id="room-code" value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }} inputMode="numeric" autoComplete="off" placeholder="000000" maxLength={6} aria-invalid={error === "format" || error === "room"} aria-describedby={error ? "join-error" : undefined} />
          <label htmlFor="nickname">{en ? "What should we call you?" : "怎麼稱呼你？"}</label>
          <input id="nickname" value={nickname} onChange={(event) => { setNickname(event.target.value); setError(null); }} placeholder={en ? "Your nickname" : "輸入你的暱稱"} maxLength={20} autoComplete="nickname" aria-invalid={error === "nickname"} aria-describedby={error ? "join-error" : undefined} />
          {error && <p id="join-error" className="error" role="alert">{error === "nickname" ? (en ? "Enter a nickname (1–20 characters)." : "請輸入 1–20 字的暱稱。") : error === "format" ? (en ? "Enter a six-digit room code." : "請輸入六位數房號。") : (en ? `This preview only supports room ${demoCode}.` : `目前預覽只支援房號 ${demoCode}。`)}</p>}
          <button className="button primary full" type="submit">{en ? "Take my seat" : "入座，開始想"}<Arrow /></button>
        </form> : <div className="host-entry"><p>{en ? "Bring everyone together. As host, you guide the conversation and let each person think for themselves." : "把朋友揪到同一桌。你負責帶大家往前走，每個人負責保留自己的想法。"}</p><div className="host-checklist"><span>01　{en ? "Share the room code" : "分享房號，讓朋友入座"}</span><span>02　{en ? "Read a discussion prompt" : "讀一則值得討論的素材"}</span><span>03　{en ? "Reveal everyone’s views" : "等大家想好，一起翻牌"}</span></div><Link className="button primary full" href={`/host/${demoCode}?lang=${language}`}>{en ? "Open a preview room" : "開啟房間預覽"}<Arrow /></Link></div>}
      </section>
    </main>
    <Footer en={en} />
  </div>;
}

export function RoomPreview({ role, roomId, initialLanguage, nickname }: { role: "host" | "player"; roomId: string; initialLanguage: Language; nickname: string }) {
  const [language, setLanguage] = useState(initialLanguage);
  const [phase, setPhase] = useState<Phase>("LOBBY");
  const [initial, setInitial] = useState<Choice | "">("");
  const [reaction, setReaction] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const en = language === "en";
  const host = role === "host";
  const phaseIndex = phases.indexOf(phase);
  const title: Record<Phase, string> = {
    LOBBY: en ? "Good conversations start here." : "人到齊，話題就開始。",
    BRIEFING_READY: en ? "Same story. Different readings." : "同一段話，不同的讀法。",
    INITIAL_VOTE: en ? "Before the others, what do you think?" : "先不管別人，你怎麼想？",
    PRIVATE_CARD: en ? "A different question changes the view." : "換個問題，風景就不同。",
    READY_TO_REVEAL: en ? "Your thoughts are safely tucked away." : "你的想法，先收好了。",
    REVEALED: en ? "Different answers. More to talk about." : "答案不同，才有得聊。",
  };
  const move = (next: Phase) => setPhase(next);

  async function copyCode() {
    try { await navigator.clipboard.writeText(demoCode); setCopied(true); setCopyFailed(false); }
    catch { setCopyFailed(true); }
  }

  if (roomId !== demoCode) return <div className="site-shell" lang={language}><Header language={language} setLanguage={setLanguage} /><main className="not-found-panel"><p className="eyebrow">ROOM NOT FOUND</p><h1>{en ? "This seat isn’t available." : "這個位子還沒開放。"}</h1><p>{en ? `Only preview room ${demoCode} is available.` : `目前只提供預覽房間 ${demoCode}。`}</p><Link href="/" className="button primary">{en ? "Back to the table" : "回到入口"}<Arrow /></Link></main></div>;

  return <div className="site-shell" lang={language}>
    <Header language={language} setLanguage={setLanguage} />
    <div className="room-topline"><Link href="/">← {en ? "Leave preview" : "離開預覽"}</Link><span className="preview-pill">{en ? "LOCAL PREVIEW · SAMPLE PLAYERS" : "本機預覽 · 玩家為示範資料"}</span><span>{host ? (en ? "HOST" : "主持人") : nickname}</span></div>
    <main className="room-layout">
      <aside className="room-sidebar">
        <div className="room-ticket"><p className="eyebrow">{en ? "OUR TABLE" : "這一桌的房號"}</p><div className="room-code">{demoCode}</div><button className="text-button" onClick={copyCode}>{copied ? (en ? "Copied" : "已複製") : (en ? "Copy room code ↗" : "複製房號 ↗")}</button>{copyFailed && <p role="alert" className="error">{en ? "Copy failed. Select the code above to copy it manually." : "複製失敗，請選取上方房號手動複製。"}</p>}</div>
        <ol className="phase-list" aria-label={en ? "Game progress" : "遊戲進度"}>{phases.map((step, index) => <li key={step} aria-current={phase === step ? "step" : undefined} className={index < phaseIndex ? "done" : ""}><span>{index < phaseIndex ? "✓" : `0${index + 1}`}</span>{phaseLabels[step][language]}</li>)}</ol>
        <div className="sidebar-note"><span aria-hidden="true">↳</span><p>{en ? "Uncertainty is a perfectly good place to start." : "不確定，\n也是很好的起點。"}</p></div>
      </aside>
      <div className="room-content">
        <div className="section-heading"><p className="eyebrow">{`0${phaseIndex + 1} / 06`}<span className="heading-separator">/</span>{phaseLabels[phase][language]}</p><h1>{title[phase]}</h1></div>
        <div aria-live="polite" className="sr-only">{phaseLabels[phase][language]}</div>
        {phase === "LOBBY" && <>
          <section className="surface lobby-surface"><div className="surface-heading"><h2>{en ? "At this table" : "這一桌的朋友"}</h2><span className="small-tag">{en ? "2 sample players" : "2 位示範玩家"}</span></div>
            <div className="player-row"><span className="avatar lime">{host ? "K" : Array.from(nickname)[0]}</span><div><strong>{host ? "Kenny" : nickname}<span className="you-tag">{!host && (en ? "YOU" : "你")}</span></strong><small>{language === "zh-TW" ? "繁體中文" : "English"}</small></div><span className="player-status"><span className="status-dot" />{en ? "Seated" : "已入座"}</span></div>
            <div className="player-row"><span className="avatar lavender">J</span><div><strong>Jamie</strong><small>English</small></div><span className="player-status"><span className="status-dot" />{en ? "Seated" : "已入座"}</span></div>
            <p className="muted">{en ? "These are sample seats, not connected devices. Live joining will arrive with the backend." : "以上為示範座位，並非已連線裝置；真實加入功能待後端串接。"}</p>
          </section>
          <section className="surface material-surface"><p className="eyebrow">{en ? "TODAY’S CONVERSATION" : "今天聊這個"}</p><h2>{fixture.question[language]}</h2><label htmlFor="source-material">{en ? "Fixed discussion material" : "固定示範素材"}</label><textarea id="source-material" readOnly rows={4} value={fixture.source[language]} /><p className="muted">{en ? "Original-text input will be connected to the material API. This preview uses a fictional example." : "貼入原文功能待素材 API 串接；此預覽使用虛構案例。"}</p>
            <button className="button primary" onClick={() => move("BRIEFING_READY")}>{host ? (en ? "Preview the briefing" : "預覽這則導讀") : (en ? "Simulate host starting" : "模擬主持人開始")}<Arrow /></button>
          </section>
        </>}
        {phase === "BRIEFING_READY" && <section className="surface briefing-surface"><span className="small-tag">{en ? "FIXED BRIEFING · NOT LIVE AI" : "固定導讀 · 非即時 AI"}</span><h2>{fixture.question[language]}</h2><p className="large-copy">{fixture.briefing[language]}</p><div className="evidence-note"><span aria-hidden="true">i</span><p>{fixture.boundary[language]}</p></div><details><summary>{en ? "Read the original text" : "看看原文"}</summary><blockquote>{fixture.source[language]}</blockquote></details><button className="button primary" onClick={() => move("INITIAL_VOTE")}>{host ? (en ? "Start initial vote preview" : "開始初答預覽") : (en ? "Simulate voting opening" : "模擬開放作答")}<Arrow /></button></section>}
        {phase === "INITIAL_VOTE" && (host ? <HostWaiting en={en} count="0 / 2" onNext={() => move("PRIVATE_CARD")} label={en ? "Simulate initial answers complete" : "模擬全員完成初答"} /> : <section className="surface"><p className="privacy-note">{en ? "PRIVATE ANSWER · REVEALED TOGETHER LATER" : "秘密作答 · 等大家一起翻牌"}</p><h2>{fixture.question[language]}</h2><fieldset className="choices"><legend>{en ? "Your initial view" : "你的初始立場"}</legend>{choices.map((choice) => <label className={`choice-card ${initial === choice.id ? "selected" : ""}`} key={choice.id}><input type="radio" name="initial" value={choice.id} checked={initial === choice.id} onChange={() => setInitial(choice.id)} /><span><strong>{choice.label[language]}</strong><small>{choice.detail[language]}</small></span><span className="choice-index" aria-hidden="true">{choice.id === "yes" ? "+" : choice.id === "no" ? "−" : "?"}</span></label>)}</fieldset><p className="muted">{en ? "Your choice is only a starting point, not a commitment." : "這只是現在的想法，不是不能改變的承諾。"}</p><button className="button primary" disabled={!initial} onClick={() => move("PRIVATE_CARD")}>{en ? "Save my view & draw a card" : "收好想法，抽一張卡"}<Arrow /></button></section>)}
        {phase === "PRIVATE_CARD" && (host ? <HostWaiting en={en} count="0 / 2" onNext={() => move("READY_TO_REVEAL")} label={en ? "Simulate card answers complete" : "模擬全員完成卡片"} /> : <>
          <section className="thinking-card"><div className="thinking-top"><span>{en ? "YOUR THINKING CARD" : "你的思考卡"}</span><span>01 / 02</span></div><div className="thinking-body"><span className="big-question" aria-hidden="true">?</span><div><p className="eyebrow">{en ? "THE MISSING PIECE" : "找出缺少的那一塊"}</p><h2>{fixture.perspective[language]}</h2><p>{fixture.prompt[language]}</p></div></div><div className="thinking-bottom">{en ? "A perspective, not an instruction to agree." : "這是一個角度，不是要你同意它。"}</div></section>
          <section className="surface"><fieldset className="reaction-options"><legend>{en ? "How does this angle affect your view?" : "這個角度，讓你怎麼想？"}</legend>{reactions.map((option) => <label key={option.id} className={`option-chip ${reaction === option.id ? "selected" : ""}`}><input type="radio" name="reaction" checked={reaction === option.id} onChange={() => setReaction(option.id)} />{option.label[language]}</label>)}</fieldset>
            <fieldset className="reason-options"><legend>{en ? "What matters most to you?" : "你最在意哪些理由？"}<small>{en ? "Choose 1–2" : "選 1–2 個"}<span aria-live="polite"> · {reasons.length}/2</span></small></legend>{fixture.reasons.map((reason) => <label key={reason.id} className={`option-chip ${reasons.includes(reason.id) ? "selected" : ""}`}><input type="checkbox" checked={reasons.includes(reason.id)} disabled={reasons.length === 2 && !reasons.includes(reason.id)} onChange={() => setReasons(toggleReason(reasons, reason.id))} />{reason.label[language]}</label>)}</fieldset>
            <button className="button primary" disabled={!validCard(reaction, reasons)} onClick={() => move("READY_TO_REVEAL")}>{en ? "Save my card response" : "收好這個角度"}<Arrow /></button>
          </section>
        </>)}
        {phase === "READY_TO_REVEAL" && <section className="surface waiting-surface"><div className="waiting-symbol" aria-hidden="true">…</div><p className="eyebrow">{en ? "A LITTLE SPACE TO THINK" : "留一點時間，給每個人的想法"}</p><h2>{host ? (en ? "Ready for the reveal preview." : "準備好預覽翻牌。") : (en ? "Saved. Let’s wait for the others." : "已收好，等朋友們想一想。")}</h2><p>{en ? "In the live game, everyone must finish before answers are revealed together." : "正式遊戲會等全員完成，才一起揭曉答案。"}</p><div className="waiting-count">{host ? "2" : "1"}<span>/ 2 {en ? "sample players ready" : "位示範玩家完成"}</span></div><button className="button primary" onClick={() => move("REVEALED")}>{en ? "Simulate everyone ready & reveal" : "模擬全員完成並翻牌"}<Arrow /></button><p className="muted">{en ? "Preview control only. Real reveal timing belongs to the server." : "此為預覽控制，真實翻牌時機由伺服器決定。"}</p></section>}
        {phase === "REVEALED" && <>
          <div className="reveal-banner"><span aria-hidden="true">↗</span><p>{en ? "Now ask each other: what brought you to that answer?" : "現在問問彼此：你是怎麼想到這個答案的？"}</p></div>
          <div className="reveal-grid"><article className="surface reveal-card"><div className="reveal-person"><span className="avatar lime">{host ? "K" : Array.from(nickname)[0]}</span><strong>{host ? "Kenny" : nickname}</strong><span className="small-tag">{en ? "MISSING CONTEXT" : "找缺口"}</span></div><p className="eyebrow">{en ? "INITIAL VIEW" : "一開始的想法"}</p><h2>{choices.find((choice) => choice.id === (initial || "uncertain"))?.label[language]}</h2><p>{reactions.find((option) => option.id === reaction)?.label[language] || (en ? "Still uncertain" : "還不確定")}</p><div className="reason-tags">{(reasons.length ? reasons : ["sample", "uncertain"]).map((id) => <span key={id}>{fixture.reasons.find((reason) => reason.id === id)?.label[language]}</span>)}</div></article>
            <article className="surface reveal-card"><div className="reveal-person"><span className="avatar lavender">J</span><strong>Jamie</strong><span className="small-tag">{en ? "PEOPLE FIRST" : "看人的感受"}</span></div><p className="eyebrow">{en ? "SAMPLE INITIAL VIEW" : "示範初始想法"}</p><h2>{en ? "Leaning yes" : "傾向是"}</h2><p>{en ? "Wellbeing is worth exploring, even if productivity is uncertain." : "即使產出還不確定，員工的感受也值得試一試。"}</p><div className="reason-tags"><span>{fixture.reasons[3].label[language]}</span></div></article></div>
          <section className="discussion-note"><span className="eyebrow">{en ? "TAKE IT OFF SCREEN" : "先把螢幕放下"}</span><h2>{en ? "Which missing detail would change your mind?" : "多知道哪件事，會讓你改變想法？"}</h2><p>{en ? "The frontend preview ends here. Final positions and the consensus map are planned for S3." : "本次前端預覽到這裡。再次表態與共識地圖預計在 S3 加入。"}</p><Link className="button secondary" href="/">{en ? "Back to the entrance" : "回到入口，再玩一次"}<Arrow /></Link></section>
        </>}
      </div>
    </main>
    <Footer en={en} />
  </div>;
}

function HostWaiting({ en, count, label, onNext }: { en: boolean; count: string; label: string; onNext: () => void }) {
  return <section className="surface waiting-surface"><p className="eyebrow">{en ? "HOST VIEW" : "主持人畫面"}</p><h2>{en ? "Give everyone a moment." : "讓每個人自己想一想。"}</h2><p>{en ? "You can see progress here. Private answers stay off this screen until reveal." : "這裡只顯示完成進度，翻牌前不呈現玩家答案。"}</p><div className="waiting-count">{count}</div><button className="button primary" onClick={onNext}>{label}<Arrow /></button></section>;
}
