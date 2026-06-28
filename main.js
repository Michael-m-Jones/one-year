/* =========================================================
   One Year of Us — interactions
   ========================================================= */
(function () {
  "use strict";

  const PASSWORD = "love"; // the word that started it all

  const gate = document.getElementById("gate");
  const gateForm = document.getElementById("gate-form");
  const gateInput = document.getElementById("gate-input");
  const gateError = document.getElementById("gate-error");
  const intro = document.getElementById("intro");
  const experience = document.getElementById("experience");
  const song = document.getElementById("song");
  const musicToggle = document.getElementById("music-toggle");

  /* ---------- 1. PASSWORD GATE ---------- */
  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const val = (gateInput.value || "").trim().toLowerCase();
    if (val === PASSWORD) {
      gate.style.transition = "opacity .6s ease";
      gate.style.opacity = "0";
      setTimeout(function () {
        gate.classList.add("hidden");
        intro.classList.remove("hidden");
      }, 600);
    } else {
      gateError.textContent = "not quite — think about the word ♡";
      gateError.classList.add("show");
      gateInput.value = "";
      setTimeout(function () { gateError.classList.remove("show"); }, 500);
    }
  });
  gateInput.focus();

  /* ---------- 2. INTRO / ENTER ---------- */
  function enterExperience(withSound) {
    if (withSound && song) {
      song.volume = 0;
      const p = song.play();
      if (p && p.then) {
        p.then(function () { fadeVolume(song, 0.55, 1500); musicToggle.classList.remove("paused"); })
         .catch(function () {/* autoplay blocked; toggle remains */});
      }
    } else if (song) {
      musicToggle.classList.add("paused");
    }
    intro.style.transition = "opacity .7s ease";
    intro.style.opacity = "0";
    setTimeout(function () {
      intro.classList.add("hidden");
      experience.classList.remove("hidden");
      musicToggle.classList.remove("hidden");
      initExperience();
    }, 700);
  }
  document.getElementById("enter-sound").addEventListener("click", function () { enterExperience(true); });
  document.getElementById("enter-silent").addEventListener("click", function () { enterExperience(false); });

  function fadeVolume(audio, target, ms) {
    const steps = 30, stepT = ms / steps, start = audio.volume;
    let i = 0;
    const id = setInterval(function () {
      i++; audio.volume = Math.min(1, Math.max(0, start + (target - start) * (i / steps)));
      if (i >= steps) clearInterval(id);
    }, stepT);
  }

  /* ---------- MUSIC TOGGLE ---------- */
  musicToggle.addEventListener("click", function () {
    if (!song) return;
    if (song.paused) {
      song.play(); musicToggle.classList.remove("paused"); fadeVolume(song, 0.55, 600);
    } else {
      song.pause(); musicToggle.classList.add("paused");
    }
  });

  /* ---------- 3. EXPERIENCE (smooth scroll + animations) ---------- */
  let started = false;
  function initExperience() {
    if (started) return; started = true;

    // Lenis smooth scroll
    let lenis;
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      if (window.ScrollTrigger) {
        lenis.on("scroll", ScrollTrigger.update);
      }
    }

    // GSAP reveals + parallax
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      // staggered reveal timing for grouped reveals inside a section
      gsap.utils.toArray("[data-section]").forEach(function (sec) {
        const items = sec.querySelectorAll(".reveal");
        items.forEach(function (el, i) { el.style.transitionDelay = (i * 0.08) + "s"; });
      });

      // Reveal-on-enter via IntersectionObserver — fires for above-the-fold
      // elements on load (ScrollTrigger onEnter does not), so the hero animates in.
      var revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      document.querySelectorAll(".reveal").forEach(function (el) { revealIO.observe(el); });

      // moments slide in
      gsap.utils.toArray("[data-moment]").forEach(function (m) {
        const media = m.querySelector(".moment-media");
        const text = m.querySelector(".moment-text");
        gsap.from(media, { autoAlpha: 0, y: 60, duration: 1, ease: "power3.out",
          scrollTrigger: { trigger: m, start: "top 78%" } });
        gsap.from(text, { autoAlpha: 0, y: 40, duration: 1, delay: .12, ease: "power3.out",
          scrollTrigger: { trigger: m, start: "top 78%" } });
      });

      // gallery items
      gsap.utils.toArray(".g-item").forEach(function (g, i) {
        gsap.from(g, { autoAlpha: 0, scale: .92, duration: .9, ease: "power3.out",
          scrollTrigger: { trigger: g, start: "top 90%" } });
      });

      // simple parallax
      gsap.utils.toArray("[data-parallax]").forEach(function (el) {
        const amt = parseFloat(el.getAttribute("data-parallax")) || 0.2;
        gsap.to(el, { yPercent: amt * 100, ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      });
    } else {
      // fallback: just reveal everything
      document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
    }

    initCounters();
  }

  /* ---------- 4. NUMBER COUNTERS ---------- */
  function initCounters() {
    document.querySelectorAll("[data-count-from]").forEach(function (el) {
      const start = new Date(el.getAttribute("data-count-from"));
      const days = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
      animateNumber(el, days);
    });
    document.querySelectorAll("[data-count-to]").forEach(function (el) {
      const raw = el.getAttribute("data-count-to");
      if (raw === "∞") { el.textContent = "∞"; return; }
      animateNumber(el, parseInt(raw, 10) || 0);
    });
  }
  function animateNumber(el, target) {
    let fired = false;
    function run() {
      if (fired) return; fired = true;
      const dur = 1600, t0 = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(eased * target).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
    if (window.ScrollTrigger) {
      ScrollTrigger.create({ trigger: el, start: "top 90%", onEnter: run });
    } else { run(); }
  }

  /* ---------- 5. MOUSE TRAIL (desktop) ---------- */
  (function trail() {
    const canvas = document.getElementById("trail");
    if (!canvas || window.matchMedia("(max-width:760px)").matches) return;
    const ctx = canvas.getContext("2d");
    let w, h, pts = [];
    function size() { w = canvas.width = innerWidth; h = canvas.height = innerHeight; }
    size(); addEventListener("resize", size);
    addEventListener("mousemove", function (e) {
      pts.push({ x: e.clientX, y: e.clientY, life: 1 });
      if (pts.length > 40) pts.shift();
    });
    function loop() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]; p.life -= 0.025;
        if (p.life <= 0) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 * p.life, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(111,160,255," + (p.life * 0.5) + ")";
        ctx.fill();
      }
      pts = pts.filter(function (p) { return p.life > 0; });
      requestAnimationFrame(loop);
    }
    loop();
  })();

})();
