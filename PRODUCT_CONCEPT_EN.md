# 《麥擱假》 — Product Concept

## One-line Pitch

**An AI-facilitated social thinking game that turns questionable online content into a short, meaningful conversation among friends.**

## Problem

Online discussions are increasingly polarized. Media framing, recommendation algorithms, selective exposure, and social identity can keep people inside echo chambers. When people encounter a questionable post, they often react, repost, or argue before examining why they believe or distrust it.

The problem is not only a lack of facts. People also lack an easy and enjoyable way to think through information together.

## Solution

A host submits a social post, article, screenshot, or link that raises doubts. AI reads the material, explains it in plain language, and gives each player a different thinking card. Players form their views independently, reveal them together, and discuss why they reached different conclusions.

```text
Submit content
    ↓
AI provides a neutral briefing
    ↓
Players make a private first judgment
    ↓
AI guides each player through a different perspective
    ↓
Everyone reveals their views together
    ↓
Friends discuss their reasoning
    ↓
AI drafts a player-confirmed consensus map
```

A normal session should take three to five minutes. The goal is not to complete a full investigation, but to help everyone think one step deeper.

## Game Design

The experience borrows Kahoot’s social rhythm without turning discussion into a right-or-wrong competition:

- Low-friction room entry and a shared lobby
- Private answers before a simultaneous reveal
- Different cards for source, evidence, logic, context, incentives, or counterexamples
- A discussion break after players see one another’s reasoning
- A final, shareable record of the conversation

Each player follows a universal **3-1-1 framework**:

- 3 single-choice questions: initial view, reaction to the assigned perspective, and change in position
- 1 multiple-choice question: select up to two major reasons
- 1 final yes/no/uncertain question with one optional short comment

“Uncertain” must always be available. Speed scoring, answer streaks, and winner leaderboards are excluded because they reward fast conformity rather than reflection.

## Role of AI

AI is a briefing writer, facilitator, one-on-one interviewer, recorder, and reasoning aggregator. It is not a judge of truth, a player-scoring authority, or a replacement for domain experts.

Players should not need to remember the full article or understand its specialist domain. Before asking a question, AI presents one short claim, the necessary context, and the boundary of the available evidence.

## Consensus Without Forced Agreement

Consensus does not mean making everyone reach the same conclusion. It means identifying:

- What the group agrees on
- Where views still differ
- What evidence is missing
- What remains uncertain

AI proposes consensus statements after the discussion. Players mark each one as **Agree**, **Needs revision**, or **Disagree**. Only player-approved statements enter “We agree”; minority views remain visible.

## Telegram MVP

Telegram is the first prototype platform because it already provides group identity, private messaging, notifications, and social conversation.

- **Group chat:** lobby, shared briefing, progress, reveal, and discussion
- **Bot direct messages:** private questions and individual AI guidance
- **Final group message:** player-confirmed consensus map

The MVP accepts pasted text and screenshots. It does not depend on X API access and does not include KOL reputation scores, automatic fact-checking, or bot detection.

## Social Impact

《麥擱假》 sits at the intersection of civic technology, media literacy, and social trust. It does not claim to solve polarization. Its goal is to lower the barrier for people with different views to begin thinking and talking together.

> Reducing division does not always begin by persuading the other person. It can begin by helping people see how each other thinks.

Success means that players discover a perspective they had not considered, understand why a friend reached a different judgment, and want to bring another post back for a new round.

