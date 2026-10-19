// 내용은 전부 data/*.json 에 있다. 이 파일은 화면만 그린다.
const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const pyHtml = (syl) => syl.map(([p, t]) => `<span class="s${t}">${p}</span>`).join(" ");
const SPK = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"/></svg>';
const speakBtn = (text, label) => `<button class="speak" data-say="${text}" aria-label="${label} 듣기">${SPK}</button>`;

// ---- 소리 (브라우저 내장 TTS) ----
let zhVoice = null;
function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices();
    zhVoice = vs.find((v) => /zh[-_]CN/i.test(v.lang)) || vs.find((v) => /^zh/i.test(v.lang)) || null;
  } catch {}
}
try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch {}
function speak(text) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 0.8;
    if (zhVoice) u.voice = zhVoice;
    speechSynthesis.speak(u);
  } catch {
    $("#voiceNote").textContent = "이 브라우저에서는 소리를 낼 수 없어요. 크롬이나 사파리에서 열어 주세요.";
  }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-say]");
  if (b) speak(b.dataset.say);
});

// ---- 탭 ----
const TAB_IDS = ["today", "sound", "cards", "quiz", "culture", "log"];
const tabs = document.querySelectorAll("#tabs button");
function show(id) {
  if (!TAB_IDS.includes(id)) id = "today";
  tabs.forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === id));
  document.querySelectorAll("section").forEach((s) => (s.hidden = s.id !== id));
  if (id === "today") renderWeak();
}
tabs.forEach((b) => b.addEventListener("click", () => { history.replaceState(null, "", "#" + b.dataset.tab); show(b.dataset.tab); }));

// ---- 데이터 ----
let D = {};
let weak = store.get("weak", []);

async function load() {
  const names = ["lessons", "words", "culture", "sounds", "schedule"];
  const res = await Promise.all(names.map((n) => fetch(`data/${n}.json`, { cache: "no-cache" }).then((r) => r.json())));
  names.forEach((n, i) => (D[n] = res[i]));
}

