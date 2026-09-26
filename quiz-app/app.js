(() => {
  "use strict";

  const TIME_LIMIT = 15; // seconds per question when the timer is on
  const CATS = ["history", "bible", "geography", "mixed"];
  const LEVELS = { easy: [1], hard: [2], all: [1, 2] };
  const $ = (id) => document.getElementById(id);

  // ---------- Interface text ----------
  const STRINGS = {
    en: {
      title: "History, Bible & Geography Quiz",
      subtitle: "Pick a topic and see how much you know.",
      "cat.history": "World History",
      "cat.bible": "The Bible",
      "cat.geography": "Geography",
      "cat.mixed": "Mixed",
      "set.level": "Difficulty",
      "set.count": "Questions",
      "set.timer": "15-second timer",
      "level.easy": "Easy",
      "level.hard": "Hard",
      "level.all": "All",
      best: "Best: {score}/{total} ({pct}%)",
      noScore: "No score yet",
      meta: "Question {n} of {total}",
      correct: "Correct! 🎉",
      wrong: "Not quite. Answer: {answer}",
      timeUp: "Time's up! Answer: {answer}",
      next: "Next",
      seeResults: "See results",
      quitConfirm: "Quit this quiz? Your progress will be lost.",
      "result.100": "Perfect score! 🏆",
      "result.80": "Excellent! 🌟",
      "result.60": "Well done! 👍",
      "result.40": "Good effort! 📚",
      "result.0": "Keep studying! 💪",
      resultSub: "{score} of {total} correct · {cat} · {level}",
      newBest: "New best!",
      again: "Play again",
      home: "Home",
      review: "Review",
      yourAnswer: "Your answer",
      answer: "Answer",
      noAnswer: "No answer (time's up)",
      quit: "Quit",
    },
    ko: {
      title: "역사 · 성경 · 지리 퀴즈",
      subtitle: "주제를 고르고 실력을 확인해 보세요.",
      "cat.history": "세계사",
      "cat.bible": "성경",
      "cat.geography": "지리",
      "cat.mixed": "섞어서",
      "set.level": "난이도",
      "set.count": "문제 수",
      "set.timer": "15초 타이머",
      "level.easy": "쉬움",
      "level.hard": "어려움",
      "level.all": "전체",
      best: "최고 기록: {score}/{total} ({pct}%)",
      noScore: "아직 기록 없음",
      meta: "{total}문제 중 {n}번",
      correct: "정답입니다! 🎉",
      wrong: "아쉬워요. 정답: {answer}",
      timeUp: "시간 초과! 정답: {answer}",
      next: "다음",
      seeResults: "결과 보기",
      quitConfirm: "퀴즈를 그만할까요? 진행 상황이 사라집니다.",
      "result.100": "만점입니다! 🏆",
      "result.80": "훌륭해요! 🌟",
      "result.60": "잘했어요! 👍",
      "result.40": "좋은 시도예요! 📚",
      "result.0": "조금 더 공부해 봐요! 💪",
      resultSub: "{total}문제 중 {score}개 정답 · {cat} · {level}",
      newBest: "새 최고 기록!",
      again: "다시 하기",
      home: "처음으로",
      review: "다시 보기",
      yourAnswer: "내 답",
      answer: "정답",
      noAnswer: "답하지 않음 (시간 초과)",
      quit: "그만하기",
    },
  };

  // ---------- Persistent settings / best scores ----------
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem("quiz." + key);
        return v === null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("quiz." + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    },
  };

  // Best scores from the first version (easy questions only) carry over to Easy.
  for (const cat of ["history", "bible"]) {
    const old = store.get("best." + cat, null);
    if (old && !store.get(`best.${cat}.easy`, null)) store.set(`best.${cat}.easy`, old);
  }

  const settings = {
    lang: store.get("lang", (navigator.language || "").toLowerCase().startsWith("ko") ? "ko" : "en"),
    level: store.get("level", "hard"),
    count: store.get("count", 10),
    timer: store.get("timer", false),
  };
  if (!STRINGS[settings.lang]) settings.lang = "en";
  if (!LEVELS[settings.level]) settings.level = "hard";

  function t(key, vars = {}) {
    const s = STRINGS[settings.lang][key] ?? STRINGS.en[key] ?? key;
    return s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
  }

  // ---------- Game state ----------
  let state = null;
  let timerId = null;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // A round question keeps a reference to its source, so it can be shown in
  // either language. `order` is the shuffled order of choice indices; index 0
  // is always the correct answer.
  function buildRound(cat, level) {
    const cats = cat === "mixed" ? ["history", "bible", "geography"] : [cat];
    const levels = LEVELS[level];
    const pool = cats.flatMap((c) =>
      QUESTIONS[c].filter((q) => levels.includes(q.lvl)).map((src) => ({ src, cat: c }))
    );
    return shuffle(pool)
      .slice(0, Math.min(settings.count, pool.length))
      .map((q) => ({ ...q, order: shuffle([0, 1, 2, 3]) }));
  }

  const text = (q) => {
    const [question, choices, explain] = q.src[settings.lang];
    return { question, choices, explain, answer: choices[0] };
  };

  function show(screen) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("screen-" + screen).classList.add("active");
    window.scrollTo(0, 0);
  }

  function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function setSeg(segId, attr, value) {
    document.querySelectorAll(`#${segId} button`).forEach((b) => {
      const on = b.dataset[attr] === String(value);
      b.classList.toggle("on", on);
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", on);
    });
  }

  // ---------- Home ----------
  function applyLanguage() {
    document.documentElement.lang = settings.lang;
    document.title = t("title");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $("quit-btn").setAttribute("aria-label", t("quit"));
    $("level-seg").setAttribute("aria-label", t("set.level"));
    $("count-seg").setAttribute("aria-label", t("set.count"));
  }

  function renderHome() {
    applyLanguage();
    for (const cat of CATS) {
      const best = store.get(`best.${cat}.${settings.level}`, null);
      $("best-" + cat).textContent = best
        ? t("best", { score: best.score, total: best.total, pct: Math.round((best.score / best.total) * 100) })
        : t("noScore");
    }
    setSeg("lang-seg", "lang", settings.lang);
    setSeg("level-seg", "level", settings.level);
    setSeg("count-seg", "count", settings.count);
    $("timer-toggle").checked = settings.timer;
  }

  function bindSeg(segId, attr, key, parse = (v) => v) {
    document.querySelectorAll(`#${segId} button`).forEach((b) =>
      b.addEventListener("click", () => {
        settings[key] = parse(b.dataset[attr]);
        store.set(key, settings[key]);
        renderHome();
      })
    );
  }
  bindSeg("lang-seg", "lang", "lang");
  bindSeg("level-seg", "level", "level");
  bindSeg("count-seg", "count", "count", Number);

  $("timer-toggle").addEventListener("change", (e) => {
    settings.timer = e.target.checked;
    store.set("timer", settings.timer);
  });

  document.querySelectorAll(".cat-card").forEach((card) =>
    card.addEventListener("click", () => startGame(card.dataset.cat))
  );

  // ---------- Quiz ----------
  function startGame(cat) {
    const level = settings.level;
    state = { cat, level, questions: buildRound(cat, level), index: 0, score: 0, answers: [] };
    show("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    const { questions, index } = state;
    const q = questions[index];
    const { question, choices } = text(q);

    $("progress-fill").style.width = `${(index / questions.length) * 100}%`;
    $("score-pill").textContent = state.score;
    const tags = [];
    if (state.cat === "mixed") tags.push(t("cat." + q.cat));
    if (state.level === "all") tags.push(t(q.src.lvl === 2 ? "level.hard" : "level.easy"));
    $("q-meta").textContent = [t("meta", { n: index + 1, total: questions.length }), ...tags].join(" · ");
    $("question").textContent = question;
    $("feedback").hidden = true;
    $("next-btn").hidden = true;

    const box = $("choices");
    box.innerHTML = "";
    q.order.forEach((choiceIdx, i) => {
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.dataset.idx = choiceIdx;
      const key = document.createElement("span");
      key.className = "key";
      key.textContent = "ABCD"[i];
      const label = document.createElement("span");
      label.textContent = choices[choiceIdx];
      btn.append(key, label);
      btn.addEventListener("click", () => answer(choiceIdx));
      box.appendChild(btn);
    });

    startTimer();
  }

  function startTimer() {
    stopTimer();
    const bar = $("timer");
    const fill = $("timer-fill");
    bar.classList.toggle("on", settings.timer);
    if (!settings.timer) return;

    const start = performance.now();
    fill.classList.remove("low");
    fill.style.width = "100%";
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const left = Math.max(0, TIME_LIMIT - elapsed);
      fill.style.width = `${(left / TIME_LIMIT) * 100}%`;
      fill.classList.toggle("low", left < 5);
      if (left <= 0) {
        timerId = null;
        answer(null);
      } else {
        timerId = requestAnimationFrame(tick);
      }
    };
    timerId = requestAnimationFrame(tick);
  }

  function stopTimer() {
    if (timerId !== null) cancelAnimationFrame(timerId);
    timerId = null;
  }

  // `choiceIdx` is the index into the source choices (0 = correct), or null on timeout.
  function answer(choiceIdx) {
    stopTimer();
    const q = state.questions[state.index];
    const { answer: correctText, explain } = text(q);
    const correct = choiceIdx === 0;
    if (correct) state.score++;
    state.answers.push({ q, choiceIdx, correct });

    document.querySelectorAll(".choice").forEach((btn) => {
      const idx = Number(btn.dataset.idx);
      btn.disabled = true;
      if (idx === 0) btn.classList.add("correct");
      else if (idx === choiceIdx) btn.classList.add("wrong");
      else btn.classList.add("dim");
    });

    vibrate(correct ? 30 : [60, 40, 60]);
    $("score-pill").textContent = state.score;

    const fb = $("feedback");
    fb.className = "feedback " + (correct ? "good" : "bad");
    $("feedback-title").textContent = correct
      ? t("correct")
      : t(choiceIdx === null ? "timeUp" : "wrong", { answer: correctText });
    $("feedback-text").textContent = explain;
    fb.hidden = false;

    const next = $("next-btn");
    next.textContent = t(state.index === state.questions.length - 1 ? "seeResults" : "next");
    next.hidden = false;
    next.focus({ preventScroll: true });
    next.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  $("next-btn").addEventListener("click", () => {
    state.index++;
    if (state.index < state.questions.length) renderQuestion();
    else finish();
  });

  $("quit-btn").addEventListener("click", () => {
    if (state.answers.length === 0 || confirm(t("quitConfirm"))) {
      stopTimer();
      state = null;
      renderHome();
      show("home");
    }
  });

  // ---------- Results ----------
  function finish() {
    const total = state.questions.length;
    const { score, cat, level } = state;
    const pct = Math.round((score / total) * 100);

    const bestKey = `best.${cat}.${level}`;
    const prev = store.get(bestKey, null);
    const isBest = !prev || score / total > prev.score / prev.total;
    if (isBest) store.set(bestKey, { score, total });

    $("ring").style.setProperty("--pct", pct);
    $("result-pct").textContent = pct + "%";
    const tier = pct === 100 ? 100 : pct >= 80 ? 80 : pct >= 60 ? 60 : pct >= 40 ? 40 : 0;
    $("result-title").textContent = t("result." + tier);
    $("result-sub").textContent =
      t("resultSub", { score, total, cat: t("cat." + cat), level: t("level." + level) }) +
      (isBest ? " · " + t("newBest") : "");

    const list = $("review");
    list.innerHTML = "";
    state.answers.forEach(({ q, choiceIdx, correct }) => {
      const { question, choices, answer: correctText, explain } = text(q);
      const li = document.createElement("li");
      if (!correct) li.className = "miss";
      const rq = document.createElement("p");
      rq.className = "rq";
      rq.textContent = (correct ? "✓ " : "✗ ") + question;
      const ra = document.createElement("p");
      ra.className = "ra";
      if (!correct) {
        const yours = choiceIdx === null ? t("noAnswer") : choices[choiceIdx];
        ra.append(`${t("yourAnswer")}: ${yours}`, document.createElement("br"));
      }
      const b = document.createElement("b");
      b.textContent = correctText;
      ra.append(`${t("answer")}: `, b, ` — ${explain}`);
      li.append(rq, ra);
      list.appendChild(li);
    });

    $("progress-fill").style.width = "100%";
    show("result");
    vibrate(pct >= 80 ? [40, 60, 40, 60, 80] : 40);
  }

  $("again-btn").addEventListener("click", () => startGame(state.cat));
  $("home-btn").addEventListener("click", () => { renderHome(); show("home"); });

  // Keyboard shortcuts (1-4 / A-D to answer, Enter for next) for tablets with keyboards.
  document.addEventListener("keydown", (e) => {
    if (!$("screen-quiz").classList.contains("active")) return;
    if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const idx = "1234".includes(k) ? "1234".indexOf(k) : "abcd".indexOf(k);
      const btn = document.querySelectorAll(".choice")[idx];
      if (idx >= 0 && btn && !btn.disabled) btn.click();
    } else if (e.key === "Enter" && !$("next-btn").hidden) {
      e.preventDefault(); // avoid a second native click when the button is focused
      $("next-btn").click();
    }
  });

  renderHome();

  // Offline support
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
