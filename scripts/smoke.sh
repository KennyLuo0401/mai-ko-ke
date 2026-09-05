#!/usr/bin/env bash
# End-to-end HTTP smoke test / 端到端 HTTP 煙霧測試
#
# Drives the full game over real HTTP with three separate cookie jars
# (one host + two players), mirroring the BUILD_PLAN §12 critical scenario.
#
# Usage: BASE=http://localhost:3000 ./scripts/smoke.sh
set -euo pipefail

BASE="${BASE:-http://localhost:3001}"
# Deployments that gate hosting need the passcode; ungated ones ignore it.
HOST_KEY="${MKK_HOST_KEY:-}"
JAR_DIR="$(mktemp -d)"
H="$JAR_DIR/host.txt"; P1="$JAR_DIR/p1.txt"; P2="$JAR_DIR/p2.txt"
pass=0; fail=0

req() { # jar method path [json]
  local jar="$1" method="$2" path="$3" body="${4:-}"
  if [ -n "$body" ]; then
    curl -s -c "$jar" -b "$jar" -X "$method" "$BASE$path" \
      -H 'content-type: application/json' -d "$body"
  else
    curl -s -c "$jar" -b "$jar" -X "$method" "$BASE$path"
  fi
}
jqv() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const o=JSON.parse(s);const p=process.argv[1].split(".");let c=o;for(const k of p){c=c?.[k]}console.log(typeof c==="object"?JSON.stringify(c):c)}catch(e){console.log("PARSE_ERROR")}})' "$1"; }
check() { # label expected actual
  if [ "$2" = "$3" ]; then echo "  ✓ $1"; pass=$((pass+1));
  else echo "  ✗ $1 — expected [$2] got [$3]"; fail=$((fail+1)); fi
}

echo "▸ Host creates a room"
ROOM=$(req "$H" POST /api/rooms "{\"language\":\"zh-TW\",\"hostKey\":\"$HOST_KEY\"}")
ROOM_ID=$(echo "$ROOM" | jqv data.roomId)
ROOM_CODE=$(echo "$ROOM" | jqv data.roomCode)
check "room code is six digits" "6" "${#ROOM_CODE}"

echo "▸ Two players join"
req "$P1" POST /api/rooms/join "{\"roomCode\":\"$ROOM_CODE\",\"nickname\":\"Kenny\",\"language\":\"zh-TW\"}" >/dev/null
req "$P2" POST /api/rooms/join "{\"roomCode\":\"$ROOM_CODE\",\"nickname\":\"Alan\",\"language\":\"en\"}" >/dev/null
check "roster holds two players" "2" "$(req "$H" GET "/api/rooms/$ROOM_ID" | jqv data.players | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).length))')"

echo "▸ Outsiders cannot read the room"
STRANGER="$JAR_DIR/stranger.txt"
# A signed-in non-member must not even learn the room exists.
req "$STRANGER" POST /api/rooms "{\"language\":\"en\",\"hostKey\":\"$HOST_KEY\"}" >/dev/null
check "signed-in non-member is refused" "room_not_found" \
  "$(req "$STRANGER" GET "/api/rooms/$ROOM_ID" | jqv error.code)"
check "session-less caller is refused" "unauthenticated" \
  "$(curl -s "$BASE/api/rooms/$ROOM_ID" | jqv error.code)"

echo "▸ Host submits material"
MAT=$(req "$H" POST "/api/rooms/$ROOM_ID/material" \
  '{"sourceText":"某公司試行每週工作四天後，員工說自己更專注。","hostQuestion":"四天工作制真的更有效率嗎？"}')
check "briefing is ready" "BRIEFING_READY" "$(echo "$MAT" | jqv data.state)"
check "briefing is bilingual" "false" "$(echo "$MAT" | jqv data.briefing.en | grep -q . && echo false || echo true)"

echo "▸ Host starts the private vote"
check "initial vote open" "INITIAL_VOTE" \
  "$(req "$H" POST "/api/rooms/$ROOM_ID/advance" '{"expectedState":"BRIEFING_READY","action":"start_initial_vote"}' | jqv data.state)"

echo "▸ Late join is rejected"
LATE="$JAR_DIR/late.txt"
LATE_BODY="{\"roomCode\":\"$ROOM_CODE\",\"nickname\":\"Late\",\"language\":\"en\"}"
LATE_RAW=$(req "$LATE" POST /api/rooms/join "$LATE_BODY")
check "late join refused" "late_join_rejected" "$(echo "$LATE_RAW" | jqv error.code)"

echo "▸ Player 1 answers privately"
req "$P1" POST "/api/rooms/$ROOM_ID/responses" '{"stage":"initial","initialChoice":"yes"}' >/dev/null
P2VIEW=$(req "$P2" GET "/api/rooms/$ROOM_ID")
check "no reveal leaked to player 2" "undefined" "$(echo "$P2VIEW" | jqv data.reveal)"
check "no answer leaked to player 2" "0" \
  "$(echo "$P2VIEW" | grep -c 'initialChoice' || true)"
HVIEW=$(req "$H" GET "/api/rooms/$ROOM_ID")
check "host sees no private answers" "0" "$(echo "$HVIEW" | grep -c 'initialChoice' || true)"

