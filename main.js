/* =========================================================
   One Year of Us — interactions (v2: journey edition)
   ========================================================= */
(function () {
  "use strict";

  const PASSWORD = "love";
  const UKEY = "oneyear_unlocked"; // session flag so reloads don't re-prompt

  const gate = document.getElementById("gate");
  const gateForm = document.getElementById("gate-form");
  const gateInput = document.getElementById("gate-input");
  const gateError = document.getElementById("gate-error");
  const intro = document.getElementById("intro");
  const experience = document.getElementById("experience");
  const song = document.getElementById("song");
  const musicToggle = document.getElementById("music-toggle");
  const progress = document.getElementById("progress");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = window.matchMedia("(max-width: 760px)").matches;
  const heavy = !reduceMotion && !isSmall; // scrub parallax only where it's smooth
  const refreshScroll = debounce(function () {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }, 160);

  let unlocked = false;
  try { unlocked = sessionStorage.getItem(UKEY) === "1"; } catch (e) {}

  /* ---------- ENTRY: skip the gate if already unlocked this session ---------- */
  if (unlocked) {
    if (gate) gate.remove();
    if (intro) intro.remove();
    experience.classList.remove("hidden");
    if (musicToggle) { musicToggle.classList.remove("hidden"); musicToggle.classList.add("paused"); }
    requestAnimationFrame(initExperience);
  } else {
    setupGate();
  }

  /* ---------- 1. PASSWORD GATE ---------- */
  function setupGate() {
    gateForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const val = (gateInput.value || "").trim().toLowerCase();
      if (val === PASSWORD) {
        try { sessionStorage.setItem(UKEY, "1"); } catch (e) {}
        gate.style.transition = "opacity .6s ease";
        gate.style.opacity = "0";
        setTimeout(function () { gate.remove(); intro.classList.remove("hidden"); }, 600);
      } else {
        gateError.textContent = "not quite — think about the word ♡";
        gateError.classList.add("show");
        gateInput.value = "";
        setTimeout(function () { gateError.classList.remove("show"); }, 500);
      }
    });
    gateInput.focus();
    setupIntro();
  }

  /* ---------- 2. INTRO / ENTER ---------- */
  function setupIntro() {
    document.getElementById("enter-sound").addEventListener("click", function () { enterExperience(true); });
    document.getElementById("enter-silent").addEventListener("click", function () { enterExperience(false); });
  }
  function enterExperience(withSound) {
    if (withSound && song) {
      song.volume = 0;
      const p = song.play();
      if (p && p.then) {
        p.then(function () { fadeVolume(song, 0.55, 1500); musicToggle.classList.remove("paused"); })
         .catch(function () { musicToggle.classList.add("paused"); });
      }
    } else if (song) {
      musicToggle.classList.add("paused");
    }
    intro.style.transition = "opacity .7s ease";
    intro.style.opacity = "0";
    setTimeout(function () {
      intro.remove();
      experience.classList.remove("hidden");
      musicToggle.classList.remove("hidden");
      initExperience();
    }, 700);
  }
  function fadeVolume(audio, target, ms) {
    const steps = 30, stepT = ms / steps, start = audio.volume;
    let i = 0;
    const id = setInterval(function () {
      i++; audio.volume = Math.min(1, Math.max(0, start + (target - start) * (i / steps)));
      if (i >= steps) clearInterval(id);
    }, stepT);
  }

  /* ---------- MUSIC TOGGLE ---------- */
  if (musicToggle) {
    musicToggle.addEventListener("click", function () {
      if (!song) return;
      if (song.paused) { song.play(); musicToggle.classList.remove("paused"); fadeVolume(song, 0.55, 600); }
      else { song.pause(); musicToggle.classList.add("paused"); }
    });
  }

  /* ---------- 3. EXPERIENCE ---------- */
  let started = false;
  function initExperience() {
    if (started) return; started = true;
    document.body.classList.add("entered");

    // Lenis smooth scroll, driven by GSAP ticker (canonical integration)
    let lenis = null;
    if (window.Lenis && !reduceMotion) {
      lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
      lenis.on("scroll", function () { if (window.ScrollTrigger) ScrollTrigger.update(); });
    }
    if (window.gsap) {
      gsap.ticker.add(function (t) { if (lenis) lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    const hasGSAP = window.gsap && window.ScrollTrigger;
    if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
    setupImageLoading();

    /* --- Entrance reveals: IntersectionObserver adds .in (fires for above-the-fold) --- */
    // Tag moment text with directional reveals. Frames stay unmasked so photos always paint.
    document.querySelectorAll("[data-moment]").forEach(function (m) {
      const reverse = m.classList.contains("reverse");
      const text = m.querySelector(".moment-text");
      if (text) text.classList.add(reverse ? "r-right" : "r-left");
    });
    // milestone word is animated by GSAP scrub instead of the fade system
    const mWord = document.querySelector(".milestone-word");
    if (mWord && heavy && hasGSAP) mWord.classList.remove("reveal");

    // stagger timing for grouped reveals
    document.querySelectorAll("[data-section]").forEach(function (sec) {
      sec.querySelectorAll(".reveal").forEach(function (el, i) { el.style.transitionDelay = (i * 0.08) + "s"; });
    });

    const revealEls = document.querySelectorAll(".reveal, .r-clip, .r-left, .r-right");
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: "0px 0px 10% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });

    /* --- Scroll-driven cinematic effects (the "journey" feel) --- */
    if (hasGSAP && heavy) {
      // Pinned opening: the memory book opens, then the viewer dives into the story.
      if (document.querySelector(".book-stage")) {
        gsap.set(".book-orbit", { rotateX: 58, rotateZ: -4, y: 44, scale: 0.92 });
        gsap.set(".book-spread", { opacity: 0.54, scale: 0.78, y: 34 });
        gsap.set(".book-cover", { rotateY: 0, x: 0 });
        gsap.set(".memory-card", { autoAlpha: 0, y: 40, scale: 0.78, rotateZ: function (i) { return [-18, 16, 12, -20][i] || 0; } });
        gsap.set(".hero-content", { autoAlpha: 0, y: 72, scale: 0.95 });

        const openBook = gsap.timeline({
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "+=185%",
            scrub: 0.65,
            pin: true,
            anticipatePin: 1
          }
        });

        openBook
          .to(".memory-card", { autoAlpha: 0.82, y: 0, scale: 1, stagger: 0.035, ease: "power2.out", duration: 0.2 }, 0)
          .to(".book-orbit", { rotateX: 52, rotateZ: -8, y: 8, scale: 1.08, ease: "power1.out", duration: 0.22 }, 0)
          .to(".book-cover", { rotateY: -146, x: -8, ease: "power2.inOut", duration: 0.36 }, 0.08)
          .to(".book-spread", { opacity: 1, scale: 1.1, y: -10, ease: "power2.out", duration: 0.36 }, 0.1)
          .to(".card-a", { x: -120, y: -70, rotateZ: -31, scale: 1.18, ease: "power1.inOut", duration: 0.38 }, 0.18)
          .to(".card-b", { x: 120, y: -74, rotateZ: 26, scale: 1.16, ease: "power1.inOut", duration: 0.38 }, 0.18)
          .to(".card-c", { x: -140, y: 94, rotateZ: 22, scale: 1.12, ease: "power1.inOut", duration: 0.38 }, 0.18)
          .to(".card-d", { x: 130, y: 86, rotateZ: -28, scale: 1.13, ease: "power1.inOut", duration: 0.38 }, 0.18)
          .to(".portal-haze", { scale: 1.28, opacity: 1, ease: "power1.out", duration: 0.32 }, 0.14)
          .to(".memory-card", { autoAlpha: 0, scale: 1.75, filter: "blur(8px) brightness(1.3)", ease: "power2.in", duration: 0.25 }, 0.5)
          .to(".book-stage", { scale: 2.65, yPercent: -5, autoAlpha: 0, ease: "power2.in", duration: 0.36 }, 0.48)
          .to(".hero-photo", { scale: 1.42, yPercent: 8, filter: "saturate(1.18) brightness(.92)", ease: "power1.inOut", duration: 0.38 }, 0.46)
          .to(".hero-content", { autoAlpha: 1, y: 0, scale: 1, ease: "power2.out", duration: 0.28 }, 0.66)
          .to(".hero-content", { yPercent: -32, opacity: 0, ease: "none", duration: 0.2 }, 0.92);
      }

      // Parallax inside each moment photo (depth)
      document.querySelectorAll("[data-moment] .frame img").forEach(function (img) {
        const frame = img.closest(".frame");
        gsap.fromTo(img, { yPercent: -10, scale: 1.18 }, { yPercent: 10, scale: 1.18, ease: "none",
          scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: true } });
      });

      // Text breathes against the image motion, creating a more guided story beat.
      document.querySelectorAll("[data-moment] .moment-text").forEach(function (text) {
        gsap.fromTo(text, { yPercent: 10 }, { yPercent: -10, ease: "none",
          scrollTrigger: { trigger: text.closest("[data-moment]"), start: "top bottom", end: "bottom top", scrub: true } });
      });

      // Whole memories drift as physical pages, without masking the actual photos.
      document.querySelectorAll("[data-moment] .moment-media").forEach(function (media, i) {
        const dir = media.closest(".moment").classList.contains("reverse") ? -1 : 1;
        gsap.fromTo(media, { rotateZ: dir * -2.5, y: 36 },
          { rotateZ: dir * 2.5, y: -36, ease: "none",
            scrollTrigger: { trigger: media.closest("[data-moment]"), start: "top bottom", end: "bottom top", scrub: true } });
        gsap.to(media, { filter: "drop-shadow(0 42px 46px rgba(0,0,0,.38))", duration: 0.4,
          scrollTrigger: { trigger: media.closest("[data-moment]"), start: "top 70%", end: "top 35%", scrub: true } });
      });

      // Chapter titles drift a touch (parallax)
      document.querySelectorAll(".chapter-title").forEach(function (t) {
        gsap.fromTo(t, { yPercent: 14 }, { yPercent: -14, ease: "none",
          scrollTrigger: { trigger: t.closest("[data-section]"), start: "top bottom", end: "bottom top", scrub: true } });
      });

      // Milestone "Official" grows + brightens as you scroll through it
      if (mWord) {
        gsap.fromTo(mWord, { scale: 0.72, opacity: 0.15, letterSpacing: "0.25em" },
          { scale: 1, opacity: 1, letterSpacing: "0em", ease: "none",
            scrollTrigger: { trigger: ".milestone", start: "top 85%", end: "center center", scrub: true } });
      }

      // Photo wall erupts upward like the book spilling open.
      gsap.fromTo(".wall img", { y: 120, rotateZ: function (i) { return (i % 2 ? 7 : -7); }, scale: 0.92 },
        { y: 0, rotateZ: 0, scale: 1, stagger: 0.035, ease: "power2.out",
          scrollTrigger: { trigger: ".wall-sec", start: "top 78%", end: "top 24%", scrub: 0.7 } });
    }

    /* --- Scroll progress bar --- */
    if (progress && hasGSAP) {
      ScrollTrigger.create({ start: 0, end: "max",
        onUpdate: function (self) { progress.style.transform = "scaleX(" + self.progress.toFixed(4) + ")"; } });
    }

    /* --- Keep ScrollTrigger aligned as lazy images load --- */
    if (hasGSAP) {
      document.querySelectorAll("img").forEach(function (im) {
        if (im.complete) return;
        im.addEventListener("load", refreshScroll);
      });
      window.addEventListener("load", refreshScroll);
    }

    initCounters();
  }

  /* ---------- 3A. IMAGE LOADING: keep the scroll story from outrunning photos ---------- */
  function setupImageLoading() {
    const imgs = Array.prototype.slice.call(document.querySelectorAll("img"));
    const urls = [];

    imgs.forEach(function (img, i) {
      const src = img.currentSrc || img.getAttribute("src");
      if (!src) return;
      if (urls.indexOf(src) === -1) urls.push(src);

      img.decoding = "async";
      img.loading = i < 4 ? "eager" : (img.loading || "lazy");
      if (i < 4 && "fetchPriority" in img) img.fetchPriority = "high";
      if (img.complete && img.naturalWidth > 0) markImageReady(img);
      else {
        img.addEventListener("load", function () { markImageReady(img); }, { once: true });
        img.addEventListener("error", function () { img.classList.add("load-error"); }, { once: true });
      }
    });

    // The site is photo-led and the optimized photo set is small, so warming all unique
    // URLs avoids blank beats on fast scroll and on GitHub Pages' first load.
    runWhenIdle(function () {
      urls.forEach(function (src) {
        const preloader = new Image();
        preloader.decoding = "async";
        preloader.onload = refreshScroll;
        preloader.src = src;
        if (preloader.decode) preloader.decode().then(refreshScroll).catch(noop);
      });
    });
  }

  function markImageReady(img) {
    img.classList.add("is-loaded");
    const frame = img.closest(".frame");
    if (frame) frame.classList.add("is-loaded");
    refreshScroll();
  }

  /* ---------- 4. NUMBER COUNTERS (IntersectionObserver — reliable) ---------- */
  function initCounters() {
    document.querySelectorAll(".num").forEach(function (el) {
      const from = el.getAttribute("data-count-from");
      const to = el.getAttribute("data-count-to");
      let target = null;
      if (from) {
        const start = new Date(from);
        target = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
      } else if (to) {
        if (to === "∞") { el.textContent = "∞"; return; }
        target = parseInt(to, 10) || 0;
      }
      if (target === null) return;
      el.textContent = "0";
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { countUp(el, target); io.disconnect(); } });
      }, { threshold: 0.35 });
      io.observe(el);
    });
  }
  function countUp(el, target) {
    const dur = 1600, t0 = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function debounce(fn, wait) {
    let id = null;
    return function () {
      clearTimeout(id);
      id = setTimeout(fn, wait);
    };
  }
  function runWhenIdle(fn) {
    if ("requestIdleCallback" in window) requestIdleCallback(fn, { timeout: 900 });
    else setTimeout(fn, 450);
  }
  function noop() {}

  /* ---------- 5. HEART TRAIL (desktop) ---------- */
  (function trail() {
    const canvas = document.getElementById("trail");
    if (!canvas || isSmall || reduceMotion) return;
    const ctx = canvas.getContext("2d");
    const colors = ["#9cc0ff", "#ff9fb6", "#ffd27a", "#f6f2e9"];
    let w, h, dpr = 1, particles = [], last = null;

    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.width = Math.floor(innerWidth * dpr);
      h = canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); addEventListener("resize", size);

    addEventListener("pointermove", function (e) {
      const now = performance.now();
      const dx = last ? e.clientX - last.x : 0;
      const dy = last ? e.clientY - last.y : 0;
      const speed = Math.min(32, Math.hypot(dx, dy));
      if (!last || speed > 5 || now - last.t > 55) {
        addHeart(e.clientX, e.clientY, dx, dy, speed);
        if (speed > 14) addSpark(e.clientX, e.clientY, dx, dy);
        last = { x: e.clientX, y: e.clientY, t: now };
      }
    }, { passive: true });

    addEventListener("pointerdown", function (e) {
      for (let i = 0; i < 14; i++) {
        const angle = (Math.PI * 2 * i) / 14;
        particles.push({
          type: i % 3 ? "spark" : "heart",
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * (1.2 + Math.random() * 2.8),
          vy: Math.sin(angle) * (1.2 + Math.random() * 2.8),
          size: 8 + Math.random() * 12,
          life: 1,
          decay: 0.012 + Math.random() * 0.01,
          rot: angle,
          spin: (Math.random() - 0.5) * 0.12,
          color: colors[i % colors.length]
        });
      }
    });

    function addHeart(x, y, dx, dy, speed) {
      particles.push({
        type: "heart",
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: -dx * 0.018 + (Math.random() - 0.5) * 1.1,
        vy: -dy * 0.018 - 0.35 - Math.random() * 0.8,
        size: 9 + Math.random() * 11 + speed * 0.24,
        life: 1,
        decay: 0.011 + Math.random() * 0.008,
        rot: Math.atan2(dy, dx || 1) + (Math.random() - 0.5) * 0.9,
        spin: (Math.random() - 0.5) * 0.08,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
      if (particles.length > 130) particles.splice(0, particles.length - 130);
    }

    function addSpark(x, y, dx, dy) {
      particles.push({
        type: "spark",
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: -dx * 0.012 + (Math.random() - 0.5) * 1.8,
        vy: -dy * 0.012 + (Math.random() - 0.5) * 1.8,
        size: 3 + Math.random() * 6,
        life: 1,
        decay: 0.018 + Math.random() * 0.018,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.16,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    function drawHeart(p) {
      const s = p.size / 18;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-18, -8, -9, -24, 0, -12);
      ctx.bezierCurveTo(9, -24, 18, -8, 0, 5);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 18 * p.life;
      ctx.globalAlpha = Math.max(0, p.life) * 0.92;
      ctx.fill();
      ctx.restore();
    }

    function drawSpark(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life) * 0.86;
      ctx.lineWidth = 1.7;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(p.size, 0);
      ctx.moveTo(0, -p.size);
      ctx.lineTo(0, p.size);
      ctx.stroke();
      ctx.restore();
    }

    function loop() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life -= p.decay;
        if (p.life <= 0) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 - 0.006;
        p.rot += p.spin;
        if (p.type === "heart") drawHeart(p);
        else drawSpark(p);
      }
      particles = particles.filter(function (p) { return p.life > 0; });
      requestAnimationFrame(loop);
    }
    loop();
  })();

})();