// ---- 오늘의 복습 ----
const dayDiff = (iso) => {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + "T00:00:00") - t) / 86400000);
};
const fmtDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${"일월화수목금토"[d.getDay()]})`;
};
function renderToday() {
  const next = D.schedule.classes.find((c) => dayDiff(c.date) >= 0);
  if (next) {
    const n = dayDiff(next.date);
    $("#dday").textContent = n === 0 ? "오늘" : `D-${n}`;
    $("#nextInfo").textContent = `${fmtDate(next.date)} · ${next.no}차시${next.tentative ? " (예상)" : ""}`;
  } else {
    $("#dday").textContent = "-";
    $("#nextInfo").textContent = "다음 수업 날짜가 아직 없어요.";
  }
  const done = D.lessons.filter((l) => l.summary);
  const last = done[done.length - 1];
  if (last) {
    $("#lastLabel").textContent = `${last.no}차시 요약 · ${fmtDate(last.date)}`;
    $("#lastSummary").textContent = last.summary;
  }
}
function renderWeak() {
  const list = D.words.filter((w) => weak.includes(w.hz));
  $("#weakCount").textContent = list.length + "개";
  $("#weakList").innerHTML = list.length
    ? list.map((w) => `<div class="word"><span class="hz">${w.hz}</span><div class="meta"><div class="py">${pyHtml(w.syl)}</div><div class="ko">${w.ko}</div></div><span class="chip">${w.lesson}차시</span>${speakBtn(w.hz, w.hz)}</div>`).join("")
    : `<p class="empty">아직 없어요. 단어 카드에서 '헷갈려요'를 누르면 여기에 모여요.</p>`;
}

// ---- 발음 ----
const TONES = [
  { t: 1, name: "1성", pts: [5, 5], num: "55", tip: "높고 평평하게", hz: "妈", py: "mā" },
  { t: 2, name: "2성", pts: [3, 5], num: "35", tip: "되물을 때처럼 올리기", hz: "麻", py: "má" },
  { t: 3, name: "3성", pts: [2, 1, 4], num: "214", tip: "내렸다가 올리기", hz: "马", py: "mǎ" },
  { t: 4, name: "4성", pts: [5, 1], num: "51", tip: "위에서 뚝 떨어뜨리기", hz: "骂", py: "mà" },
];
function toneSvg(t) {
  const x0 = 22, x1 = 110, y = (lv) => 96 - (lv - 1) * 21;
  const n = t.pts.length, xs = t.pts.map((_, i) => x0 + ((x1 - x0) * i) / (n - 1));
  const d = t.pts.map((lv, i) => `${i ? "L" : "M"}${xs[i]},${y(lv)}`).join(" ");
  const grid = [1, 2, 3, 4, 5].map((lv) => `<line x1="${x0}" x2="${x1}" y1="${y(lv)}" y2="${y(lv)}" stroke="var(--line)"/><text x="${x0 - 8}" y="${y(lv) + 4}" font-size="10" text-anchor="middle" fill="var(--muted)">${lv}</text>`).join("");
  return `<svg viewBox="0 0 120 110" role="img" aria-label="${t.name} 음높이 ${t.num}">${grid}<path d="${d}" fill="none" stroke="var(--t${t.t})" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${xs[n - 1]}" cy="${y(t.pts[n - 1])}" r="4" fill="var(--t${t.t})"/></svg>`;
}
const cell = (s, learned) => `<button class="${learned.includes(s) ? "on" : ""}" tabindex="-1">${s}</button>`;
function renderSound() {
  const S = D.sounds;
  $("#tones").innerHTML = TONES.map((t) => `<div class="tone">${toneSvg(t)}<span class="name s${t.t}">${t.name} <span class="py">${t.py}</span></span><span class="num">${t.num} · ${t.tip}</span>${speakBtn(t.hz, t.name)}</div>`).join("");
  $("#tips").innerHTML = S.tips.map((x) => `<p class="tip"><b>${x.from === "teacher" ? "선생님 팁" : "수업 메모"} · ${x.lesson}차시</b> · ${x.text}</p>`).join("");
  $("#initials").innerHTML = S.initials.all.map((s) => cell(s, S.initials.learned)).join("");
  $("#iniCount").textContent = `${S.initials.all.length}개 중 ${S.initials.learned.length}개`;
  const allFinals = S.finals.groups.flatMap((g) => g.items);
  $("#finCount").textContent = `${allFinals.length}개 중 ${S.finals.learned.length}개`;
  $("#finals").innerHTML = S.finals.groups.map((g) => `<div class="group-name">${g.name}</div><div class="cells">${g.items.map((s) => cell(s, S.finals.learned)).join("")}</div>`).join("");
  $("#pairs").innerHTML = S.pairs.map((p) => `<div style="display:grid;gap:6px"><div class="pair"><div class="side"><span class="big">${p.a[0]}</span>${speakBtn(p.a[1], p.a[0])}</div><span class="vs">vs</span><div class="side"><span class="big">${p.b[0]}</span>${speakBtn(p.b[1], p.b[0])}</div></div><p style="font-size:13px;color:var(--muted)">${p.note}</p></div>`).join("");
}

