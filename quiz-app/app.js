(() => {
  "use strict";

  const TIME_LIMIT = 15; // seconds per question when the timer is on
  const CAT_LABELS = { history: "World History", bible: "The Bible", mixed: "Mixed" };
  const $ = (id) => document.getElementById(id);

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

  const settings = {
    count: store.get("count", 10),
    timer: store.get("timer", false),
  };

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

  function buildRound(cat) {
    let pool;
    if (cat === "mixed") {
      pool = [
        ...QUESTIONS.history.map((q) => ({ ...q, cat: "history" })),
        ...QUESTIONS.bible.map((q) => ({ ...q, cat: "bible" })),
      ];
    } else {
      pool = QUESTIONS[cat].map((q) => ({ ...q, cat }));
    }
    return shuffle(pool)
      .slice(0, Math.min(settings.count, pool.length))
      .map((q) => ({ ...q, choices: shuffle(q.choices) }));
  }

  function show(screen) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("screen-" + screen).classList.add("active");
    window.scrollTo(0, 0);
  }

  function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  // ---------- Home ----------
  function renderHome() {
    for (const cat of Object.keys(CAT_LABELS)) {
      const best = store.get("best." + cat, null);
      $("best-" + cat).textContent = best
        ? `Best: ${best.score}/${best.total} (${Math.round((best.score / best.total) * 100)}%)`
        : "No score yet";
    }
    document.querySelectorAll(".seg button").forEach((b) => {
      const on = Number(b.dataset.count) === settings.count;
      b.classList.toggle("on", on);
      b.setAttribute("aria-checked", on);
      b.setAttribute("role", "radio");
    });
    $("timer-toggle").checked = settings.timer;
  }

  document.querySelectorAll(".seg button").forEach((b) =>
    b.addEventListener("click", () => {
      settings.count = Number(b.dataset.count);
      store.set("count", settings.count);
      renderHome();
    })
  );

  $("timer-toggle").addEventListener("change", (e) => {
    settings.timer = e.target.checked;
    store.set("timer", settings.timer);
  });

  document.querySelectorAll(".cat-card").forEach((card) =>
    card.addEventListener("click", () => startGame(card.dataset.cat))
  );

  // ---------- Quiz ----------
  function startGame(cat) {
    state = { cat, questions: buildRound(cat), index: 0, score: 0, answers: [] };
    show("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    const { questions, index } = state;
    const q = questions[index];

    $("progress-fill").style.width = `${(index / questions.length) * 100}%`;
    $("score-pill").textContent = state.score;
    $("q-meta").textContent =
      `Question ${index + 1} of ${questions.length}` +
      (state.cat === "mixed" ? ` · ${CAT_LABELS[q.cat]}` : "");
    $("question").textContent = q.q;
    $("feedback").hidden = true;
    $("next-btn").hidden = true;

    const box = $("choices");
    box.innerHTML = "";
    q.choices.forEach((choice, i) => {
      const btn = document.createElement("button");
      btn.className = "choice";
      const key = document.createElement("span");
      key.className = "key";
      key.textContent = "ABCD"[i];
      const label = document.createElement("span");
      label.textContent = choice;
      btn.append(key, label);
      btn.addEventListener("click", () => answer(choice));
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

  function answer(choice) {
    stopTimer();
    const q = state.questions[state.index];
    const correct = choice === q.answer;
    if (correct) state.score++;
    state.answers.push({ q, choice, correct });

    document.querySelectorAll(".choice").forEach((btn) => {
      const text = btn.lastChild.textContent;
      btn.disabled = true;
      if (text === q.answer) btn.classList.add("correct");
      else if (text === choice) btn.classList.add("wrong");
      else btn.classList.add("dim");
    });

    vibrate(correct ? 30 : [60, 40, 60]);
    $("score-pill").textContent = state.score;

    const fb = $("feedback");
    fb.className = "feedback " + (correct ? "good" : "bad");
    $("feedback-title").textContent = correct
      ? "Correct! 🎉"
      : choice === null ? `Time's up! Answer: ${q.answer}` : `Not quite. Answer: ${q.answer}`;
    $("feedback-text").textContent = q.explain;
    fb.hidden = false;

    const next = $("next-btn");
    next.textContent = state.index === state.questions.length - 1 ? "See results" : "Next";
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
    if (state.answers.length === 0 || confirm("Quit this quiz? Your progress will be lost.")) {
      stopTimer();
      state = null;
      renderHome();
      show("home");
    }
  });

  // ---------- Results ----------
  function finish() {
    const total = state.questions.length;
    const { score, cat } = state;
    const pct = Math.round((score / total) * 100);

    const prev = store.get("best." + cat, null);
    const isBest = !prev || score / total > prev.score / prev.total;
    if (isBest) store.set("best." + cat, { score, total });

    $("ring").style.setProperty("--pct", pct);
    $("result-pct").textContent = pct + "%";
    $("result-title").textContent =
      pct === 100 ? "Perfect score! 🏆" :
      pct >= 80 ? "Excellent! 🌟" :
      pct >= 60 ? "Well done! 👍" :
      pct >= 40 ? "Good effort! 📚" : "Keep studying! 💪";
    $("result-sub").textContent =
      `${score} of ${total} correct · ${CAT_LABELS[cat]}` + (isBest ? " · New best!" : "");

    const list = $("review");
    list.innerHTML = "";
    state.answers.forEach(({ q, choice, correct }) => {
      const li = document.createElement("li");
      if (!correct) li.className = "miss";
      const rq = document.createElement("p");
      rq.className = "rq";
      rq.textContent = (correct ? "✓ " : "✗ ") + q.q;
      const ra = document.createElement("p");
      ra.className = "ra";
      const yours = choice === null ? "No answer (time's up)" : choice;
      ra.innerHTML = correct ? "" : `Your answer: ${escapeHtml(yours)}<br>`;
      ra.innerHTML += `Answer: <b>${escapeHtml(q.answer)}</b> — ${escapeHtml(q.explain)}`;
      li.append(rq, ra);
      list.appendChild(li);
    });

    $("progress-fill").style.width = "100%";
    show("result");
    vibrate(pct >= 80 ? [40, 60, 40, 60, 80] : 40);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
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
