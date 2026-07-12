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

  // reloads (incl. the finale replay button) must start the film from the top.
  // scrollRestoration alone isn't enough — the browser's own async restore can
  // still win a race against it and land back where the reload was triggered
  // (e.g. the finale, at the bottom), so pin scroll to 0 across the frames
  // where that restore actually happens.
  try { history.scrollRestoration = "manual"; } catch (e) {}
  (function lockScrollTop() {
    const pin = function () { if (scrollY !== 0) window.scrollTo(0, 0); };
    pin();
    addEventListener("load", pin);
    addEventListener("pageshow", pin);
    requestAnimationFrame(function () { pin(); requestAnimationFrame(pin); });
    setTimeout(pin, 60);
    setTimeout(pin, 300);
  })();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = window.matchMedia("(max-width: 760px)").matches;
  const heavy = !reduceMotion && !isSmall; // scrub parallax only where it's smooth
  const refreshScroll = debounce(function () {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }, 160);
  const performanceState = {
    fastScroll: false,
    fastUntil: 0,
    qualityRaf: 0,
    lastY: 0,
    lastT: 0,
    movingUntil: 0
  };
  const FAST_SCROLL_ENTER = 1250;

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
      lenis = new Lenis({ lerp: 0.15, smoothWheel: true });
      lenis.on("scroll", function (e) {
        markScrollVelocity(e && e.velocity ? Math.abs(e.velocity) * 3 : 0);
        if (window.ScrollTrigger) ScrollTrigger.update();
      });
    }
    if (window.gsap) {
      gsap.ticker.add(function (t) { if (lenis) lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(500, 33);
    }

    const hasGSAP = window.gsap && window.ScrollTrigger;
    if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
    setupImageLoading();
    setupScrollQuality(lenis);
    setupPhotoViewer(hasGSAP);
    setupLetter(hasGSAP, lenis);
    setupPhotoTilt();
    setupAmbientStory(hasGSAP);
    setupJourneyCanvas(hasGSAP);
    setupOpeningFilm(hasGSAP, heavy, lenis); // before the reveal system: the film owns the hero copy
    setupJourneyEnhancements(hasGSAP); // also before it: chapter/milestone/finale own their reveals now
    setupRecapStrip(hasGSAP);
    setupMarquee(hasGSAP);
    setupJourneyRail(lenis);
    setupVelocityFeel(hasGSAP);

    /* --- Entrance reveals: IntersectionObserver adds .in (fires for above-the-fold) --- */
    // Tag moment text with directional reveals. Frames stay unmasked so photos always paint.
    document.querySelectorAll("[data-moment]").forEach(function (m) {
      const reverse = m.classList.contains("reverse");
      const text = m.querySelector(".moment-text");
      if (text) text.classList.add(reverse ? "r-right" : "r-left");
    });
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
      // Parallax inside each moment photo (depth)
      document.querySelectorAll("[data-moment] .frame img").forEach(function (img) {
        const frame = img.closest(".frame");
        gsap.fromTo(img, { yPercent: -10, scale: 1.18 }, { yPercent: 10, scale: 1.18, ease: "none",
          scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: true } });
      });

      gsap.set("[data-moment]", { perspective: 1400 });
      gsap.set("[data-moment] .moment-media, [data-moment] .moment-text", {
        transformStyle: "preserve-3d",
        transformPerspective: 1200
      });

      // Text breathes against the image motion, creating a more guided story beat.
      document.querySelectorAll("[data-moment] .moment-text").forEach(function (text, i) {
        const dir = text.closest(".moment").classList.contains("reverse") ? -1 : 1;
        gsap.fromTo(text, { yPercent: 10, z: 12, rotateY: dir * -2.5 },
          { yPercent: -10, z: 74, rotateY: dir * 2.5, ease: "none",
          scrollTrigger: { trigger: text.closest("[data-moment]"), start: "top bottom", end: "bottom top", scrub: true } });
      });

      // Whole memories drift as physical pages, without masking the actual photos.
      document.querySelectorAll("[data-moment] .moment-media").forEach(function (media, i) {
        const dir = media.closest(".moment").classList.contains("reverse") ? -1 : 1;
        gsap.fromTo(media, { rotateZ: dir * -3, rotateY: dir * 7, rotateX: -2, y: 42, z: -80 },
          { rotateZ: dir * 2.8, rotateY: dir * -7, rotateX: 2, y: -42, z: 70, ease: "none",
            scrollTrigger: { trigger: media.closest("[data-moment]"), start: "top bottom", end: "bottom top", scrub: true } });
      });

      // Chapter titles drift a touch (parallax)
      document.querySelectorAll(".chapter-title").forEach(function (t) {
        gsap.fromTo(t, { yPercent: 14 }, { yPercent: -14, ease: "none",
          scrollTrigger: { trigger: t.closest("[data-section]"), start: "top bottom", end: "bottom top", scrub: true } });
      });

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

  function setupScrollQuality(lenis) {
    if (reduceMotion) return;
    performanceState.lastY = scrollY;
    performanceState.lastT = performance.now();

    addEventListener("wheel", function (e) {
      markScrollVelocity(Math.abs(e.deltaY || 0));
    }, { passive: true });

    addEventListener("touchmove", function () {
      markScrollVelocity(FAST_SCROLL_ENTER + 120);
    }, { passive: true });

    if (!lenis) {
      addEventListener("scroll", function () {
        const now = performance.now();
        const dt = Math.max(16, now - performanceState.lastT);
        const dy = Math.abs(scrollY - performanceState.lastY);
        performanceState.lastY = scrollY;
        performanceState.lastT = now;
        markScrollVelocity((dy / dt) * 16.67);
      }, { passive: true });
    }
  }

  function markScrollVelocity(velocity) {
    if (reduceMotion || document.body.classList.contains("book-intro-playing")) return;
    const now = performance.now();
    if (velocity > 4) performanceState.movingUntil = now + 320;
    if (velocity < FAST_SCROLL_ENTER && !performanceState.fastScroll) return;
    if (velocity >= FAST_SCROLL_ENTER) performanceState.fastUntil = now + 420;
    if (!performanceState.qualityRaf) {
      performanceState.qualityRaf = requestAnimationFrame(updateScrollQuality);
    }
  }

  function updateScrollQuality() {
    performanceState.qualityRaf = 0;
    const isFast = performance.now() < performanceState.fastUntil;
    if (performanceState.fastScroll !== isFast) {
      performanceState.fastScroll = isFast;
      document.body.classList.toggle("scrolling-fast", isFast);
    }
    if (isFast) performanceState.qualityRaf = requestAnimationFrame(updateScrollQuality);
  }

  /* ---------- 3½. THE OPENING FILM: a real 3D storybook ----------
     Geometry: the book occupies the RIGHT half of .book-scene; the spine is
     the hinge at its left edge. The cover and each leaf rotate a full -180°
     and land flat on the left, so every turn reveals genuinely new pages.
     The z constants mirror --stack / --z-base in style.css.               */
  function setupOpeningFilm(hasGSAP, heavy, lenis) {
    const bookStage = document.querySelector(".book-stage");
    if (!bookStage) return;

    const rootEl = document.documentElement;
    const skipBtn = document.getElementById("intro-skip");
    const canPlay = hasGSAP && !reduceMotion; // plays on mobile too now
    rootEl.style.setProperty("--book-progress", canPlay ? "0" : "1");

    if (!canPlay) {
      bookStage.classList.add("book-static");
      if (skipBtn) skipBtn.remove();
      return;
    }

    const N = document.querySelectorAll(".book-stage .leaf").length;
    const Z = isSmall
      ? { base: 11, gap: 0.9, coverPad: 2.2, coverLand: 3, landBase: 5.2, landStep: 1.8, lift: 26, coverLift: 22, dive: 2.6 }
      : { base: 18, gap: 1.3, coverPad: 2.8, coverLand: 4, landBase: 7, landStep: 2.2, lift: 50, coverLift: 40, dive: 3.0 };
    const leafIdle = function (i) { return Z.base + (N - i + 1) * Z.gap; };  // resting height in the right-side stack
    const leafLand = function (i) { return Z.landBase + i * Z.landStep; };   // each landed page stacks above the last
    const coverZ = leafIdle(1) + Z.coverPad;
    // pin the CSS depth vars to THIS breakpoint's constants, so a resize/rotation
    // mid-film can't flip the media query and sink the leaves under the base page
    const bookEl = bookStage.querySelector(".book");
    if (bookEl) {
      bookEl.style.setProperty("--z-base", Z.base + "px");
      bookEl.style.setProperty("--stack", (coverZ - 2).toFixed(1) + "px");
    }
    // pacing: the whole reel is driven by these numbers.
    // Each page turn is two explicit segments so the tail never rushes:
    // TURN_LIFT swings the page up past vertical (brisk, like a real flick),
    // TURN_FALL is the long, continuously-decelerating settle onto the stack (no snap).
    const OPEN_AT = 1.25, OPEN_DUR = 2.3, READ = 2.0, TURN_LIFT = 0.55, TURN_FALL = 1.3;
    const TURN = TURN_LIFT + TURN_FALL;
    const turnAt = function (i) { return OPEN_AT + OPEN_DUR + READ + (i - 1) * (TURN + READ); };
    const diveAt = turnAt(N) + TURN + READ + 0.3;

    window.scrollTo(0, 0);
    document.body.classList.add("book-intro-playing");
    if (lenis && typeof lenis.stop === "function") lenis.stop();

    // GSAP owns the hero copy during the film (keep the IO reveal system away)
    const heroBits = gsap.utils.toArray(".hero-content .reveal");
    heroBits.forEach(function (el) { el.classList.remove("reveal"); });

    gsap.set(".book-scene, .book-root, .cover, .leaf", { force3D: true });
    gsap.set(".book-scene", { rotationX: 56, rotationY: -11, rotationZ: -5, scale: 0.96, transformOrigin: "50% 54%" });
    gsap.set(".book-root", { xPercent: -25, y: 30, transformOrigin: "50% 50%" });
    gsap.set(".cover", { z: coverZ, rotationY: 0, transformOrigin: "0% 50%" });
    for (let i = 1; i <= N; i++) gsap.set(".leaf-" + i, { z: leafIdle(i), rotationY: 0, transformOrigin: "0% 50%" });
    gsap.set(".book-ground", { opacity: 0.4, scaleX: 1.1, transformOrigin: "46% 50%" });
    gsap.set(".memory-card", { autoAlpha: 0, y: 18, scale: 0.9, rotation: function (i) { return [-14, 12, 9, -15][i] || 0; } });
    gsap.set(".portal-haze", { opacity: 0.38, scale: 0.92 });
    gsap.set(".hero-photo", { scale: 1.16, transformOrigin: "50% 42%" });
    gsap.set(heroBits, { autoAlpha: 0, y: 36 });
    gsap.set(".cover-gloss", { xPercent: -70 });
    gsap.set(".cover-inside .leaf-shade", { opacity: 0.5 });
    gsap.set(".leaf-1 .leaf-front .page-cast", { opacity: 0.55, scaleX: 1.05 });

    // gentle idle drift so the book never freezes between beats
    const float = gsap.to(".book-float", { y: -7, rotationZ: 0.4, duration: 3.4, yoyo: true, repeat: -1, ease: "sine.inOut", paused: true });

    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: "power2.inOut" },
      onUpdate: function () { rootEl.style.setProperty("--book-progress", tl.progress().toFixed(4)); },
      onComplete: finishFilm
    });

    // I. settle — the closed keepsake catches the light
    tl.to(".book-scene", { rotationX: 33, rotationY: -10, rotationZ: -4, scale: 1, duration: 1.6, ease: "expo.out" }, 0)
      .to(".book-root", { y: 0, duration: 1.6, ease: "expo.out" }, 0)
      .to(".book-ground", { opacity: 0.62, scaleX: 1, duration: 1.2, ease: "sine.out" }, 0.1)
      .to(".portal-haze", { opacity: 0.6, scale: 1.02, duration: 1.5, ease: "sine.out" }, 0.2)
      .to(".cover-gloss", { xPercent: 70, opacity: 0.55, duration: 0.95, ease: "sine.inOut" }, 0.4)
      .to(".cover-gloss", { opacity: 0, duration: 0.3, ease: "sine.out" }, 1.3)

    // II. the cover swings open — slow and ceremonial — while the book recenters
      .add("open", OPEN_AT)
      .to(".cover", { keyframes: { rotationY: [0, -66, -180], z: [coverZ, coverZ + Z.coverLift, Z.coverLand] }, duration: OPEN_DUR, ease: "power1.inOut" }, "open")
      // gold plate + title shimmer into speckles at grazing angles — fade them as the board lifts
      .to(".cover-frame, .cover-kicker, .cover-title, .cover-rule, .cover-name", { opacity: 0, duration: 0.5, ease: "sine.in" }, "open+=0.5")
      .to(".book-root", { xPercent: 0, duration: 2.3, ease: "power1.inOut" }, "open")
      // present the spread nearly face-on while pages are read (kills the foreshortening squish)
      .to(".book-scene", { rotationX: 16, rotationY: -5, rotationZ: -2, duration: 2.6, ease: "sine.inOut" }, "open")
      .to(".cover-inside .leaf-shade", { opacity: 0, duration: 1.2, ease: "sine.out" }, "open+=0.8")
      .to(".leaf-1 .leaf-front .page-cast", { opacity: 0, scaleX: 0.24, duration: 1.5, ease: "sine.inOut" }, "open+=0.55")
      .to(".book-glow", { opacity: 0.42, duration: 0.6, ease: "sine.out" }, "open+=1.5")
      .to(".book-glow", { opacity: 0.15, duration: 0.9, ease: "sine.inOut" }, "open+=2.3")
      .to(".book-ground", { opacity: 0.74, duration: 0.6, ease: "sine.out" }, "open+=1.4")
      .to(".memory-card.card-a, .memory-card.card-b", { autoAlpha: 0.5, y: 0, scale: 0.97, duration: 1.0, stagger: 0.16, ease: "power2.out" }, "open+=1.5")
      // read beat: the dedication + the first spark
      .to(".leaf-1 .leaf-front .page-photo", { scale: 1.03, duration: 1.7, ease: "sine.inOut" }, "open+=2.35");

    // III & IV. the pages turn — unhurried, every spread gets its moment
    for (let i = 1; i <= N; i++) {
      const underCast = i < N ? ".leaf-" + (i + 1) + " .leaf-front .page-cast" : ".base-page .page-cast";
      const landCast = i === 1 ? ".cover-inside .page-cast" : ".leaf-" + (i - 1) + " .leaf-back .page-cast";
      addTurn("turn" + i, ".leaf-" + i, leafIdle(i), leafLand(i), underCast, landCast, turnAt(i));
      // read beat: breathe the freshly revealed pages
      const newRight = i < N ? ".leaf-" + (i + 1) + " .leaf-front .page-photo" : ".base-page .page-photo";
      tl.to(".leaf-" + i + " .leaf-back .page-photo, " + newRight, { scale: 1.03, duration: 1.6, ease: "sine.inOut" }, turnAt(i) + TURN + 0.1);
    }
    tl.to(".memory-card.card-c, .memory-card.card-d", { autoAlpha: 0.5, y: 0, scale: 0.97, duration: 1.0, stagger: 0.16, ease: "power2.out" }, turnAt(1) + 0.85);

    // V. linger on the last spread, then dive into the photo → hero match-cut
    tl.to(".book-glow", { opacity: 0.28, duration: 0.9, ease: "sine.inOut" }, turnAt(N) + TURN + 0.2)
      .add("dive", diveAt)
      .to(".book-scene", { rotationX: 6, rotationY: 0, rotationZ: 0, duration: 1.25, ease: "power3.inOut" }, "dive")
      .to(".book-root", { transformOrigin: "74% 46%", scale: Z.dive, z: 430, duration: 1.25, ease: "power3.in" }, "dive")
      .to(".memory-card", { autoAlpha: 0, scale: 1.12, duration: 0.45, ease: "power1.in" }, "dive")
      .to(".portal-haze", { opacity: 1, scale: 1.5, duration: 1.0, ease: "sine.in" }, "dive+=0.1")
      .to(".book-glow", { opacity: 0.55, duration: 0.65, ease: "sine.in" }, "dive")
      .to(".base-page .page-veil", { opacity: 0.32, duration: 0.75, ease: "sine.in" }, "dive+=0.35")
      .to(".hero-photo", { scale: 1.06, duration: 1.8, ease: "sine.out" }, "dive+=0.6")
      .to(".book-stage", { autoAlpha: 0, duration: 0.55, ease: "power2.in" }, "dive+=0.82")
      .to(".portal-haze", { opacity: 0.82, duration: 0.7, ease: "sine.out" }, "dive+=1.25")

    // VI. the title takes the stage
      .to(heroBits, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.09, ease: "power3.out" }, "dive+=1.15");

    function addTurn(label, leaf, zFrom, zLand, underCast, landCast, at) {
      // Two explicit segments (not the {prop:[a,b,c]} shorthand — that shorthand
      // was compressing almost all the rotation into the tween's final fraction,
      // which read as a hang-then-snap). Segment 1 flicks the page up past
      // vertical; segment 2 is a long, continuously-decelerating fall with no
      // re-acceleration, so it settles instead of slamming shut.
      const s = TURN / 1.45; // rescales the shadow/light beats below, tuned against the old 1.45s turn
      tl.add(label, at)
        .to(leaf, { rotationY: -74, z: zFrom + Z.lift, skewY: -1.7, duration: TURN_LIFT, ease: "power1.in" }, label)
        .to(leaf, { rotationY: -180, z: zLand, skewY: 0, duration: TURN_FALL, ease: "power2.out" }, label + "+=" + TURN_LIFT)
        .to(leaf + " .leaf-front .leaf-shade", { opacity: 0.32, duration: 0.7 * s, ease: "sine.in" }, label)
        .fromTo(leaf + " .leaf-back .leaf-shade", { opacity: 0.5 }, { opacity: 0.06, duration: 0.75 * s, ease: "sine.out" }, label + "+=" + (0.62 * s).toFixed(2))
        .fromTo(underCast, { opacity: 0, scaleX: 0.3 }, { opacity: 0.4, scaleX: 1.05, duration: 0.7 * s, ease: "sine.out" }, label)
        .to(underCast, { opacity: 0, duration: 0.7 * s, ease: "sine.in" }, label + "+=" + (0.7 * s).toFixed(2))
        .fromTo(landCast, { opacity: 0, scaleX: 1.15 }, { opacity: 0.34, scaleX: 1, duration: 0.55 * s, ease: "sine.out" }, label + "+=" + (0.55 * s).toFixed(2))
        .to(landCast, { opacity: 0, duration: 0.45 * s, ease: "sine.out" }, label + "+=" + (1.18 * s).toFixed(2))
        .to(".book-ground", { opacity: 0.82, duration: 0.2, yoyo: true, repeat: 1, ease: "sine.inOut" }, label + "+=" + (1.2 * s).toFixed(2))
        .to(".book-glow", { opacity: 0.3, duration: 0.4, ease: "sine.out" }, label + "+=" + (0.9 * s).toFixed(2))
        .to(".book-glow", { opacity: 0.13, duration: 0.6, ease: "sine.inOut" }, label + "+=" + (1.4 * s).toFixed(2));
    }

    /* skip: one flick, key, or tap on the pill fast-forwards the film */
    let skipping = false;
    function skipFilm() {
      if (skipping || !document.body.classList.contains("book-intro-playing")) return;
      skipping = true;
      if (skipBtn) skipBtn.classList.remove("is-live");
      tl.pause();
      gsap.to(tl, { progress: 1, duration: 1.2, ease: "power1.inOut" });
    }
    function onWheel() { skipFilm(); }
    function onKey(e) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "PageDown") skipFilm();
    }
    let touchY = null;
    function onTouchStart(e) { touchY = e.touches[0] ? e.touches[0].clientY : null; }
    function onTouchMove(e) {
      if (!document.body.classList.contains("book-intro-playing")) return;
      if (e.cancelable) e.preventDefault(); // keep iOS from rubber-banding through the lock
      if (touchY !== null && e.touches[0] && Math.abs(e.touches[0].clientY - touchY) > 26) skipFilm();
    }
    function removeSkipHandlers() {
      removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    }
    addEventListener("wheel", onWheel, { passive: true });
    addEventListener("keydown", onKey);
    addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    if (skipBtn) {
      skipBtn.addEventListener("click", skipFilm);
      setTimeout(function () {
        if (document.body.classList.contains("book-intro-playing")) skipBtn.classList.add("is-live");
      }, 900);
    }

    function finishFilm() {
      rootEl.style.setProperty("--book-progress", "1");
      document.body.classList.remove("book-intro-playing");
      float.kill();
      gsap.set(".book-stage", { display: "none" });
      if (lenis && typeof lenis.start === "function") lenis.start();
      setupHeroExit(); // scroll now walks us out of the photo and into the story
      removeSkipHandlers();
      if (skipBtn) {
        skipBtn.classList.remove("is-live");
        setTimeout(function () { if (skipBtn.parentNode) skipBtn.remove(); }, 500);
      }
      refreshScroll();
    }

    window.__bookFilm = tl; // handy handle for stepping through the sequence

    preloadOpeningAssets(bookStage).then(function () {
      // two RAFs so decode work never overlaps the first animation frames
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { float.play(); tl.play(0); });
      });
    });
  }

  function preloadOpeningAssets(bookStage) {
    const nodes = Array.prototype.slice.call(document.querySelectorAll(".hero-photo"))
      .concat(Array.prototype.slice.call(bookStage.querySelectorAll(".page-photo, .memory-card")));
    const urls = [];

    nodes.forEach(function (el) {
      const url = getBackgroundUrl(el);
      if (url && urls.indexOf(url) === -1) urls.push(url);
    });

    if (!urls.length) return Promise.resolve();
    return Promise.race([
      Promise.all(urls.map(preloadImageUrl)),
      new Promise(function (resolve) { setTimeout(resolve, 1600); })
    ]);
  }

  function getBackgroundUrl(el) {
    const bg = el.style.backgroundImage || getComputedStyle(el).backgroundImage;
    const match = bg && bg.match(/url\((['"]?)(.*?)\1\)/);
    if (!match || !match[2]) return "";
    try { return new URL(match[2], document.baseURI).href; }
    catch (e) { return match[2]; }
  }

  function preloadImageUrl(src) {
    return new Promise(function (resolve) {
      const img = new Image();
      img.decoding = "async";
      img.onload = resolve;
      img.onerror = resolve;
      img.src = src;
      if (img.decode) img.decode().then(resolve).catch(resolve);
    });
  }

  /* ---------- 3¾. THE JOURNEY PASS: scroll choreography after the film ----------
     The film ends inside the Hawaii photo; from there the scroll has to feel like
     stepping out of that photo and walking the year. Everything here is scrub-driven
     so it tracks the reader's hand in both directions.                              */
  function setupHeroExit() {
    // created only after the film finishes (the film owns these elements until then)
    if (setupHeroExit.done || !window.gsap || !window.ScrollTrigger || reduceMotion) return;
    setupHeroExit.done = true;
    const hero = document.querySelector(".cinematic-hero");
    if (!hero) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom 30%", scrub: 0.6 }
    });
    tl.to(".scroll-cue", { autoAlpha: 0, duration: 0.16, ease: "none" }, 0)
      .to(".hero-photo", { scale: 1.26, yPercent: -7, duration: 1, ease: "none" }, 0)
      .to(".portal-haze", { opacity: 0.1, duration: 1, ease: "none" }, 0)
      .to(".hero-content .eyebrow", { yPercent: -220, autoAlpha: 0, duration: 0.75, ease: "none" }, 0)
      .to(".hero-title span", { yPercent: -130, autoAlpha: 0, duration: 0.75, stagger: 0.09, ease: "none" }, 0.06)
      .to(".hero-sub", { yPercent: -90, autoAlpha: 0, duration: 0.75, ease: "none" }, 0.3);
  }

  function setupJourneyEnhancements(hasGSAP) {
    const canAnimate = hasGSAP && !reduceMotion;

    // inked underline beneath every date (draws via CSS once .moment-text gets .in)
    document.querySelectorAll(".moment-date").forEach(function (date) {
      const ink = document.createElement("i");
      ink.className = "date-ink";
      date.appendChild(ink);
    });

    // replay loop: fade out, reload — the session stays unlocked, so the film replays
    const replay = document.getElementById("replay");
    if (replay) {
      replay.addEventListener("click", function () {
        replay.disabled = true;
        document.body.style.transition = "opacity .55s ease";
        document.body.style.opacity = "0";
        setTimeout(function () { location.reload(); }, 580);
      });
    }

    if (!canAnimate) return;

    // chapter interludes: ghost numeral drifts through, the title rises word by
    // word out of a clipped line, and the rule beneath draws itself
    document.querySelectorAll(".chapter").forEach(function (chapter) {
      const num = chapter.querySelector(".chapter-num");
      const title = chapter.querySelector(".chapter-title");

      const digits = num && num.textContent.match(/\d+/);
      if (digits) {
        const ghost = document.createElement("span");
        ghost.className = "chapter-ghost";
        ghost.setAttribute("aria-hidden", "true");
        ghost.textContent = digits[0];
        chapter.appendChild(ghost);
        gsap.set(ghost, { yPercent: 26, autoAlpha: 0 });
        gsap.timeline({ scrollTrigger: { trigger: chapter, start: "top 82%", end: "bottom 30%", scrub: 0.5 } })
          .to(ghost, { yPercent: 0, autoAlpha: 0.85, duration: 0.45, ease: "none" })
          .to(ghost, { yPercent: -26, autoAlpha: 0, duration: 0.55, ease: "none" });
      }

      if (title) {
        title.classList.remove("reveal");
        const words = title.textContent.trim().split(/\s+/);
        title.innerHTML = words.map(function (word) {
          return '<span class="w"><span class="wi">' + word + "</span></span>";
        }).join(" ");
        gsap.fromTo(title.querySelectorAll(".wi"),
          { yPercent: 118, rotationZ: 2.5 },
          { yPercent: 0, rotationZ: 0, stagger: 0.14, ease: "none",
            scrollTrigger: { trigger: chapter, start: "top 74%", end: "top 26%", scrub: 0.5 } });
      }

      chapter.style.setProperty("--rule", "0");
      gsap.to(chapter, { "--rule": 1, ease: "none",
        scrollTrigger: { trigger: chapter, start: "top 58%", end: "bottom 62%", scrub: 0.5 } });
    });

    // each photo develops like a print as it enters the light
    document.querySelectorAll(".moment .frame").forEach(function (frame) {
      const veil = document.createElement("div");
      veil.className = "frame-veil";
      frame.appendChild(veil);
      gsap.to(veil, { opacity: 0, ease: "none",
        scrollTrigger: { trigger: frame, start: "top 94%", end: "top 46%", scrub: 0.4 } });
    });

    // "Official." stamps in letter by letter, then bursts
    const mWord = document.querySelector(".milestone-word");
    if (mWord) {
      mWord.classList.remove("reveal");
      const text = mWord.textContent.trim();
      mWord.setAttribute("aria-label", text);
      mWord.innerHTML = text.split("").map(function (ch) {
        return '<span class="mchar" aria-hidden="true">' + (ch === " " ? "&nbsp;" : ch) + "</span>";
      }).join("");
      // chars clip their own gradient now; the parent's would ghost under transforms
      mWord.style.background = "none";
      gsap.set(mWord, { perspective: 800 });
      gsap.fromTo(mWord, { scale: 0.8 }, { scale: 1, ease: "none",
        scrollTrigger: { trigger: ".milestone", start: "top 85%", end: "center 52%", scrub: 0.5 } });
      gsap.fromTo(mWord.querySelectorAll(".mchar"),
        { yPercent: 62, autoAlpha: 0, rotationX: -86 },
        { yPercent: 0, autoAlpha: 1, rotationX: 0, stagger: 0.05, ease: "none",
          scrollTrigger: { trigger: ".milestone", start: "top 80%", end: "center 55%", scrub: 0.5 } });
      ScrollTrigger.create({
        trigger: ".milestone", start: "center 62%", once: true,
        onEnter: function () {
          const rect = mWord.getBoundingClientRect();
          window.dispatchEvent(new CustomEvent("loveburst", {
            detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2,
              count: 22, spread: Math.min(320, rect.width * 0.7) }
          }));
        }
      });
    }

    // Let the constellation have the first half of the finale before the toast arrives.
    const finaleTitle = document.querySelector(".finale-title");
    if (finaleTitle) {
      finaleTitle.classList.remove("reveal");
      gsap.fromTo(finaleTitle, { autoAlpha: 0, scale: 0.92, yPercent: 10 },
        { autoAlpha: 1, scale: 1, yPercent: 0, ease: "none",
          scrollTrigger: { trigger: ".finale", start: "top -28%", end: "bottom 42%", scrub: 0.5 } });
    }
    if (!isSmall) {
      let rainId = null;
      addEventListener("storyscenechange", function (e) {
        const scene = e.detail && e.detail.scene;
        const isFinale = !!(scene && scene.classList && scene.classList.contains("finale"));
        if (isFinale && rainId === null) {
          rainId = setInterval(function () {
            window.dispatchEvent(new CustomEvent("loveburst", {
              detail: { x: innerWidth * (0.2 + Math.random() * 0.6),
                y: innerHeight * (0.18 + Math.random() * 0.35), count: 4, spread: 58 }
            }));
          }, 2200);
        } else if (!isFinale && rainId !== null) {
          clearInterval(rainId);
          rainId = null;
        }
      });
    }
  }

  /* ---------- 3⅞. RECAP FILMSTRIP: the year scrolls sideways ----------
     Desktop pins the section and scrubs the strip horizontally; small screens
     get a native swipeable strip instead (pinning on touch is jittery).      */
  function setupRecapStrip(hasGSAP) {
    const recap = document.querySelector(".recap");
    if (!recap) return;
    const track = recap.querySelector(".recap-track");
    const bar = recap.querySelector(".recap-progress i");
    const heart = recap.querySelector(".recap-heart");

    if (!hasGSAP || reduceMotion || isSmall) {
      recap.classList.add("recap-swipe");
      return;
    }

    const distance = function () { return Math.max(0, track.scrollWidth - innerWidth); };
    gsap.to(track, {
      x: function () { return -distance(); },
      ease: "none",
      scrollTrigger: {
        trigger: recap,
        start: "top top",
        end: function () { return "+=" + Math.max(600, distance()); },
        pin: true,
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          if (bar) bar.style.transform = "scaleX(" + self.progress.toFixed(4) + ")";
          if (heart) heart.style.left = (self.progress * 100).toFixed(2) + "%";
        }
      }
    });
  }

  /* ---------- 3⅞b. MARQUEE: drifts on its own, surges with the scroll ---------- */
  function setupMarquee(hasGSAP) {
    const track = document.querySelector(".marquee-track");
    if (!track || !hasGSAP || reduceMotion) return;

    const unit = track.innerHTML;
    // two identical halves so a half-width modulo wrap is seamless
    let copies = 1;
    while (track.scrollWidth < innerWidth * 1.2 && copies < 12) {
      track.innerHTML += unit;
      copies++;
    }
    track.innerHTML += track.innerHTML;

    let x = 0;
    let boost = 0;
    let halfWidth = 0;
    const baseSpeed = isSmall ? 0.45 : 0.7;
    function measureTrack() {
      halfWidth = track.scrollWidth / 2;
    }
    measureTrack();
    addEventListener("resize", debounce(measureTrack, 150));
    if (window.ScrollTrigger) {
      ScrollTrigger.create({
        start: 0, end: "max",
        onUpdate: function (self) {
          boost = gsap.utils.clamp(-13, 13, self.getVelocity() / 240);
        }
      });
    }
    gsap.ticker.add(function () {
      boost *= 0.94;
      x -= baseSpeed + boost;
      if (halfWidth > 0) {
        if (x <= -halfWidth) x += halfWidth;
        if (x > 0) x -= halfWidth;
      }
      gsap.set(track, { x: x });
    });
  }

  /* ---------- 3⅞c. JOURNEY RAIL: a constellation of stops (desktop) ---------- */
  function setupJourneyRail(lenis) {
    if (isSmall || innerWidth < 1100) return;
    const chapters = document.querySelectorAll(".chapter");
    const defs = [
      [document.querySelector(".cinematic-hero"), "the book"],
      [chapters[0], "ch. 01"],
      [document.querySelector(".milestone"), "official"],
      [chapters[1], "ch. 02"],
      [document.querySelector(".numbers"), "by the numbers"],
      [document.querySelector(".recap"), "rewind"],
      [document.querySelector(".letter"), "for you"],
      [document.querySelector(".finale"), "year two"]
    ].filter(function (d) { return !!d[0]; });
    if (defs.length < 2) return;

    const rail = document.createElement("nav");
    rail.className = "journey-rail";
    rail.setAttribute("aria-label", "journey");
    const stops = defs.map(function (def) {
      const btn = document.createElement("button");
      btn.type = "button";
      const label = document.createElement("span");
      label.className = "rail-label";
      label.textContent = def[1];
      btn.appendChild(label);
      btn.setAttribute("aria-label", "go to " + def[1]);
      btn.addEventListener("click", function () {
        const target = def[0].getBoundingClientRect().top + scrollY + 2;
        if (lenis && typeof lenis.scrollTo === "function") {
          lenis.scrollTo(target, { duration: 1.6, easing: function (t) { return 1 - Math.pow(1 - t, 3); } });
        } else {
          scrollTo({ top: target, behavior: reduceMotion ? "auto" : "smooth" });
        }
      });
      rail.appendChild(btn);
      return { el: def[0], btn: btn };
    });
    document.body.appendChild(rail);

    addEventListener("storyscenechange", function (e) {
      const scene = e.detail && e.detail.scene;
      if (!scene) return;
      let here = 0;
      stops.forEach(function (stop, i) {
        const pos = stop.el.compareDocumentPosition(scene);
        // the active stop is the last one the scene sits inside of or after
        if (stop.el === scene || (pos & 16) || (pos & 4)) here = i;
      });
      stops.forEach(function (stop, i) { stop.btn.classList.toggle("is-here", i === here); });
    });
  }

  /* ---------- 3⅞d. VELOCITY FEEL: photos lean into a fast scroll ---------- */
  function setupVelocityFeel() {
    // The scrubbed 3D cards already carry motion; another velocity skew made side photos shimmer on trackpads.
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
    // URLs avoids blank beats, but stagger the work so first entry stays responsive.
    runWhenIdle(function () {
      urls.forEach(function (src, i) {
        const delay = i < 8 ? i * 90 : 1100 + i * 120;
        setTimeout(function warmImage() {
          if (performanceState.fastScroll || performance.now() < performanceState.movingUntil) {
            setTimeout(warmImage, 520);
            return;
          }
          const preloader = new Image();
          preloader.decoding = "async";
          preloader.onload = refreshScroll;
          preloader.src = src;
          if (preloader.decode) preloader.decode().then(refreshScroll).catch(noop);
        }, delay);
      });
    });
  }

  function markImageReady(img) {
    img.classList.add("is-loaded");
    const frame = img.closest(".frame");
    if (frame) frame.classList.add("is-loaded");
    scheduleImageLayoutRefresh();
  }

  function scheduleImageLayoutRefresh() {
    clearTimeout(scheduleImageLayoutRefresh.timer);
    const now = performance.now();
    const delay = now < performanceState.movingUntil ? (performanceState.movingUntil - now + 80) : 0;
    scheduleImageLayoutRefresh.timer = setTimeout(function () {
      refreshScroll();
      window.dispatchEvent(new Event("journeylayoutdirty"));
    }, delay);
  }

  /* ---------- 3B. AMBIENT STORY BACKDROP ---------- */
  function setupAmbientStory(hasGSAP) {
    const ambience = document.getElementById("ambience");
    if (!ambience) return;

    const root = document.documentElement;
    const photoLayers = Array.prototype.slice.call(ambience.querySelectorAll(".ambient-photo"));
    const scenes = Array.prototype.slice.call(document.querySelectorAll(
      ".hero, .chapter, .milestone, [data-moment], .numbers, .recap, .letter, .finale"
    ));
    scenes.forEach(function (scene, i) { scene.dataset.storyIndex = i; });
    const palettes = [
      { deep: "8 14 38", a: "117 172 255", b: "255 166 195", c: "255 223 151" },
      { deep: "7 25 45", a: "102 207 222", b: "255 194 138", c: "162 198 255" },
      { deep: "18 16 48", a: "139 186 255", b: "255 166 135", c: "255 232 157" },
      { deep: "31 14 44", a: "255 138 189", b: "133 174 255", c: "255 217 142" },
      { deep: "32 15 42", a: "226 150 255", b: "255 179 136", c: "255 230 164" },
      { deep: "7 30 38", a: "87 219 191", b: "255 210 122", c: "151 220 255" },
      { deep: "10 18 52", a: "94 138 255", b: "255 153 191", c: "255 216 134" },
      { deep: "13 33 44", a: "91 214 202", b: "255 174 141", c: "255 232 160" },
      { deep: "15 22 54", a: "128 176 255", b: "255 129 181", c: "255 213 119" },
      { deep: "8 37 58", a: "79 205 255", b: "255 190 122", c: "190 239 214" },
      { deep: "18 20 40", a: "179 220 255", b: "255 177 148", c: "188 230 168" },
      { deep: "30 18 34", a: "255 158 204", b: "255 211 126", c: "175 218 255" },
      { deep: "8 33 45", a: "94 225 206", b: "255 185 134", c: "186 230 255" },
      { deep: "12 25 61", a: "110 150 255", b: "255 141 188", c: "255 219 143" },
      { deep: "20 18 46", a: "207 163 255", b: "255 169 151", c: "255 226 164" },
      { deep: "10 28 34", a: "123 218 174", b: "255 206 128", c: "165 216 255" }
    ];
    const worlds = [
      { name: "book", x: 50, y: 42, x2: 18, y2: 86, tilt: -6, scale: 1.04, photo: .52, blur: 22, bright: .72, sat: 1.48, wash: .58, sheen: .82, pos: "center" },
      { name: "chapter-blue", x: 16, y: 22, x2: 84, y2: 72, tilt: 8, scale: 1.08, photo: .38, blur: 30, bright: .6, sat: 1.35, wash: .64, sheen: .7, pos: "center" },
      { name: "tahoe", x: 24, y: 18, x2: 80, y2: 74, tilt: -12, scale: 1.1, photo: .56, blur: 20, bright: .76, sat: 1.55, wash: .56, sheen: .84, pos: "center 34%" },
      { name: "photobooth", x: 72, y: 30, x2: 24, y2: 82, tilt: 10, scale: 1.06, photo: .54, blur: 21, bright: .74, sat: 1.5, wash: .58, sheen: .86, pos: "center" },
      { name: "official", x: 50, y: 16, x2: 52, y2: 88, tilt: -5, scale: 1.12, photo: .34, blur: 34, bright: .58, sat: 1.3, wash: .6, sheen: .92, pos: "center" },
      { name: "morning", x: 22, y: 72, x2: 78, y2: 18, tilt: 14, scale: 1.07, photo: .52, blur: 24, bright: .76, sat: 1.48, wash: .54, sheen: .8, pos: "center" },
      { name: "sweet", x: 84, y: 28, x2: 30, y2: 80, tilt: -9, scale: 1.12, photo: .55, blur: 22, bright: .78, sat: 1.52, wash: .52, sheen: .82, pos: "center" },
      { name: "park", x: 26, y: 26, x2: 86, y2: 70, tilt: 7, scale: 1.09, photo: .5, blur: 25, bright: .74, sat: 1.46, wash: .56, sheen: .76, pos: "center" },
      { name: "disney", x: 70, y: 18, x2: 18, y2: 78, tilt: -14, scale: 1.12, photo: .58, blur: 19, bright: .78, sat: 1.62, wash: .52, sheen: .9, pos: "center" },
      { name: "ocean", x: 20, y: 36, x2: 82, y2: 70, tilt: 11, scale: 1.14, photo: .58, blur: 18, bright: .8, sat: 1.56, wash: .5, sheen: .88, pos: "center" },
      { name: "family", x: 76, y: 24, x2: 32, y2: 78, tilt: -3, scale: 1.08, photo: .5, blur: 23, bright: .72, sat: 1.42, wash: .57, sheen: .76, pos: "center" },
      { name: "valentine", x: 36, y: 18, x2: 80, y2: 78, tilt: 13, scale: 1.12, photo: .56, blur: 21, bright: .76, sat: 1.54, wash: .53, sheen: .9, pos: "center" },
      { name: "hawaii", x: 18, y: 24, x2: 84, y2: 64, tilt: -10, scale: 1.16, photo: .62, blur: 17, bright: .84, sat: 1.58, wash: .48, sheen: .9, pos: "center" },
      { name: "birthday", x: 76, y: 18, x2: 28, y2: 82, tilt: 5, scale: 1.1, photo: .54, blur: 22, bright: .77, sat: 1.5, wash: .54, sheen: .82, pos: "center" },
      { name: "quiet", x: 42, y: 76, x2: 14, y2: 24, tilt: -13, scale: 1.08, photo: .48, blur: 26, bright: .68, sat: 1.38, wash: .62, sheen: .68, pos: "center" },
      { name: "finale", x: 50, y: 24, x2: 50, y2: 82, tilt: 0, scale: 1.18, photo: .4, blur: 31, bright: .62, sat: 1.42, wash: .58, sheen: .96, pos: "center" }
    ];

    let currentScene = null;
    let layerIndex = 0;
    let currentPhoto = "";
    let currentWorldIndex = -1;
    let lastAmbientCheck = 0;
    let lastRibbonShift = "";

    activateNearestScene();

    if (hasGSAP && window.ScrollTrigger) {
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: function (self) {
          const shift = ((self.progress - 0.5) * 86).toFixed(1) + "%";
          if (shift !== lastRibbonShift) {
            lastRibbonShift = shift;
            root.style.setProperty("--ribbon-shift", shift);
          }
          scheduleAmbientUpdate();
        }
      });
      window.addEventListener("resize", debounce(function () {
        lastAmbientCheck = 0;
        activateNearestScene();
      }, 120));
    } else {
      window.addEventListener("scroll", scheduleAmbientUpdate, { passive: true });
      window.addEventListener("resize", scheduleAmbientUpdate);
    }

    function scheduleAmbientUpdate() {
      const now = performance.now();
      const throttle = performanceState.fastScroll ? 180 : 90;
      if (now - lastAmbientCheck < throttle) return;
      lastAmbientCheck = now;
      if (scheduleAmbientUpdate.queued) return;
      scheduleAmbientUpdate.queued = true;
      requestAnimationFrame(function () {
        scheduleAmbientUpdate.queued = false;
        activateNearestScene();
      });
    }

    function activateNearestScene() {
      if (!scenes.length) return;
      const focusY = innerHeight * 0.52;
      let best = scenes[0];
      let bestIndex = 0;
      let bestScore = -Infinity;

      scenes.forEach(function (scene, i) {
        const rect = scene.getBoundingClientRect();
        const visible = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
        if (visible <= 0) return;
        const center = rect.top + rect.height * 0.5;
        const centerDistance = Math.abs(center - focusY);
        const score = visible - centerDistance * 0.28;
        if (score > bestScore) {
          best = scene;
          bestIndex = i;
          bestScore = score;
        }
      });

      activateScene(best, bestIndex);
    }

    function activateScene(scene, index) {
      if (!scene) return;
      const worldIndex = getWorldIndex(scene, index);
      const palette = palettes[worldIndex % palettes.length];
      const world = worlds[worldIndex % worlds.length];
      const sceneChanged = currentScene !== scene;
      if (!sceneChanged && currentWorldIndex === worldIndex) return;
      currentWorldIndex = worldIndex;
      root.style.setProperty("--mood-deep", palette.deep);
      root.style.setProperty("--mood-a", palette.a);
      root.style.setProperty("--mood-b", palette.b);
      root.style.setProperty("--mood-c", palette.c);
      root.style.setProperty("--ambient-x", world.x + "%");
      root.style.setProperty("--ambient-y", world.y + "%");
      root.style.setProperty("--ambient-x2", world.x2 + "%");
      root.style.setProperty("--ambient-y2", world.y2 + "%");
      root.style.setProperty("--ambient-tilt", world.tilt + "deg");
      root.style.setProperty("--ambient-scale", world.scale);
      root.style.setProperty("--ambient-photo-opacity", world.photo);
      root.style.setProperty("--ambient-photo-blur", world.blur + "px");
      root.style.setProperty("--ambient-photo-saturate", world.sat);
      root.style.setProperty("--ambient-photo-brightness", world.bright);
      root.style.setProperty("--ambient-wash-opacity", world.wash);
      root.style.setProperty("--world-sheen", world.sheen);
      document.body.dataset.world = world.name;

      if (currentScene && currentScene !== scene) currentScene.classList.remove("is-active");
      currentScene = scene;
      scene.classList.add("is-active");
      if (sceneChanged) {
        window.dispatchEvent(new CustomEvent("storyscenechange", {
          detail: { scene: scene, index: index, palette: palette, world: world }
        }));
      }

      const photo = getScenePhoto(scene);
      if (photo && photo !== currentPhoto && photoLayers.length) {
        currentPhoto = photo;
        layerIndex = (layerIndex + 1) % photoLayers.length;
        photoLayers.forEach(function (layer, i) { layer.classList.toggle("is-live", i === layerIndex); });
        photoLayers[layerIndex].style.backgroundImage = toBackgroundImage(photo);
        photoLayers[layerIndex].style.backgroundPosition = world.pos || "center";
      }
    }

    function getWorldIndex(scene, index) {
      const text = (scene.textContent || "").toLowerCase();
      if (scene.classList.contains("hero")) return 0;
      // recap first: its card notes mention nearly every keyword below
      if (scene.classList.contains("recap")) return 8;
      if (scene.classList.contains("finale") || scene.classList.contains("letter")) return 15;
      if (scene.classList.contains("numbers")) return 13;
      if (scene.classList.contains("milestone") || text.indexOf("official.") !== -1) return 4;
      if (text.indexOf("how it started") !== -1) return 1;
      if (text.indexOf("year of firsts") !== -1) return 5;
      if (text.indexOf("tahoe") !== -1) return 2;
      if (text.indexOf("photobooth") !== -1 || text.indexOf("strip") !== -1) return 3;
      if (text.indexOf("sweet maple") !== -1 || text.indexOf("breakfast") !== -1) return 6;
      if (text.indexOf("salt") !== -1 || text.indexOf("ice cream") !== -1) return 11;
      if (text.indexOf("ferry") !== -1 || text.indexOf("alta") !== -1 || text.indexOf("picnic") !== -1 || text.indexOf("park") !== -1) return 7;
      if (text.indexOf("disney") !== -1 || text.indexOf("universal") !== -1) return 8;
      if (text.indexOf("huntington") !== -1 || text.indexOf("hawaii") !== -1 || text.indexOf("paradise") !== -1) return 12;
      if (text.indexOf("valentine") !== -1 || text.indexOf("truffle") !== -1) return 11;
      if (text.indexOf("parents") !== -1 || text.indexOf("families") !== -1) return 10;
      if (text.indexOf("birthday") !== -1 || text.indexOf("susie") !== -1) return 13;
      if (text.indexOf("card") !== -1 || text.indexOf("pokemon") !== -1 || text.indexOf("ghibli") !== -1 || text.indexOf("japantown") !== -1) return 15;
      if (text.indexOf("gym") !== -1 || text.indexOf("prep") !== -1) return 14;
      return Math.abs(index) % worlds.length;
    }

    function getScenePhoto(scene) {
      const img = scene.querySelector(".frame img");
      if (img) return img.currentSrc || img.src || img.getAttribute("src");
      const bgEl = scene.querySelector(".hero-photo, .page-photo");
      if (!bgEl) return "";
      const bg = getComputedStyle(bgEl).backgroundImage;
      return bg && bg !== "none" ? bg : "";
    }

    function toBackgroundImage(value) {
      if (!value) return "";
      if (value.indexOf("url(") === 0) return value;
      return "url(\"" + value.replace(/"/g, "\\\"") + "\")";
    }
  }

  /* ---------- 3C. LIVING TIMELINE + MEMORY CONSTELLATIONS ---------- */
  function setupJourneyCanvas(hasGSAP) {
    const constellationCanvas = document.getElementById("constellation-canvas");
    const journeyCanvas = document.getElementById("journey-canvas");
    const finale = document.querySelector(".finale");
    if (!constellationCanvas || !journeyCanvas) return;

    const contextOptions = { alpha: true, desynchronized: true };
    const constellationCtx = constellationCanvas.getContext("2d", contextOptions);
    const journeyCtx = journeyCanvas.getContext("2d", contextOptions);
    if (!constellationCtx || !journeyCtx) return;

    const sceneEls = Array.prototype.slice.call(document.querySelectorAll(
      ".hero, .chapter, .milestone, [data-moment], .numbers, .recap, .letter, .finale"
    ));
    if (!sceneEls.length) return;

    const memories = sceneEls.map(function (el, i) {
      el.dataset.storyIndex = i;
      return {
        el: el,
        index: i,
        isMoment: el.matches("[data-moment]"),
        anchorEl: el.matches("[data-moment]") ? (el.querySelector(".moment-media") || el) : el,
        satellites: createSatellites(i),
        baseSide: getBaseSide(el, i),
        top: 0,
        height: 1,
        anchorTop: 0,
        anchorLeft: 0,
        anchorWidth: 1,
        anchorHeight: 1
      };
    });
    const nodeCache = memories.map(function (memory) {
      return {
        index: memory.index,
        el: memory.el,
        isMoment: memory.isMoment,
        x: 0,
        y: 0,
        localProgress: 0,
        visited: false,
        active: false,
        satellites: memory.satellites
      };
    });
    const pathNodeCache = [];
    const visiblePathCache = [];
    const livePathCache = [];
    const stars = createStars(isSmall ? 36 : 72);
    const meteors = [];
    const root = document.documentElement;
    const fallbackMood = { a: "111 160 255", b: "255 159 182", c: "255 210 122", deep: "8 14 38" };

    let w = 0;
    let h = 0;
    let dpr = 1;
    let scrollProgress = 0;
    let activeIndex = 0;
    let lastScenePulse = -1;
    let layoutDirty = true;
    let lastDocHeight = 0;
    const pointer = { x: 0, y: 0, strength: 0 };

    size();
    cacheMemoryLayout();
    updateState();
    draw(performance.now());

    addEventListener("resize", debounce(function () {
      size();
      cacheMemoryLayout();
      updateState();
      draw(performance.now());
    }, 120));
    addEventListener("load", markLayoutDirty);
    addEventListener("journeylayoutdirty", markLayoutDirty);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(markLayoutDirty).catch(noop);
    }
    if (window.ScrollTrigger && ScrollTrigger.addEventListener) {
      ScrollTrigger.addEventListener("refresh", markLayoutDirty);
    }

    addEventListener("pointermove", function (e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.strength = isSmall ? 0 : 1;
    }, { passive: true });

    addEventListener("storyscenechange", function (e) {
      if (e.detail && typeof e.detail.index === "number") {
        activeIndex = e.detail.index;
        if (lastScenePulse !== activeIndex) {
          lastScenePulse = activeIndex;
          const node = getNodes().filter(function (n) { return n.index === activeIndex; })[0];
          if (!performanceState.fastScroll && node && node.y > -60 && node.y < h + 60) {
            window.dispatchEvent(new CustomEvent("loveburst", {
              detail: { x: node.x, y: node.y, count: 10, spread: 54 }
            }));
          }
          // a shooting star marks the big beats of the journey
          const scene = e.detail.scene;
          if (!performanceState.fastScroll && !reduceMotion && scene && scene.classList &&
              (scene.classList.contains("chapter") || scene.classList.contains("milestone") || scene.classList.contains("finale"))) {
            meteors.push({
              x: w * (0.1 + Math.random() * 0.28),
              y: h * (0.07 + Math.random() * 0.15),
              dx: w * (0.3 + Math.random() * 0.16),
              dy: h * (0.14 + Math.random() * 0.1),
              born: performance.now(),
              life: 1150
            });
          }
        }
      }
    });

    if (reduceMotion) {
      addEventListener("scroll", debounce(function () {
        updateState();
        draw(performance.now());
      }, 40), { passive: true });
      return;
    }

    let lastCanvasFrame = 0;
    let lastSeenScrollY = scrollY;
    let scrollingUntil = 0;
    requestAnimationFrame(loop);

    function loop(now) {
      if (Math.abs(scrollY - lastSeenScrollY) > 0.2) {
        scrollingUntil = now + 180;
        lastSeenScrollY = scrollY;
      }
      const isScrolling = now < scrollingUntil;
      const finaleZone = scrollProgress > 0.78;
      const minFrameMs = document.body.classList.contains("book-intro-playing")
        ? 180
        : performanceState.fastScroll
          ? (isSmall ? 66 : 34)
        : finaleZone
          ? (isScrolling ? (isSmall ? 56 : 34) : (isSmall ? 82 : 50))
          : (isScrolling ? (isSmall ? 33 : 16) : (isSmall ? 66 : 40));
      if (!document.hidden && now - lastCanvasFrame >= minFrameMs) {
        lastCanvasFrame = now;
        updateState();
        draw(now);
      }
      requestAnimationFrame(loop);
    }

    function size() {
      dpr = Math.min(isSmall ? 1.1 : 1.25, devicePixelRatio || 1);
      w = innerWidth;
      h = innerHeight;
      [constellationCanvas, journeyCanvas].forEach(function (canvas) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
      });
      constellationCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      journeyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function markLayoutDirty() {
      layoutDirty = true;
    }

    function cacheMemoryLayout() {
      layoutDirty = false;
      lastDocHeight = document.documentElement.scrollHeight;
      memories.forEach(function (memory) {
        const rect = memory.el.getBoundingClientRect();
        const anchorRect = memory.anchorEl.getBoundingClientRect();
        memory.top = rect.top + scrollY;
        memory.height = Math.max(1, rect.height || memory.el.offsetHeight || 1);
        memory.anchorTop = anchorRect.top + scrollY;
        memory.anchorLeft = anchorRect.left;
        memory.anchorWidth = Math.max(1, anchorRect.width || memory.anchorEl.offsetWidth || 1);
        memory.anchorHeight = Math.max(1, anchorRect.height || memory.anchorEl.offsetHeight || 1);
      });
    }

    function updateState() {
      const doc = document.documentElement;
      if (layoutDirty || lastDocHeight !== doc.scrollHeight) cacheMemoryLayout();
      const max = Math.max(1, doc.scrollHeight - h);
      scrollProgress = clamp(scrollY / max, 0, 1);
      activeIndex = getActiveIndex();
      const finaleHeartProgress = getFinaleHeartProgress();
      document.body.classList.toggle("constellation-spotlight", finaleHeartProgress > 0.02 && finaleHeartProgress < 0.82);
    }

    function getActiveIndex() {
      const focusY = h * 0.52;
      let best = activeIndex;
      let bestScore = -Infinity;
      let currentScore = -Infinity;

      memories.forEach(function (memory) {
        const top = memory.top - scrollY;
        const bottom = top + memory.height;
        const visible = Math.max(0, Math.min(bottom, h) - Math.max(top, 0));
        if (visible <= 0) return;
        const center = top + memory.height * 0.5;
        const centerDistance = Math.abs(center - focusY);
        const score = visible - centerDistance * 0.32;
        if (memory.index === activeIndex) currentScore = score;
        if (score > bestScore) {
          best = memory.index;
          bestScore = score;
        }
      });

      if (bestScore === -Infinity) return activeIndex;
      if (best !== activeIndex && currentScore > -Infinity) {
        const hysteresis = isSmall ? 24 : 42;
        if (bestScore < currentScore + hysteresis) return activeIndex;
      }
      return best;
    }

    function getNodes() {
      if (layoutDirty) cacheMemoryLayout();
      for (let i = 0; i < memories.length; i++) {
        const memory = memories[i];
        const node = nodeCache[i];
        const sectionTop = memory.top - scrollY;
        const anchorTop = (memory.anchorTop || memory.top) - scrollY;
        const anchorHeight = memory.anchorHeight || memory.height;
        const centerY = anchorTop + anchorHeight * 0.5;
        const localProgress = clamp((h * 0.78 - sectionTop) / Math.max(1, memory.height + h * 0.56), 0, 1);
        const anchoredX = memory.isMoment
          ? memory.anchorLeft + memory.anchorWidth * (memory.baseSide < 0.5 ? 0.72 : 0.28)
          : w * memory.baseSide;
        const x = clamp(anchoredX, isSmall ? 24 : 58, w - (isSmall ? 24 : 58));
        node.x = x;
        node.y = centerY;
        node.localProgress = localProgress;
        node.visited = memory.index < activeIndex || centerY < h * 0.58;
        node.active = memory.index === activeIndex;
      }
      return nodeCache;
    }

    function draw(now) {
      const nodes = getNodes();
      pathNodeCache.length = 0;
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].isMoment) pathNodeCache.push(nodes[i]);
      }
      const mood = readMood();
      const fastScroll = performanceState.fastScroll;
      pointer.strength *= 0.94;

      constellationCtx.clearRect(0, 0, w, h);
      journeyCtx.clearRect(0, 0, w, h);

      if (!fastScroll) {
        drawWorldCurtains(constellationCtx, now, mood);
        drawStarWorld(constellationCtx, now, mood);
        drawMeteors(constellationCtx, now, mood);
      }
      drawMemoryConstellations(constellationCtx, nodes, now, mood, fastScroll);
      drawFinalHeart(constellationCtx, now, mood, fastScroll);
      drawJourneyPath(journeyCtx, pathNodeCache.length > 1 ? pathNodeCache : nodes, now, mood, fastScroll);
      if (!fastScroll) drawBookWake(journeyCtx, nodes, now, mood);
    }

    function drawWorldCurtains(ctx, now, mood) {
      if (isSmall && scrollProgress > 0.2) return;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.lineCap = "round";
      for (let i = 0; i < 5; i++) {
        const phase = now * (0.00016 + i * 0.000018) + scrollProgress * 4 + i * 0.9;
        const y = h * (0.16 + i * 0.17) + Math.sin(phase) * (isSmall ? 12 : 30);
        const lift = Math.cos(phase * 0.7) * (isSmall ? 14 : 42);
        const alpha = (isSmall ? 0.035 : 0.058) * (1 + Math.sin(phase + i) * 0.25);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = i % 3 === 0 ? rgba(mood.a, 0.9) : (i % 3 === 1 ? rgba(mood.b, 0.9) : rgba(mood.c, 0.9));
        ctx.lineWidth = isSmall ? 22 : 54;
        ctx.beginPath();
        ctx.moveTo(-w * 0.12, y);
        ctx.bezierCurveTo(w * 0.24, y - lift, w * 0.48, y + lift, w * 0.76, y - lift * 0.45);
        ctx.bezierCurveTo(w * 0.94, y - lift * 0.82, w * 1.06, y + lift * 0.24, w * 1.14, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawJourneyPath(ctx, nodes, now, mood, fastScroll) {
      const overscan = h * 0.58;
      const visibleNodes = getPathWindow(nodes, overscan, visiblePathCache);
      if (!visibleNodes.length) return;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = rgba(mood.a, 0.42);
      ctx.shadowBlur = fastScroll ? 0 : 18;

      if (visibleNodes.length > 1 && !fastScroll) {
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = isSmall ? 1.4 : 2;
        ctx.strokeStyle = rgba(mood.c, 0.58);
        drawSpline(ctx, visibleNodes);
      }

      livePathCache.length = 0;
      for (let i = 0; i < visibleNodes.length; i++) {
        if (visibleNodes[i].index <= activeIndex + 1) livePathCache.push(visibleNodes[i]);
      }
      const liveNodes = livePathCache;
      if (liveNodes.length > 1) {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, rgba(mood.a, 0.94));
        grad.addColorStop(0.56, rgba(mood.b, 0.84));
        grad.addColorStop(1, rgba(mood.c, 0.92));
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = isSmall ? 2.2 : 3.8;
        ctx.strokeStyle = grad;
        drawSpline(ctx, liveNodes);

        if (!fastScroll) {
          ctx.save();
          ctx.globalAlpha = isSmall ? 0.26 : 0.36;
          ctx.lineWidth = isSmall ? 1 : 1.5;
          ctx.strokeStyle = rgba(mood.c, 0.96);
          ctx.setLineDash([10, 22]);
          ctx.lineDashOffset = -scrollProgress * 260;
          drawSpline(ctx, liveNodes);
          ctx.restore();

          drawPathTravelers(ctx, liveNodes, now, mood);
        }
      }

      visibleNodes.forEach(function (node) {
        const pulse = !fastScroll && node.active ? 0.5 + 0.5 * Math.sin(now * 0.0052) : 0;
        const alpha = node.active ? 1 : (node.visited ? 0.72 : 0.26);
        const radius = (node.active ? 6.6 + pulse * 4.1 : node.visited ? 4 : 2.4) * (isSmall ? 0.72 : 1);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = node.active ? rgba(mood.c, 0.96) : rgba(mood.a, 0.86);
        ctx.shadowColor = node.active ? rgba(mood.c, 0.9) : rgba(mood.a, 0.46);
        ctx.shadowBlur = fastScroll ? 0 : (node.active ? 22 : 12);
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        if (node.active && !fastScroll) {
          ctx.globalAlpha = 0.38 + pulse * 0.28;
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = rgba(mood.b, 0.88);
          ctx.beginPath();
          ctx.arc(node.x, node.y, 20 + pulse * 18, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      });

      ctx.restore();
    }

    function getPathWindow(nodes, overscan, out) {
      out.length = 0;
      let first = -1;
      let last = -1;
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].y > -overscan && nodes[i].y < h + overscan) {
          if (first === -1) first = i;
          last = i;
        }
      }
      if (first === -1) return out;
      first = Math.max(0, first - 1);
      last = Math.min(nodes.length - 1, last + 1);
      for (let i = first; i <= last; i++) out.push(nodes[i]);
      return out;
    }

    function drawPathTravelers(ctx, points, now, mood) {
      if (points.length < 2) return;
      const travelers = isSmall ? 1 : 3;
      if (!drawPathTravelers._heads) {
        drawPathTravelers._heads = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
        drawPathTravelers._tails = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
      }
      const heads = drawPathTravelers._heads;
      const tails = drawPathTravelers._tails;
      for (let i = 0; i < travelers; i++) {
        const t = (scrollProgress * 0.74 + now * 0.000025 + i / travelers) % 1;
        const point = pointAlongPath(points, t, heads[i]);
        if (!point || point.y < -40 || point.y > h + 40) continue;
        const tail = pointAlongPath(points, Math.max(0, t - 0.028), tails[i]);
        ctx.save();
        ctx.globalAlpha = isSmall ? 0.62 : 0.82;
        ctx.strokeStyle = rgba(mood.c, 0.8);
        ctx.fillStyle = i % 2 ? rgba(mood.b, 0.98) : rgba(mood.c, 0.98);
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 18;
        if (tail) {
          ctx.lineWidth = isSmall ? 1.2 : 1.8;
          ctx.beginPath();
          ctx.moveTo(tail.x, tail.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }
        drawMiniHeart(ctx, point.x, point.y, isSmall ? 4.2 : 5.6, now * 0.002 + i);
        ctx.restore();
      }
    }

    function drawBookWake(ctx, nodes, now, mood) {
      const reveal = clamp((mood.book - 0.08) / 0.42, 0, 1) * clamp(1 - scrollProgress / 0.16, 0, 1);
      if (reveal <= 0) return;

      const sourceX = w * 0.5;
      const sourceY = h * 0.54;
      const target = nodes.filter(function (node) { return node.y > -80 && node.y < h + 120; })[0] || nodes[0];
      const targetX = target ? target.x : w * 0.18;
      const targetY = target ? target.y : h * 0.85;

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 0; i < 3; i++) {
        const phase = now * 0.002 + i * 1.7;
        const wobble = Math.sin(phase) * (18 + i * 9);
        ctx.globalAlpha = reveal * (0.26 - i * 0.045);
        ctx.lineWidth = (isSmall ? 1.5 : 2.4) + i * 1.7;
        ctx.strokeStyle = i === 1 ? rgba(mood.b, 0.86) : rgba(mood.c, 0.9);
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 20 + i * 12;
        ctx.setLineDash(i === 0 ? [12, 18] : []);
        ctx.lineDashOffset = -now * (0.022 + i * 0.006);
        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.bezierCurveTo(
          sourceX - w * 0.12 + wobble,
          sourceY + h * 0.1,
          targetX + w * 0.08 - wobble,
          targetY - h * 0.16,
          targetX,
          targetY
        );
        ctx.stroke();
      }

      ctx.globalAlpha = reveal * (0.82 + Math.sin(now * 0.005) * 0.12);
      ctx.fillStyle = rgba(mood.c, 0.96);
      ctx.shadowColor = rgba(mood.c, 1);
      ctx.shadowBlur = 26;
      drawMiniHeart(ctx, sourceX, sourceY, isSmall ? 6 : 8, -0.25);
      ctx.restore();
    }

    function drawMiniHeart(ctx, x, y, size, rotation) {
      const s = size / 18;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-18, -8, -9, -24, 0, -12);
      ctx.bezierCurveTo(9, -24, 18, -8, 0, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function pointAlongPath(points, t, out) {
      if (!points.length) return null;
      out = out || { x: 0, y: 0 };
      if (points.length === 1) {
        out.x = points[0].x;
        out.y = points[0].y;
        return out;
      }

      let total = 0;
      for (let i = 1; i < points.length; i++) {
        total += distance(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
      }
      if (!total) {
        out.x = points[0].x;
        out.y = points[0].y;
        return out;
      }

      let walked = 0;
      const target = total * clamp(t, 0, 1);
      for (let i = 1; i < points.length; i++) {
        const len = distance(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
        if (walked + len >= target) {
          const local = (target - walked) / len;
          out.x = points[i - 1].x + (points[i].x - points[i - 1].x) * local;
          out.y = points[i - 1].y + (points[i].y - points[i - 1].y) * local;
          return out;
        }
        walked += len;
      }
      const last = points[points.length - 1];
      out.x = last.x;
      out.y = last.y;
      return out;
    }

    function drawMemoryConstellations(ctx, nodes, now, mood, fastScroll) {
      const overscan = h * 0.32;
      nodes.forEach(function (node) {
        if (node.y < -overscan || node.y > h + overscan) return;
        if (fastScroll && !node.active) return;
        const activeBoost = node.active ? 1 : 0;
        const baseAlpha = node.active ? 0.92 : (node.visited ? 0.38 : 0.16);
        const orbit = 1 + Math.sin(now * 0.0015 + node.index) * 0.07;
        const plotted = [];
        const step = fastScroll ? 2 : 1;

        ctx.save();
        ctx.lineCap = "round";
        for (let i = 0; i < node.satellites.length; i += step) {
          const sat = node.satellites[i];
          const sway = Math.sin(now * 0.0011 + sat.phase + scrollProgress * 4.2) * 0.16;
          const distance = sat.distance * orbit * (1 + activeBoost * 0.2);
          const sx = node.x + Math.cos(sat.angle + sway) * distance;
          const sy = node.y + Math.sin(sat.angle + sway) * distance * 0.72;
          const twinkle = 0.58 + 0.42 * Math.sin(now * sat.speed + sat.phase);
          plotted.push({ x: sx, y: sy, size: sat.size, twinkle: twinkle });

          if (!fastScroll) {
            ctx.globalAlpha = baseAlpha * (0.42 + twinkle * 0.58);
            ctx.strokeStyle = i % 2 ? rgba(mood.a, 0.72) : rgba(mood.b, 0.66);
            ctx.lineWidth = node.active ? 1.15 : 0.68;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(sx, sy);
            ctx.stroke();
          }
        }

        if ((node.active || node.visited) && !fastScroll) {
          plotted.forEach(function (point, i) {
            if (i % 2 !== 0) return;
            const next = plotted[(i + 2) % plotted.length];
            if (!next) return;
            ctx.globalAlpha = baseAlpha * (node.active ? 0.36 : 0.16);
            ctx.strokeStyle = i % 4 ? rgba(mood.c, 0.7) : rgba(mood.b, 0.64);
            ctx.lineWidth = node.active ? 0.9 : 0.55;
            ctx.setLineDash(node.active ? [4, 10] : []);
            ctx.lineDashOffset = -scrollProgress * 180 - node.index * 2;
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(next.x, next.y);
            ctx.stroke();
          });
          ctx.setLineDash([]);
        }

        plotted.forEach(function (point, i) {
          ctx.globalAlpha = baseAlpha * (0.72 + point.twinkle * 0.34);
          ctx.fillStyle = i % 3 ? rgba(mood.c, 0.92) : rgba(mood.a, 0.88);
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = fastScroll ? 0 : (node.active ? 20 : 8);
          ctx.beginPath();
          ctx.arc(point.x, point.y, point.size * (node.active ? (fastScroll ? 1.05 : 1.35) : 1.05), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      });
    }

    function drawStarWorld(ctx, now, mood) {
      ctx.save();
      stars.forEach(function (star, i) {
        const driftX = (scrollProgress - 0.5) * star.drift;
        const driftY = Math.sin(scrollProgress * Math.PI * 2 + star.phase) * star.drift * 0.12;
        const px = star.x * w + driftX + Math.sin(now * 0.00018 + star.phase) * star.float;
        const py = star.y * h + driftY + Math.cos(now * 0.0002 + star.phase) * star.float * 0.6;
        const pull = pointer.strength * Math.max(0, 1 - distance(px, py, pointer.x, pointer.y) / 220);
        const x = px + (pointer.x - px) * pull * 0.055;
        const y = py + (pointer.y - py) * pull * 0.055;
        const twinkle = 0.4 + 0.6 * Math.sin(now * star.speed + star.phase + scrollProgress * 2);

        ctx.globalAlpha = star.alpha * (0.46 + twinkle * 0.72) * (1 + pull * 1.6);
        ctx.fillStyle = i % 3 === 0 ? rgba(mood.b, 0.9) : (i % 3 === 1 ? rgba(mood.a, 0.9) : rgba(mood.c, 0.86));
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10 + pull * 22;
        ctx.beginPath();
        ctx.arc(x, y, star.size * (1 + pull * 1.4), 0, Math.PI * 2);
        ctx.fill();

        if (i % 11 === 0 && !isSmall) {
          const mate = stars[(i + 7) % stars.length];
          const mx = mate.x * w + (scrollProgress - 0.5) * mate.drift;
          const my = mate.y * h;
          const d = distance(x, y, mx, my);
          if (d < 190) {
            ctx.globalAlpha = 0.07 * (1 - d / 190);
            ctx.strokeStyle = rgba(mood.a, 0.7);
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(mx, my);
            ctx.stroke();
          }
        }
      });
      ctx.restore();
    }

    function drawMeteors(ctx, now, mood) {
      if (!meteors.length) return;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.lineCap = "round";
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        const t = (now - m.born) / m.life;
        if (t >= 1) { meteors.splice(i, 1); continue; }
        const x = m.x + m.dx * t;
        const y = m.y + m.dy * t;
        const tx = x - m.dx * 0.16;
        const ty = y - m.dy * 0.16;
        const fade = t < 0.18 ? t / 0.18 : 1 - (t - 0.18) / 0.82;
        const grad = ctx.createLinearGradient(tx, ty, x, y);
        grad.addColorStop(0, rgba(mood.a, 0));
        grad.addColorStop(1, rgba(mood.c, 0.92));
        ctx.globalAlpha = 0.85 * fade;
        ctx.strokeStyle = grad;
        ctx.lineWidth = isSmall ? 1.4 : 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = rgba(mood.c, 0.95);
        ctx.shadowColor = rgba(mood.c, 1);
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(x, y, isSmall ? 1.6 : 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    /* ---------- FINALE: the sky writes our signature ----------
       Keep this cached and intentionally light. The finale shares the frame with
       Lenis, GSAP, image compositing, and cursor particles, so per-frame random
       sparkle systems here quickly become visible scroll lag. */
    function finalHeartState() {
      if (!drawFinalHeart._state) {
        drawFinalHeart._state = {
          signature: "",
          points: [],
          visible: [],
          outline: [],
          burstFired: false,
          labelFont: "",
          labelWidth: 0
        };
      }
      return drawFinalHeart._state;
    }

    function heartXY(t) {
      return {
        x: 16 * Math.pow(Math.sin(t), 3),
        y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
      };
    }

    function rebuildFinalHeart(state, cx, cy, unit, pointCount) {
      const signature = [
        Math.round(w), Math.round(h), Math.round(cx), Math.round(cy),
        Math.round(unit * 100), pointCount, isSmall ? "s" : "d"
      ].join(":");
      if (state.signature === signature) return;

      state.signature = signature;
      state.points = [];
      state.visible = [];
      state.outline = [];
      state.labelFont = "";
      state.labelWidth = 0;

      for (let i = 0; i < pointCount; i++) {
        const t = -Math.PI + (Math.PI * 2 * (i + 0.5)) / pointCount;
        const p = heartXY(t);
        const spread = Math.min(w, h) * (isSmall ? 0.24 : 0.32);
        const startAngle = t + (rand(i * 41 + 9) - 0.5) * 1.8;
        const startRadius = spread * (0.62 + rand(i * 53 + 4) * 0.78);
        state.points.push({
          hx: p.x,
          hy: p.y,
          sx: cx + Math.cos(startAngle) * startRadius,
          sy: cy + Math.sin(startAngle) * startRadius,
          delay: rand(i * 29 + 13) * 0.24,
          phase: rand(i * 61 + 3) * Math.PI * 2,
          warm: i % 3 !== 0
        });
        state.visible.push({ x: 0, y: 0, local: 0, warm: true, phase: 0 });
      }

      const outlineCount = isSmall ? 52 : 68;
      for (let i = 0; i <= outlineCount; i++) {
        const p = heartXY(-Math.PI + (Math.PI * 2 * i) / outlineCount);
        state.outline.push({ hx: p.x, hy: p.y });
      }
    }

    function drawFinalHeart(ctx, now, mood, fastScroll) {
      const state = finalHeartState();
      const finaleReveal = getFinaleHeartProgress();
      const reveal = finaleReveal;
      if (reveal <= 0.015 || (fastScroll && reveal < 0.18)) {
        state.burstFired = false;
        return;
      }
      if (finaleReveal < 0.2) state.burstFired = false;

      const cx = w * (isSmall ? 0.5 : 0.52);
      const cy = h * (isSmall ? 0.43 : 0.47);
      const unit = Math.min(w, h) * (isSmall ? 0.012 : 0.014);
      rebuildFinalHeart(state, cx, cy, unit, isSmall ? 32 : 44);

      const gatherT = reduceMotion ? 1 : easeInOutCubic(clamp(reveal / 0.38, 0, 1));
      const finalDrawT = reduceMotion ? 1 : easeInOutCubic(clamp((finaleReveal - 0.18) / 0.38, 0, 1));
      const drawT = finalDrawT;
      const inkT = easeOutCubic(clamp((finaleReveal - (reduceMotion ? 0.14 : 0.52)) / 0.22, 0, 1));
      const dateT = easeOutCubic(clamp((finaleReveal - (reduceMotion ? 0.22 : 0.66)) / 0.18, 0, 1));
      const aliveT = reduceMotion ? 0 : clamp((finaleReveal - 0.78) / 0.16, 0, 1);
      const heartPresence = easeOutCubic(clamp((reveal + 0.08) / 0.22, 0, 1));

      let beat = 1;
      let beatGlow = 0;
      if (aliveT > 0) {
        const cycle = (now % 1900) / 1900;
        const lub = Math.exp(-Math.pow((cycle - 0.11) / 0.05, 2));
        const dub = 0.55 * Math.exp(-Math.pow((cycle - 0.29) / 0.055, 2));
        const pulse = (lub + dub) * aliveT;
        beat = 1 + pulse * 0.05;
        beatGlow = pulse;
      }

      const visiblePoints = state.visible;
      for (let i = 0; i < state.points.length; i++) {
        const point = state.points[i];
        const visible = visiblePoints[i];
        const local = reduceMotion ? 1 : easeInOutCubic(clamp((gatherT - point.delay) / (1 - point.delay), 0, 1));
        const tx = cx + point.hx * unit * beat;
        const ty = cy + point.hy * unit * beat;
        const drift = (1 - local) * (isSmall ? 4 : 8);
        visible.x = lerp(point.sx, tx, local) + Math.sin(now * 0.0015 + point.phase) * drift;
        visible.y = lerp(point.sy, ty, local) + Math.cos(now * 0.0013 + point.phase) * drift;
        visible.local = local;
        visible.warm = point.warm;
        visible.phase = point.phase;
      }

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (gatherT < 0.98) {
        ctx.strokeStyle = rgba(mood.a, 0.32);
        ctx.lineWidth = isSmall ? 0.65 : 0.9;
        for (let i = 0; i < visiblePoints.length; i += 2) {
          const point = visiblePoints[i];
          if (point.local <= 0.04 || point.local >= 0.96) continue;
          ctx.globalAlpha = (1 - point.local) * 0.42;
          ctx.beginPath();
          ctx.moveTo(lerp(point.x, cx, 0.12), lerp(point.y, cy, 0.12));
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }
      }

      const glowT = inkT;
      if (glowT > 0.05) {
        const bloom = ctx.createRadialGradient(cx, cy - unit * 2, unit, cx, cy, unit * 19);
        bloom.addColorStop(0, rgba(mood.b, 0.12 * glowT + 0.08 * beatGlow));
        bloom.addColorStop(0.58, rgba(mood.a, 0.05 * glowT + 0.04 * beatGlow));
        bloom.addColorStop(1, rgba(mood.a, 0));
        ctx.globalAlpha = 0.72 + 0.18 * finaleReveal;
        ctx.fillStyle = bloom;
        ctx.fillRect(cx - unit * 20, cy - unit * 20, unit * 40, unit * 40);
      }

      if (drawT > 0) {
        const outlineEnd = Math.max(2, Math.floor(state.outline.length * drawT));
        ctx.globalAlpha = (0.24 + 0.2 * drawT + 0.18 * beatGlow) * heartPresence;
        ctx.strokeStyle = rgba(mood.a, 0.86);
        ctx.shadowColor = rgba(mood.a, 0.8);
        ctx.shadowBlur = isSmall ? 8 : 13;
        ctx.lineWidth = isSmall ? 3.8 : 5.6;
        strokeFinalHeartOutline(ctx, state.outline, outlineEnd, cx, cy, unit, beat);
        ctx.globalAlpha = (0.68 + 0.18 * beatGlow) * heartPresence;
        ctx.strokeStyle = rgba(mood.c, 0.95);
        ctx.shadowBlur = isSmall ? 4 : 7;
        ctx.lineWidth = isSmall ? 1.2 : 1.55;
        strokeFinalHeartOutline(ctx, state.outline, outlineEnd, cx, cy, unit, beat);
        ctx.shadowBlur = 0;

        if (drawT < 1 && !reduceMotion) {
          const head = state.outline[outlineEnd - 1];
          if (head) {
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = rgba(mood.c, 1);
            ctx.shadowColor = rgba(mood.c, 1);
            ctx.shadowBlur = isSmall ? 8 : 12;
            ctx.beginPath();
            ctx.arc(cx + head.hx * unit * beat, cy + head.hy * unit * beat, isSmall ? 2.2 : 2.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        if (finalDrawT >= 1 && !state.burstFired && !reduceMotion) {
          state.burstFired = true;
          window.dispatchEvent(new CustomEvent("loveburst", {
            detail: { x: cx, y: cy + 17 * unit * beat, count: 7, spread: 24 }
          }));
        }
      }

      ctx.shadowColor = rgba(mood.c, 0.82);
      ctx.shadowBlur = isSmall ? 4 : 7;
      visiblePoints.forEach(function (point, i) {
        const twinkle = 0.62 + 0.38 * Math.sin(now * 0.003 + point.phase);
        const size = (isSmall ? 1.7 : 2.25) + (i % 8 === 0 ? 1.05 : 0);
        ctx.globalAlpha = clamp((0.28 + reveal * 0.72) * twinkle * (0.28 + point.local * 0.72), 0, 0.98);
        ctx.fillStyle = point.warm ? rgba(mood.c, 0.95) : rgba(mood.b, 0.88);
        ctx.beginPath();
        ctx.arc(point.x, point.y, size * (0.9 + inkT * 0.16 + beatGlow * 0.2), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      if (aliveT > 0.35 && !reduceMotion) {
        ctx.strokeStyle = rgba(mood.c, 0.84);
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const shimmer = (now * 0.00035 + i * 0.31) % 1;
          const point = state.outline[Math.floor(shimmer * (state.outline.length - 1))];
          const sx = cx + point.hx * unit * beat;
          const sy = cy + point.hy * unit * beat;
          const alpha = aliveT * (0.22 + 0.22 * Math.sin(now * 0.002 + i));
          const ray = unit * (0.8 + i * 0.18);
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(sx - ray, sy); ctx.lineTo(sx + ray, sy);
          ctx.moveTo(sx, sy - ray); ctx.lineTo(sx, sy + ray);
          ctx.stroke();
        }
      }

      if (inkT > 0) {
        const wipe = reduceMotion ? inkT : easeInOutCubic(inkT);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const font = (isSmall ? "46px" : "68px") + " Caveat, cursive";
        ctx.font = font;
        const label = "M + S";
        if (state.labelFont !== font) {
          state.labelFont = font;
          state.labelWidth = ctx.measureText(label).width;
        }
        const tw = state.labelWidth;
        const left = cx - tw / 2 - 18;
        const inkWidth = (tw + 36) * wipe;

        ctx.save();
        ctx.beginPath();
        ctx.rect(left, cy - unit * 6.4, inkWidth, unit * 9.4);
        ctx.clip();
        ctx.shadowColor = rgba(mood.c, 0.74);
        ctx.shadowBlur = isSmall ? 7 : 10;
        ctx.globalAlpha = 0.97;
        ctx.fillStyle = "rgba(246,242,233,0.97)";
        ctx.fillText(label, cx, cy - unit * 0.25);
        ctx.restore();
      }

      if (dateT > 0) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = dateT * 0.9;
        ctx.fillStyle = rgba(mood.c, 0.92);
        ctx.shadowColor = rgba(mood.c, 0.5);
        ctx.shadowBlur = isSmall ? 4 : 6;
        ctx.font = (isSmall ? "15px" : "18px") + " Inter, system-ui, sans-serif";
        ctx.fillText("08.02.2025", cx, cy + unit * 3.9 + (1 - dateT) * 10);
        ctx.shadowBlur = 0;

        ctx.globalAlpha = dateT * (0.22 + 0.08 * Math.sin(now * 0.004) + beatGlow * 0.12);
        ctx.strokeStyle = rgba(mood.c, 0.86);
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 12]);
        ctx.lineDashOffset = reduceMotion ? 0 : -now * 0.018;
        ctx.beginPath();
        ctx.arc(cx, cy, unit * (17.6 + beatGlow * 0.4), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // The recap is deliberately long and pinned, so total page progress reaches the
    // finale range while its Polaroids are still on screen. Anchor this reveal to the
    // finale itself so the constellation receives an unobstructed closing beat.
    function getFinaleHeartProgress() {
      if (!finale) return 0;
      const rect = finale.getBoundingClientRect();
      const travel = Math.max(h * 1.08, rect.height * 0.66);
      return clamp((h * 0.84 - rect.top) / travel, 0, 1);
    }

    function strokeFinalHeartOutline(ctx, outline, count, cx, cy, unit, beat) {
      const max = Math.min(count, outline.length);
      if (max < 2) return;
      ctx.beginPath();
      const first = outline[0];
      ctx.moveTo(cx + first.hx * unit * beat, cy + first.hy * unit * beat);
      for (let i = 1; i < max; i++) {
        const prev = outline[i - 1];
        const cur = outline[i];
        const px = cx + prev.hx * unit * beat;
        const py = cy + prev.hy * unit * beat;
        const nextX = cx + cur.hx * unit * beat;
        const nextY = cy + cur.hy * unit * beat;
        ctx.quadraticCurveTo(px, py, (px + nextX) / 2, (py + nextY) / 2);
      }
      ctx.stroke();
    }

    function drawSpline(ctx, points) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const cur = points[i];
        const midX = (prev.x + cur.x) / 2;
        const midY = (prev.y + cur.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }

    function getBaseSide(el, i) {
      if (isSmall) return 0.12;
      if (el.classList.contains("hero")) return 0.5;
      if (el.classList.contains("chapter")) return 0.12;
      if (el.classList.contains("milestone")) return 0.5;
      if (el.classList.contains("letter") || el.classList.contains("finale")) return 0.5;
      if (el.classList.contains("numbers")) return 0.84;
      if (el.classList.contains("reverse")) return 0.82;
      if (el.matches("[data-moment]")) return 0.18;
      return 0.18 + (i % 4) * 0.18;
    }

    function createSatellites(seed) {
      const total = 7 + (seed % 4);
      const sats = [];
      for (let i = 0; i < total; i++) {
        sats.push({
          angle: rand(seed * 31 + i * 7) * Math.PI * 2,
          distance: (isSmall ? 24 : 34) + rand(seed * 19 + i * 13) * (isSmall ? 36 : 76),
          size: 1 + rand(seed * 23 + i * 5) * 2.1,
          phase: rand(seed * 29 + i * 17) * Math.PI * 2,
          speed: 0.0021 + rand(seed * 37 + i * 3) * 0.003
        });
      }
      return sats;
    }

    function createStars(count) {
      const out = [];
      for (let i = 0; i < count; i++) {
        out.push({
          x: rand(i * 17 + 4),
          y: rand(i * 29 + 7),
          size: 0.72 + rand(i * 13 + 2) * (isSmall ? 1.35 : 2.15),
          alpha: 0.22 + rand(i * 23 + 8) * 0.5,
          phase: rand(i * 31 + 5) * Math.PI * 2,
          speed: 0.001 + rand(i * 11 + 9) * 0.003,
          drift: (rand(i * 43 + 1) - 0.5) * (isSmall ? 34 : 92),
          float: 4 + rand(i * 47 + 6) * (isSmall ? 6 : 16)
        });
      }
      return out;
    }

    function readMood() {
      const styles = root.style;
      return {
        a: styles.getPropertyValue("--mood-a").trim() || fallbackMood.a,
        b: styles.getPropertyValue("--mood-b").trim() || fallbackMood.b,
        c: styles.getPropertyValue("--mood-c").trim() || fallbackMood.c,
        deep: styles.getPropertyValue("--mood-deep").trim() || fallbackMood.deep,
        book: parseFloat(styles.getPropertyValue("--book-progress")) || 0
      };
    }

    function rgba(channels, alpha) {
      return "rgba(" + channels.replace(/\s+/g, ",") + "," + alpha + ")";
    }

    function rand(seed) {
      const x = Math.sin(seed * 999.917) * 10000;
      return x - Math.floor(x);
    }

    function distance(x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

  }

  /* ---------- 3C. PHOTO PORTALS — step inside the memory ----------
     Clicking a print opens it as a full-screen portal: the memory becomes the
     world (Ken-Burns sky + dust + parallax), the photo lands as a polaroid with
     the caption handwritten on its bottom border, and ‹ › / arrows / swipe flip
     between memories without leaving. Close flies the print back to its frame. */
  function setupPhotoViewer(hasGSAP) {
    const viewer = document.getElementById("photo-viewer");
    const viewerImg = document.getElementById("photo-viewer-img");
    const captionTitle = document.getElementById("photo-viewer-caption");
    const captionDate = document.getElementById("photo-viewer-date");
    const closeBtn = document.getElementById("photo-close");
    const prevBtn = document.getElementById("photo-prev");
    const nextBtn = document.getElementById("photo-next");
    const counterIndex = document.getElementById("portal-index");
    const counterTotal = document.getElementById("portal-total");
    const backdrop = viewer ? viewer.querySelector(".photo-viewer-backdrop") : null;
    const shell = viewer ? viewer.querySelector(".photo-viewer-shell") : null;
    const print = viewer ? viewer.querySelector(".portal-print") : null;
    const gloss = viewer ? viewer.querySelector(".portal-gloss") : null;
    const skyA = viewer ? viewer.querySelector(".sky-a") : null;
    const skyB = viewer ? viewer.querySelector(".sky-b") : null;
    const dustBox = viewer ? viewer.querySelector(".portal-dust") : null;
    if (!viewer || !viewerImg || !captionTitle || !closeBtn || !backdrop || !shell || !print) return;

    const allowMotion = hasGSAP && !reduceMotion;
    const gallery = [];
    const photoFrames = [];
    let current = -1;
    let navLock = false;
    let skyFlip = false;
    let idleTween = null;
    let lastFocus = null;
    const preloaded = {};
    const par = { x: 0, y: 0, tx: 0, ty: 0, raf: 0, on: false };

    document.querySelectorAll(".frame img").forEach(function (img) {
      const meta = getPhotoMeta(img);
      const label = getPhotoCaption(img);
      const frame = img.closest(".frame");
      gallery.push({ img: img, frame: frame, meta: meta });
      img.setAttribute("role", "button");
      img.setAttribute("tabindex", "0");
      img.setAttribute("aria-label", label ? "open photo: " + label : "open photo");
      if (frame) {
        frame.setAttribute("role", "button");
        frame.setAttribute("tabindex", "-1");
        frame.setAttribute("aria-label", label ? "open photo: " + label : "open photo");
        frame.addEventListener("click", function () { openPhoto(img); });
        photoFrames.push({ frame: frame, img: img });
      }
      img.addEventListener("click", function (e) {
        e.stopPropagation();
        openPhoto(img);
      });
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPhoto(img);
        }
      });
    });
    if (counterTotal) counterTotal.textContent = String(gallery.length);

    document.addEventListener("click", function (e) {
      if (viewer.classList.contains("is-open") || !photoFrames.length) return;
      for (let i = 0; i < photoFrames.length; i++) {
        const item = photoFrames[i];
        const rect = item.frame.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          e.preventDefault();
          e.stopPropagation();
          openPhoto(item.img);
          return;
        }
      }
    }, true);

    closeBtn.addEventListener("click", closePhoto);
    backdrop.addEventListener("click", closePhoto);
    if (prevBtn) prevBtn.addEventListener("click", function (e) { e.stopPropagation(); navigate(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function (e) { e.stopPropagation(); navigate(1); });
    document.addEventListener("keydown", function (e) {
      if (!viewer.classList.contains("is-open")) return;
      if (e.key === "Escape") closePhoto();
      else if (e.key === "ArrowRight") navigate(1);
      else if (e.key === "ArrowLeft") navigate(-1);
    });

    // swipe between memories (any pointer — fast horizontal drag)
    let swipe = null;
    shell.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button")) { swipe = null; return; }
      swipe = { x: e.clientX, y: e.clientY, t: Date.now() };
    }, { passive: true });
    shell.addEventListener("pointerup", function (e) {
      if (!swipe) return;
      const dx = e.clientX - swipe.x;
      const dy = e.clientY - swipe.y;
      const dt = Date.now() - swipe.t;
      swipe = null;
      if (dt < 650 && Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.4) navigate(dx < 0 ? 1 : -1);
    }, { passive: true });

    // cursor parallax — the world leans away, the print leans in
    viewer.addEventListener("pointermove", function (e) {
      if (!par.on) return;
      par.tx = (e.clientX / innerWidth) * 2 - 1;
      par.ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });

    function wrapIndex(i) { return (i + gallery.length) % gallery.length; }
    function srcFor(item) { return item.img.currentSrc || item.img.src || item.img.getAttribute("src"); }

    function preload(i) {
      if (!gallery.length) return;
      const src = gallery[wrapIndex(i)].img.getAttribute("src");
      if (!src || preloaded[src]) return;
      preloaded[src] = true;
      const im = new Image();
      im.src = src;
    }

    function setContent(item) {
      viewerImg.src = srcFor(item);
      viewerImg.alt = item.meta.title || "photo memory";
      captionTitle.textContent = item.meta.title;
      captionDate.textContent = item.meta.date;
      if (counterIndex) counterIndex.textContent = String(gallery.indexOf(item) + 1);
      shell.setAttribute("aria-label", "photo memory" + (item.meta.title ? " — " + item.meta.title : ""));
    }

    function setSky(src) {
      if (!skyA || !skyB) return;
      const incoming = skyFlip ? skyA : skyB;
      const outgoing = skyFlip ? skyB : skyA;
      skyFlip = !skyFlip;
      incoming.style.backgroundImage = "url(\"" + src.replace(/"/g, "\\\"") + "\")";
      incoming.classList.add("is-live");
      outgoing.classList.remove("is-live");
    }

    function spawnDust() {
      if (!dustBox || dustBox.childElementCount || reduceMotion) return;
      const total = isSmall ? 10 : 16;
      for (let i = 0; i < total; i++) {
        const mote = document.createElement("span");
        mote.className = "dust-mote tint-" + (i % 3);
        mote.style.left = (4 + Math.random() * 92).toFixed(1) + "%";
        mote.style.setProperty("--size", (2.5 + Math.random() * 4.5).toFixed(1) + "px");
        mote.style.setProperty("--dur", (9 + Math.random() * 9).toFixed(1) + "s");
        mote.style.setProperty("--delay", (-Math.random() * 14).toFixed(1) + "s");
        mote.style.setProperty("--sway", ((Math.random() - 0.5) * 60).toFixed(0) + "px");
        mote.style.setProperty("--peak", (0.3 + Math.random() * 0.45).toFixed(2));
        dustBox.appendChild(mote);
      }
    }

    function captionWriteOn(delay) {
      if (!window.gsap) {
        captionTitle.style.clipPath = "none";
        captionDate.style.opacity = "1";
        return;
      }
      gsap.killTweensOf([captionTitle, captionDate]);
      gsap.fromTo(captionTitle,
        { clipPath: "inset(-14% 103% -18% -3%)", autoAlpha: 1, y: 0 },
        { clipPath: "inset(-14% -3% -18% -3%)", duration: reduceMotion ? 0.01 : 0.72, delay: delay, ease: "power2.out" });
      gsap.fromTo(captionDate,
        { autoAlpha: 0, y: 7 },
        { autoAlpha: 1, y: 0, duration: reduceMotion ? 0.01 : 0.45, delay: delay + 0.32, ease: "power2.out" });
    }

    function glossSweep(delay) {
      if (!gloss || !allowMotion) return;
      gsap.killTweensOf(gloss);
      gsap.fromTo(gloss, { xPercent: -165 }, { xPercent: 165, duration: 0.95, delay: delay, ease: "power2.inOut" });
    }

    function startIdle() {
      if (!allowMotion) return;
      stopIdle();
      idleTween = gsap.to(print, {
        y: "-=7", rotationZ: "-=0.55", duration: 3.1, ease: "sine.inOut", yoyo: true, repeat: -1
      });
    }
    function stopIdle() {
      if (idleTween) { idleTween.kill(); idleTween = null; }
    }

    function startParallax() {
      if (!allowMotion || isSmall) return;
      par.on = true;
      par.x = par.y = par.tx = par.ty = 0;
      const step = function () {
        if (!par.on) return;
        par.x += (par.tx - par.x) * 0.06;
        par.y += (par.ty - par.y) * 0.06;
        viewer.style.setProperty("--par-x", par.x.toFixed(4));
        viewer.style.setProperty("--par-y", par.y.toFixed(4));
        par.raf = requestAnimationFrame(step);
      };
      par.raf = requestAnimationFrame(step);
    }
    function stopParallax() {
      par.on = false;
      if (par.raf) cancelAnimationFrame(par.raf);
      viewer.style.setProperty("--par-x", "0");
      viewer.style.setProperty("--par-y", "0");
    }

    function openPhoto(img) {
      if (viewer.classList.contains("is-open")) return;
      const index = gallery.findIndex(function (item) { return item.img === img; });
      current = index >= 0 ? index : 0;
      const item = gallery[current];
      lastFocus = document.activeElement;
      spawnDust();

      const origin = img.getBoundingClientRect();
      const originX = origin.left + origin.width / 2;
      const originY = origin.top + origin.height / 2;
      viewer.style.setProperty("--portal-x", ((originX / innerWidth) * 100).toFixed(2) + "%");
      viewer.style.setProperty("--portal-y", ((originY / innerHeight) * 100).toFixed(2) + "%");
      setContent(item);
      setSky(srcFor(item));
      viewer.classList.add("is-open");
      viewer.setAttribute("aria-hidden", "false");
      document.body.classList.add("viewer-open");
      closeBtn.focus({ preventScroll: true });
      preload(current + 1);
      preload(current - 1);

      window.dispatchEvent(new CustomEvent("loveburst", {
        detail: { x: originX, y: originY, count: 14, spread: Math.min(180, Math.max(origin.width, origin.height)) }
      }));

      if (allowMotion) {
        requestAnimationFrame(function () {
          const target = print.getBoundingClientRect();
          const targetX = target.left + target.width / 2;
          const targetY = target.top + target.height / 2;
          const scale = target.width ? Math.max(0.08, Math.min(1.6, origin.width / target.width)) : 0.4;
          gsap.killTweensOf([viewer, shell, print, captionTitle, captionDate]);
          gsap.fromTo(viewer,
            { clipPath: "circle(" + Math.max(40, origin.width * 0.35) + "px at " + originX + "px " + originY + "px)" },
            { clipPath: "circle(150% at " + originX + "px " + originY + "px)", duration: 0.85,
              ease: "power3.inOut", clearProps: "clipPath" });
          const flight = gsap.timeline();
          flight.fromTo(print,
            { x: originX - targetX, y: originY - targetY, scale: scale, rotationZ: -8 },
            { x: 0, y: 0, scale: 1, rotationZ: -1.6, duration: 0.9, ease: "power4.inOut" });
          flight.to(print, { rotationZ: -1.2, duration: 0.34, ease: "back.out(2.6)" }, ">-0.04");
          flight.add(startIdle);
          glossSweep(0.62);
          captionWriteOn(0.56);
        });
        startParallax();
      } else {
        captionTitle.style.clipPath = "none";
        captionDate.style.opacity = "1";
      }
    }

    function navigate(dir) {
      if (!viewer.classList.contains("is-open") || gallery.length < 2 || navLock) return;
      current = wrapIndex(current + dir);
      const item = gallery[current];
      preload(current + dir);
      preload(current - dir);
      viewer.style.setProperty("--portal-x", "50%");
      viewer.style.setProperty("--portal-y", "50%");

      if (!allowMotion) {
        setContent(item);
        setSky(srcFor(item));
        captionTitle.style.clipPath = "none";
        captionDate.style.opacity = "1";
        return;
      }

      navLock = true;
      stopIdle();
      gsap.killTweensOf([print, captionTitle, captionDate]);
      const tl = gsap.timeline({ onComplete: function () { navLock = false; } });
      tl.to([captionTitle, captionDate], { autoAlpha: 0, y: 8, duration: 0.16, ease: "power1.in" }, 0);
      tl.to(print, { x: -64 * dir, rotationZ: -5 * dir, autoAlpha: 0.001, duration: 0.3, ease: "power2.in" }, 0);
      tl.add(function () {
        setContent(item);
        setSky(srcFor(item));
        gsap.set(print, { x: 70 * dir, y: 0, rotationZ: 4.5 * dir, autoAlpha: 0.001 });
      });
      tl.to(print, { x: 0, rotationZ: -1.2, autoAlpha: 1, duration: 0.55, ease: "power3.out" });
      tl.add(function () {
        glossSweep(0);
        captionWriteOn(0.04);
        startIdle();
        const rect = print.getBoundingClientRect();
        window.dispatchEvent(new CustomEvent("loveburst", {
          detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, count: 6, spread: 90 }
        }));
      }, ">-0.28");
    }

    function closePhoto() {
      if (!viewer.classList.contains("is-open")) return;
      function finishClose() {
        viewer.classList.remove("is-open");
        viewer.setAttribute("aria-hidden", "true");
        document.body.classList.remove("viewer-open");
        stopParallax();
        navLock = false;
        if (window.gsap) gsap.set([viewer, shell, print, viewerImg, captionTitle, captionDate], { clearProps: "all" });
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      }
      stopIdle();
      if (allowMotion) {
        gsap.killTweensOf([viewer, shell, print, viewerImg, captionTitle, captionDate]);
        const item = gallery[current];
        const rect = item ? item.img.getBoundingClientRect() : null;
        const printRect = print.getBoundingClientRect();
        const printX = printRect.left + printRect.width / 2;
        const printY = printRect.top + printRect.height / 2;
        const visible = rect && rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight;
        gsap.to([captionTitle, captionDate], { autoAlpha: 0, y: 10, duration: 0.15, ease: "power1.in" });
        if (visible) {
          // fly the print home into its frame, and collapse the portal onto it
          const rx = rect.left + rect.width / 2;
          const ry = rect.top + rect.height / 2;
          gsap.to(print, {
            x: "+=" + (rx - printX), y: "+=" + (ry - printY),
            scale: Math.max(0.08, rect.width / Math.max(1, printRect.width)),
            rotationZ: -5, duration: 0.55, ease: "power3.inOut"
          });
          gsap.fromTo(viewer,
            { clipPath: "circle(150% at " + rx + "px " + ry + "px)" },
            { clipPath: "circle(0px at " + rx + "px " + ry + "px)", duration: 0.6, delay: 0.05,
              ease: "power3.inOut", onComplete: finishClose });
        } else {
          gsap.to(print, { scale: 0.85, autoAlpha: 0, y: "+=26", duration: 0.34, ease: "power2.in" });
          gsap.to(viewer, { opacity: 0, duration: 0.36, ease: "power1.in", onComplete: finishClose });
        }
      } else {
        finishClose();
      }
    }
  }

  function getPhotoMeta(img) {
    const moment = img.closest("[data-moment]");
    if (moment) {
      const date = moment.querySelector(".moment-date");
      const title = moment.querySelector(".moment-title");
      return {
        date: date ? date.textContent.trim() : "",
        title: title ? title.textContent.trim() : (img.alt || "one of our pages")
      };
    }
    const src = img.getAttribute("src");
    const match = Array.prototype.slice.call(document.querySelectorAll("[data-moment] img"))
      .find(function (candidate) { return candidate.getAttribute("src") === src; });
    if (match && match !== img) return getPhotoMeta(match);
    return { date: "", title: img.alt || "one of our pages" };
  }

  function getPhotoCaption(img) {
    const meta = getPhotoMeta(img);
    return [meta.date, meta.title].filter(Boolean).join(" · ");
  }

  function setupPhotoTilt() {
    if (!heavy) return;
    document.querySelectorAll(".frame").forEach(function (frame) {
      let queued = false;
      let active = false;
      let nextX = 0;
      let nextY = 0;
      frame.addEventListener("pointermove", function (e) {
        active = true;
        nextX = e.clientX;
        nextY = e.clientY;
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () {
          queued = false;
          if (!active) return;
          applyTilt(nextX, nextY);
        });
      }, { passive: true });
      frame.addEventListener("pointerleave", function () {
        active = false;
        queued = false;
        frame.style.setProperty("--rx", "0deg");
        frame.style.setProperty("--ry", "0deg");
        frame.style.setProperty("--lift", "0px");
        frame.classList.remove("is-tilting");
      });

      function applyTilt(x, y) {
        const r = frame.getBoundingClientRect();
        const px = ((x - r.left) / r.width) - 0.5;
        const py = ((y - r.top) / r.height) - 0.5;
        frame.style.setProperty("--rx", (-py * 7).toFixed(2) + "deg");
        frame.style.setProperty("--ry", (px * 7).toFixed(2) + "deg");
        frame.style.setProperty("--lift", "-6px");
        frame.classList.add("is-tilting");
      }
    });
  }

  /* ---------- 3D. HANDWRITTEN LETTER ---------- */
  function setupLetter(hasGSAP, lenis) {
    const stage = document.querySelector(".letter-stage");
    const envelope = document.getElementById("letter-envelope");
    const paper = document.getElementById("letter-paper");
    if (!stage || !envelope || !paper) return;

    const canWrite = hasGSAP && !reduceMotion;
    const writingTargets = prepareWritableLetter();
    let writeTl = null;
    let pen = null;
    if (canWrite) {
      pen = document.createElement("span");
      pen.className = "letter-pen-caret";
      pen.setAttribute("aria-hidden", "true");
      paper.appendChild(pen);
      resetLetterWriting();
    }

    let open = false;
    envelope.addEventListener("click", function () { setOpen(!open); });

    if (hasGSAP && heavy && window.ScrollTrigger) {
      ScrollTrigger.create({
        trigger: ".letter",
        start: "top 62%",
        end: "bottom 30%",
        onEnter: function () { stage.classList.add("is-peeking"); },
        onEnterBack: function () { stage.classList.add("is-peeking"); },
        onLeaveBack: function () { if (!open) stage.classList.remove("is-peeking"); }
      });
      gsap.fromTo(".letter-stage", { rotateX: 8, y: 70 }, {
        rotateX: 0, y: 0, ease: "none",
        scrollTrigger: { trigger: ".letter", start: "top bottom", end: "center center", scrub: true }
      });
    } else {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            stage.classList.add("is-peeking");
            io.disconnect();
          }
        });
      }, { threshold: 0.35 });
      io.observe(stage);
    }

    function setOpen(next) {
      open = next;
      envelope.classList.toggle("is-open", open);
      paper.classList.toggle("is-open", open);
      stage.classList.add("is-peeking");
      envelope.setAttribute("aria-expanded", open ? "true" : "false");
      paper.setAttribute("aria-hidden", open ? "false" : "true");
      if (open) {
        paper.scrollTop = 0;
        [90, 680, 1150, 1650].forEach(function (delay) {
          setTimeout(function () {
            centerPaper();
            refreshScroll();
          }, delay);
        });
        window.dispatchEvent(new CustomEvent("loveburst", {
          detail: { x: innerWidth / 2, y: innerHeight * 0.55, count: 26, spread: 150 }
        }));
        playLetterWriting();
      } else {
        resetLetterWriting();
      }
    }

    function prepareWritableLetter() {
      const targets = [];
      Array.prototype.slice.call(paper.querySelectorAll(".letter-date, .letter-handwriting p")).forEach(function (line) {
        const original = line.dataset.originalText || line.textContent || "";
        line.dataset.originalText = original;
        line.textContent = "";
        original.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            line.appendChild(document.createTextNode(part));
            return;
          }
          const token = document.createElement("span");
          token.className = "letter-write-token";
          token.textContent = part;
          line.appendChild(token);
          targets.push(token);
        });
      });
      return targets;
    }

    function resetLetterWriting() {
      if (!canWrite || !writingTargets.length) return;
      if (writeTl) {
        writeTl.kill();
        writeTl = null;
      }
      paper.classList.remove("is-written");
      paper.classList.add("is-writing");
      gsap.set(writingTargets, {
        clipPath: "inset(-6px 100% -6px 0)",
        opacity: 0,
        y: 2
      });
      if (pen) gsap.set(pen, { opacity: 0, x: 0, y: 0 });
    }

    function playLetterWriting() {
      if (!canWrite || !writingTargets.length) return;
      resetLetterWriting();
      writeTl = gsap.timeline({
        delay: 0.52,
        onComplete: function () {
          paper.classList.remove("is-writing");
          paper.classList.add("is-written");
          gsap.set(writingTargets, { clearProps: "clipPath,opacity,transform" });
          if (pen) gsap.to(pen, { opacity: 0, duration: 0.22, ease: "sine.out" });
        }
      });

      let gapBefore = 0;
      writingTargets.forEach(function (token) {
        const text = token.textContent || "";
        const duration = Math.min(0.13, 0.024 + text.length * 0.006);
        writeTl.to(token, {
          clipPath: "inset(-6px 0% -6px 0)",
          opacity: 1,
          y: 0,
          duration: duration,
          ease: "sine.out",
          onStart: function () { movePenTo(token); }
        }, "+=" + gapBefore);
        gapBefore = /[.!?]$/.test(text) ? 0.055 : (/[,;:]$/.test(text) ? 0.026 : 0.006);
      });
      if (pen) writeTl.to(pen, { opacity: 0, duration: 0.28, ease: "sine.out" }, "+=0.18");
    }

    function movePenTo(token) {
      if (!pen || !token) return;
      const tokenRect = token.getBoundingClientRect();
      const paperRect = paper.getBoundingClientRect();
      const x = tokenRect.right - paperRect.left + paper.scrollLeft + 3;
      const y = tokenRect.bottom - paperRect.top + paper.scrollTop - 7;
      gsap.to(pen, {
        x: x,
        y: y,
        opacity: 0.82,
        duration: 0.08,
        ease: "sine.out"
      });
    }

    function centerPaper() {
      const rect = paper.getBoundingClientRect();
      const targetTop = Math.max(34, (innerHeight - rect.height) / 2);
      const delta = rect.top - targetTop;
      if (Math.abs(delta) < 8) return;
      const targetScroll = Math.max(0, scrollY + delta);
      if (lenis && typeof lenis.scrollTo === "function") {
        lenis.scrollTo(targetScroll, {
          duration: reduceMotion ? 0 : 0.9,
          easing: function (t) { return 1 - Math.pow(1 - t, 3); }
        });
      } else {
        scrollTo({ top: targetScroll, behavior: reduceMotion ? "auto" : "smooth" });
      }
      setTimeout(correctPaperPosition, reduceMotion ? 0 : 180);
      setTimeout(correctPaperPosition, reduceMotion ? 0 : 760);
    }

    function correctPaperPosition() {
      const rect = paper.getBoundingClientRect();
      const targetTop = Math.max(34, (innerHeight - rect.height) / 2);
      const targetBottom = Math.min(innerHeight - 34, targetTop + rect.height);
      let delta = 0;
      if (rect.top < targetTop - 6) delta = rect.top - targetTop;
      else if (rect.bottom > targetBottom + 6) delta = rect.bottom - targetBottom;
      if (Math.abs(delta) < 6) return;
      scrollTo({ top: Math.max(0, scrollY + delta), behavior: "auto" });
    }
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
      else if (window.gsap && !reduceMotion) {
        gsap.fromTo(el, { scale: 1.16 }, { scale: 1, duration: 0.55, ease: "back.out(2.4)" });
      }
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
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    const colors = ["#f8fbff", "#dceaff", "#a9c9ff", "#6fa0ff", "#c7dcff"];
    const MAX_PARTICLES = 120;
    let w, h, dpr = 1, particles = [], last = null, pointer = null, lastSpark = 0, running = false;

    function size() {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = canvas.width = Math.floor(innerWidth * dpr);
      h = canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); addEventListener("resize", size);

    addEventListener("pointermove", function (e) {
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const point = events[events.length - 1] || e;
      emitTrail(point.clientX, point.clientY, performance.now());
    }, { passive: true });

    addEventListener("pointerleave", function () {
      last = null;
      pointer = null;
    });

    addEventListener("blur", function () {
      last = null;
      pointer = null;
    });

    function emitTrail(x, y, now) {
      const dx = last ? x - last.x : 0;
      const dy = last ? y - last.y : 0;
      const dist = Math.hypot(dx, dy);

      if (!last) {
        pointer = { x: x, y: y, t: now, speed: 9, angle: 0 };
        addHeart(x, y, 0, 0, 9, true);
        last = { x: x, y: y, t: now };
        return;
      }

      const dt = Math.max(8, now - last.t);
      const speed = Math.min(50, dist / (dt / 16.67));
      pointer = { x: x, y: y, t: now, speed: speed, angle: Math.atan2(dy, dx || 1) };

      if (dist < 0.9) return;
      if (now - last.t > 180 || dist > 360) {
        addHeart(x, y, 0, 0, 9, true);
        last = { x: x, y: y, t: now };
        return;
      }

      const spacing = speed > 24 ? 6.5 : speed > 10 ? 8.5 : 11;
      const count = Math.max(1, Math.min(5, Math.ceil(dist / spacing)));
      for (let i = 1; i <= count; i++) {
        const p = i / count;
        const x = last.x + dx * p;
        const y = last.y + dy * p;
        addHeart(x, y, dx, dy, speed, i === count);
        if (speed > 28 && i === count && now - lastSpark > 38) {
          addSpark(x, y, dx, dy);
          lastSpark = now;
        }
      }
      last = { x: x, y: y, t: now };
    }

    addEventListener("pointerdown", function (e) {
      burstAt(e.clientX, e.clientY, 14, 0);
    });

    addEventListener("loveburst", function (e) {
      const detail = e.detail || {};
      burstAt(detail.x || innerWidth / 2, detail.y || innerHeight / 2, detail.count || 24, detail.spread || 0);
    });

    function burstAt(x, y, count, spread) {
      const total = Math.min(count, 22);
      for (let i = 0; i < total; i++) {
        const angle = (Math.PI * 2 * i) / total;
        const ox = spread ? (Math.random() - 0.5) * spread : 0;
        const oy = spread ? (Math.random() - 0.5) * spread * 0.65 : 0;
        particles.push({
          type: i % 3 ? "spark" : "heart",
          x: x + ox,
          y: y + oy,
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
      trimParticles();
      ensureLoop();
    }

    function addHeart(x, y, dx, dy, speed, lead) {
      particles.push({
        type: "heart",
        x: x + (Math.random() - 0.5) * (lead ? 1.2 : 2.6),
        y: y + (Math.random() - 0.5) * (lead ? 1.2 : 2.6),
        vx: (Math.random() - 0.5) * (lead ? 0.18 : 0.38),
        vy: -0.08 - Math.random() * (lead ? 0.2 : 0.34),
        size: 6.5 + Math.random() * 6 + speed * (lead ? 0.1 : 0.08),
        life: 1,
        decay: (lead ? 0.021 : 0.018) + Math.random() * 0.008,
        rot: Math.atan2(dy, dx || 1) + (Math.random() - 0.5) * (lead ? 0.3 : 0.56),
        spin: (Math.random() - 0.5) * (lead ? 0.025 : 0.045),
        color: lead ? colors[Math.floor(Math.random() * 3)] : colors[Math.floor(Math.random() * colors.length)]
      });
      trimParticles();
      ensureLoop();
    }

    function addSpark(x, y, dx, dy) {
      particles.push({
        type: "spark",
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.1,
        vy: (Math.random() - 0.5) * 1.1,
        size: 2.5 + Math.random() * 5,
        life: 1,
        decay: 0.02 + Math.random() * 0.016,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.16,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
      trimParticles();
      ensureLoop();
    }

    function trimParticles() {
      if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
    }

    function drawHeart(p) {
      const s = p.size / 18;
      const life = Math.max(0, p.life);
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
      ctx.shadowBlur = life > 0.35 ? 12 * life : 0;
      ctx.globalAlpha = life * 0.95;
      ctx.fill();
      if (life > 0.45) {
        ctx.globalAlpha = life * 0.2;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawLeadHeart() {
      if (!pointer) return;
      const age = performance.now() - pointer.t;
      if (age > 140) return;
      drawHeart({
        x: pointer.x,
        y: pointer.y,
        vx: 0,
        vy: 0,
        size: 8 + Math.min(4, pointer.speed * 0.08),
        life: 0.78 * (1 - age / 140),
        rot: pointer.angle + 0.18,
        spin: 0,
        color: "#f8fbff"
      });
    }

    function drawSpark(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life) * 0.86;
      ctx.lineWidth = 1.7;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(p.size, 0);
      ctx.moveTo(0, -p.size);
      ctx.lineTo(0, p.size);
      ctx.stroke();
      ctx.restore();
    }

    function ensureLoop() {
      if (running) return;
      running = true;
      requestAnimationFrame(loop);
    }

    function loop() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      let write = 0;
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
        particles[write++] = p;
      }
      particles.length = write;
      drawLeadHeart();
      if (particles.length || (pointer && performance.now() - pointer.t <= 140)) {
        requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }
  })();

})();