// ---- 단어 카드 ----
let deck = [], fi = 0, filter = "all";
function buildDeck() {
  deck = D.words.filter((w) => filter === "all" || (filter === "weak" ? weak.includes(w.hz) : String(w.lesson) === filter));
  fi = 0;
  document.querySelectorAll("#cardFilter button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.f === filter));
  renderCard();
}
function renderCard() {
  $("#flash").classList.remove("flipped");
  const w = deck[fi];
  if (!w) {
    $("#fHz").textContent = "카드가 없어요";
    $("#fPy").textContent = ""; $("#fKo").textContent = ""; $("#fCount").textContent = "0 / 0";
    return;
  }
  $("#fHz").textContent = w.hz;
  $("#fPy").innerHTML = pyHtml(w.syl);
  $("#fKo").textContent = w.ko;
  $("#fCount").textContent = `${fi + 1} / ${deck.length} · ${w.lesson}차시${w.tag ? " · " + w.tag : ""}`;
  $("#fWeak").classList.toggle("on", weak.includes(w.hz));
}
function setupCards() {
  const lessonNos = [...new Set(D.words.map((w) => w.lesson))];
  $("#cardFilter").innerHTML = [["all", "전체"], ...lessonNos.map((n) => [String(n), `${n}차시`]), ["weak", "헷갈림"]]
    .map(([f, label]) => `<button data-f="${f}">${label}</button>`).join("");
  $("#cardFilter").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { filter = b.dataset.f; buildDeck(); } });
  const flip = () => deck.length && $("#flash").classList.toggle("flipped");
  $(".flash-inner").addEventListener("click", flip);
  $(".flash-inner").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
  $("#prev").onclick = () => { if (deck.length) { fi = (fi - 1 + deck.length) % deck.length; renderCard(); } };
  $("#next").onclick = () => { if (deck.length) { fi = (fi + 1) % deck.length; renderCard(); } };
  $("#fSpeak").onclick = () => deck[fi] && speak(deck[fi].hz);
  $("#fWeak").onclick = () => {
    const w = deck[fi]; if (!w) return;
    weak = weak.includes(w.hz) ? weak.filter((x) => x !== w.hz) : [...weak, w.hz];
    store.set("weak", weak);
    renderCard();
  };
  buildDeck();
}

// ---- 성조 퀴즈 ----
let q = null, answered = false, right = 0, total = 0;
function newQ() {
  const pool = D.sounds.quiz;
  let next;
  do { next = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && next === q);
  q = next;
  answered = false;
  $("#qSyl").textContent = "?";
  $("#qFb").textContent = "";
  document.querySelectorAll("#answers button").forEach((b) => (b.className = "s" + b.dataset.t));
}
function setupQuiz() {
  $("#qPlay").onclick = () => speak(q[0]);
  $("#qNext").onclick = () => { newQ(); speak(q[0]); };
  document.querySelectorAll("#answers button").forEach((b) => b.addEventListener("click", () => {
    if (answered) return;
    answered = true; total++;
    const ok = +b.dataset.t === q[2];
    if (ok) right++;
    b.classList.add(ok ? "right" : "wrong");
    $(`#answers button[data-t="${q[2]}"]`).classList.add("right");
    $("#qSyl").innerHTML = `<span class="hz" style="font-size:22px">${q[0]}</span> <span class="s${q[2]}">${q[1]}</span>`;
    $("#qFb").textContent = ok ? "맞았어요!" : `${q[2]}성이에요. 한 번 더 들어보세요.`;
    $("#qScore").textContent = `${right} / ${total}`;
  }));
  newQ();
}

// ---- 문화 노트 / 수업 기록 ----
function renderCulture() {
  $("#cultureList").innerHTML = [...D.culture].reverse().map((c) => `<div class="card culture"><div class="row"><span class="hz">${c.hz}</span><span class="py" style="color:var(--muted);flex:1;min-width:0">${c.py}</span>${speakBtn(c.hz, c.title)}</div><h3>${c.title}</h3><p>${c.body}</p>${c.check ? `<p class="check">${c.check}</p>` : ""}<span class="chip" style="justify-self:start">${c.lesson}차시</span></div>`).join("");
}
function renderLog() {
  $("#timeline").innerHTML = [...D.lessons].reverse().map((l) => {
    const d = new Date(l.date + "T00:00:00");
    const body = l.items.length
      ? `<ul>${l.items.map((i) => `<li>${i}</li>`).join("")}</ul>`
      : `<p class="sum">아직 정리 전이에요.</p>`;
    return `<div class="lesson"><div class="when"><b>${l.no}차시</b>${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}</div><div><h3>${l.title}</h3>${body}</div></div>`;
  }).join("");
}

load().then(() => {
  document.querySelectorAll(".name-card .speak").forEach((b) => (b.innerHTML = SPK));
  renderToday();
  renderSound();
  setupCards();
  setupQuiz();
  renderCulture();
  renderLog();
  show(location.hash.slice(1) || "today");
}).catch(() => {
  $("#lastSummary").textContent = "데이터를 불러오지 못했어요. 새로고침해 보세요.";
});