echo "▸ Player 2 answers — phase advances"
check "card phase" "PRIVATE_CARD" \
  "$(req "$P2" POST "/api/rooms/$ROOM_ID/responses" '{"stage":"initial","initialChoice":"no"}' | jqv data.state)"

echo "▸ Players get different cards"
C1=$(req "$P1" GET "/api/rooms/$ROOM_ID" | jqv data.myCard.id)
C2=$(req "$P2" GET "/api/rooms/$ROOM_ID" | jqv data.myCard.id)
check "cards differ" "different" "$([ "$C1" != "$C2" ] && echo different || echo same)"

echo "▸ Card answers → synchronized reveal"
# Reason ids come from the room's own package, so this works against the
# fixture and against live AI alike.
REASONS_JSON=$(req "$P1" GET "/api/rooms/$ROOM_ID" | jqv data.reasons)
R1=$(echo "$REASONS_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[0].id))')
R2=$(echo "$REASONS_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[1].id))')
req "$P1" POST "/api/rooms/$ROOM_ID/responses" \
  "{\"stage\":\"card\",\"reactionChoice\":\"weakens\",\"reasonIds\":[\"$R1\"]}" >/dev/null
REVEAL=$(req "$P2" POST "/api/rooms/$ROOM_ID/responses" \
  "{\"stage\":\"card\",\"reactionChoice\":\"unchanged\",\"reasonIds\":[\"$R1\",\"$R2\"]}")
check "revealed" "REVEALED" "$(echo "$REVEAL" | jqv data.state)"
check "both answers revealed" "2" \
  "$(echo "$REVEAL" | jqv data.reveal | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).length))')"

echo "▸ Discussion then final positions"
req "$H" POST "/api/rooms/$ROOM_ID/advance" '{"expectedState":"REVEALED","action":"start_discussion"}' >/dev/null
check "final vote open" "FINAL_VOTE" \
  "$(req "$H" POST "/api/rooms/$ROOM_ID/advance" '{"expectedState":"IN_PERSON_DISCUSSION","action":"start_final_vote"}' | jqv data.state)"

req "$P1" POST "/api/rooms/$ROOM_ID/responses" '{"stage":"final","changeChoice":"less_supportive","finalChoice":"uncertain"}' >/dev/null
FIN=$(req "$P2" POST "/api/rooms/$ROOM_ID/responses" '{"stage":"final","changeChoice":"unchanged","finalChoice":"no","comment":"still thin"}')
check "consensus review open" "CONSENSUS_REVIEW" "$(echo "$FIN" | jqv data.state)"

echo "▸ Publication is blocked until every vote is in"
STMTS=$(req "$H" GET "/api/rooms/$ROOM_ID" | jqv data.consensusStatements)
ALL_IDS=$(echo "$STMTS" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).map(x=>x.id).join(" ")))')
# Choose deliberately rather than positionally: the statements are model output,
# so which categories appear where is not fixed. Dissent on one that is NOT a
# candidate agreement, and keep one that IS, so both map sections are exercised.
AGREE_ID=$(echo "$STMTS" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);console.log((a.find(x=>x.category==="candidate_agreement")||a[0]).id)})')
DISSENT_ID=$(echo "$STMTS" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);const g=a.find(x=>x.category==="candidate_agreement")||a[0];console.log((a.find(x=>x.id!==g.id)||g).id)})')
req "$P1" POST "/api/rooms/$ROOM_ID/consensus-votes" "{\"statementId\":\"$AGREE_ID\",\"decision\":\"agree\"}" >/dev/null
check "publish blocked" "phase_conflict" \
  "$(req "$H" POST "/api/rooms/$ROOM_ID/advance" '{"expectedState":"CONSENSUS_REVIEW","action":"publish"}' | jqv error.code)"

echo "▸ Everyone votes; one dissent is preserved"
for id in $ALL_IDS; do
  req "$P1" POST "/api/rooms/$ROOM_ID/consensus-votes" "{\"statementId\":\"$id\",\"decision\":\"agree\"}" >/dev/null
  if [ "$id" = "$DISSENT_ID" ]; then D=disagree; else D=agree; fi
  req "$P2" POST "/api/rooms/$ROOM_ID/consensus-votes" "{\"statementId\":\"$id\",\"decision\":\"$D\"}" >/dev/null
done
MAP=$(req "$H" POST "/api/rooms/$ROOM_ID/advance" '{"expectedState":"CONSENSUS_REVIEW","action":"publish"}')
check "completed" "COMPLETED" "$(echo "$MAP" | jqv data.state)"
check "dissent kept out of We agree" "we_differ" \
  "$(echo "$MAP" | jqv data.map | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const m=JSON.parse(s).find(x=>x.id==='$DISSENT_ID');console.log(m.section)})")"
check "unanimous agreement reached We agree" "we_agree" \
  "$(echo "$MAP" | jqv data.map | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const m=JSON.parse(s).find(x=>x.id==='$AGREE_ID');console.log(m.section)})")"
STMT_COUNT=$(echo "$STMTS" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).length))')
MAP_COUNT=$(echo "$MAP" | jqv data.map | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).length))')
check "every statement survives into the map" "$STMT_COUNT" "$MAP_COUNT"

rm -rf "$JAR_DIR"
echo
echo "──────────────────────────────"
echo "  passed: $pass    failed: $fail"
[ "$fail" -eq 0 ] || exit 1
