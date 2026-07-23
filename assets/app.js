/* ================================================================
   ENG1237 — Intersectional Machines
   Shared behaviour: theme toggle + read-aloud (text-to-speech)
   ================================================================ */
(function () {
  "use strict";

  /* ---------------- Theme (light / dark) ---------------- */
  var root = document.documentElement;
  var STORE_KEY = "eng1237-theme";

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function currentTheme() {
    var attr = root.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    return systemPrefersDark() ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(STORE_KEY, theme); } catch (e) {}
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      var isDark = theme === "dark";
      btn.setAttribute("aria-pressed", String(isDark));
      var lbl = btn.querySelector(".label");
      if (lbl) lbl.textContent = isDark ? "Light mode" : "Dark mode";
      btn.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
      var sun = btn.querySelector(".icon-sun");
      var moon = btn.querySelector(".icon-moon");
      if (sun && moon) {
        sun.style.display = isDark ? "" : "none";
        moon.style.display = isDark ? "none" : "";
      }
    }
  }

  // Initialise from stored preference (set as early as possible)
  var stored = null;
  try { stored = localStorage.getItem(STORE_KEY); } catch (e) {}
  if (stored === "light" || stored === "dark") {
    root.setAttribute("data-theme", stored);
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(currentTheme());

    var toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        applyTheme(currentTheme() === "dark" ? "light" : "dark");
      });
    }

    // Close the sections dropdown when clicking outside / pressing Escape
    var menu = document.getElementById("sections-menu");
    if (menu) {
      document.addEventListener("click", function (e) {
        if (menu.open && !menu.contains(e.target)) menu.open = false;
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && menu.open) menu.open = false;
      });
    }

    setupReader();
  });

  /* ---------------- Read aloud (text-to-speech) ---------------- */
  var synth = window.speechSynthesis;
  var chunks = [];        // array of {el, text}
  var idx = 0;
  var reading = false;
  var paused = false;
  var voices = [];

  function setupReader() {
    var bar = document.getElementById("reader-bar");
    var startBtn = document.getElementById("read-aloud");
    if (!startBtn) return;

    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
      // Unsupported browser: hide the feature gracefully
      startBtn.disabled = true;
      startBtn.title = "Read-aloud is not supported in this browser";
      startBtn.style.display = "none";
      return;
    }

    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }

    startBtn.addEventListener("click", function () {
      if (reading) { stopReading(); } else { startReading(); }
    });

    byId("reader-playpause", function (b) { b.addEventListener("click", togglePause); });
    byId("reader-stop", function (b) { b.addEventListener("click", stopReading); });
    byId("reader-restart", function (b) { b.addEventListener("click", function () { stopReading(); startReading(); }); });

    var rate = document.getElementById("reader-rate");
    if (rate) {
      rate.addEventListener("change", function () {
        if (reading) { // apply new rate from the current sentence
          var resumeAt = idx;
          synth.cancel();
          idx = resumeAt;
          speakFrom(idx);
        }
      });
    }
    var voiceSel = document.getElementById("reader-voice");
    if (voiceSel) {
      voiceSel.addEventListener("change", function () {
        if (reading) {
          var resumeAt = idx;
          synth.cancel();
          idx = resumeAt;
          speakFrom(idx);
        }
      });
    }

    // Stop speech if the user leaves the page
    window.addEventListener("beforeunload", function () { if (synth) synth.cancel(); });
  }

  function byId(id, fn) { var el = document.getElementById(id); if (el) fn(el); }

  function loadVoices() {
    voices = synth.getVoices() || [];
    var sel = document.getElementById("reader-voice");
    if (!sel || !voices.length) return;
    var prev = sel.value;
    sel.innerHTML = "";
    var enVoices = voices.filter(function (v) { return /^en/i.test(v.lang); });
    var list = enVoices.length ? enVoices : voices;
    list.forEach(function (v) {
      var o = document.createElement("option");
      o.value = v.name;
      o.textContent = v.name + " (" + v.lang + ")";
      sel.appendChild(o);
    });
    if (prev) sel.value = prev;
  }

  function chosenVoice() {
    var sel = document.getElementById("reader-voice");
    if (sel && sel.value) {
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].name === sel.value) return voices[i];
      }
    }
    // sensible default: first English voice
    for (var j = 0; j < voices.length; j++) {
      if (/^en/i.test(voices[j].lang)) return voices[j];
    }
    return voices[0] || null;
  }

  // Break the main content into readable chunks, one per block element.
  function buildChunks() {
    chunks = [];
    var main = document.getElementById("main") || document.querySelector("main");
    if (!main) return;
    var selector = "h1, h2, h3, h4, p, li, dt, dd, caption, .due, th, td";
    var nodes = main.querySelectorAll(selector);
    nodes.forEach(function (el) {
      if (el.closest("[data-no-read]")) return;
      // Skip elements nested inside another already-captured block (e.g. <li> inside <p>)
      var txt = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!txt) return;
      chunks.push({ el: el, text: txt });
    });
  }

  function startReading() {
    buildChunks();
    if (!chunks.length) return;
    idx = 0;
    reading = true;
    paused = false;
    document.getElementById("reader-bar").classList.add("active");
    updateStartBtn(true);
    setStatus("Reading…");
    setPauseLabel();
    speakFrom(0);
  }

  function speakFrom(startIdx) {
    if (startIdx >= chunks.length) { finishReading(); return; }
    idx = startIdx;
    clearHighlight();
    var chunk = chunks[idx];
    highlight(chunk.el);
    var u = new SpeechSynthesisUtterance(chunk.text);
    var v = chosenVoice();
    if (v) { u.voice = v; u.lang = v.lang; }
    var rate = document.getElementById("reader-rate");
    u.rate = rate ? parseFloat(rate.value) || 1 : 1;
    u.onend = function () {
      if (!reading || paused) return;
      idx++;
      setStatus("Reading… (" + Math.min(idx + 1, chunks.length) + " / " + chunks.length + ")");
      speakFrom(idx);
    };
    u.onerror = function () {
      if (!reading) return;
      idx++;
      speakFrom(idx);
    };
    synth.speak(u);
  }

  function togglePause() {
    if (!reading) return;
    if (paused) {
      paused = false;
      synth.resume();
      setStatus("Reading…");
      setPauseLabel();
    } else {
      paused = true;
      synth.pause();
      setStatus("Paused");
      setPauseLabel();
    }
  }

  function stopReading() {
    reading = false;
    paused = false;
    if (synth) synth.cancel();
    clearHighlight();
    var bar = document.getElementById("reader-bar");
    if (bar) bar.classList.remove("active");
    updateStartBtn(false);
    setStatus("");
  }

  function finishReading() {
    reading = false;
    paused = false;
    clearHighlight();
    setStatus("Finished");
    setPauseLabel();
    updateStartBtn(false);
    setTimeout(function () {
      var bar = document.getElementById("reader-bar");
      if (bar && !reading) bar.classList.remove("active");
    }, 2500);
  }

  function setPauseLabel() {
    var b = document.getElementById("reader-playpause");
    if (b) b.textContent = paused ? "▶ Resume" : "⏸ Pause";
  }

  function updateStartBtn(active) {
    var b = document.getElementById("read-aloud");
    if (!b) return;
    b.setAttribute("aria-pressed", String(active));
    var lbl = b.querySelector(".label");
    if (lbl) lbl.textContent = active ? "Stop reading" : "Read aloud";
  }

  function setStatus(msg) {
    var s = document.getElementById("reader-status");
    if (s) s.textContent = msg;
  }

  var lastEl = null;
  function highlight(el) {
    lastEl = el;
    el.classList.add("tts-reading");
    try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {}
  }
  function clearHighlight() {
    if (lastEl) { lastEl.classList.remove("tts-reading"); lastEl = null; }
    var any = document.querySelectorAll(".tts-reading");
    any.forEach(function (n) { n.classList.remove("tts-reading"); });
  }
})();
