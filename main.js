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
      lenis = new Lenis({ lerp: 0.13, smoothWheel: true });
      lenis.on("scroll", function () { if (window.ScrollTrigger) ScrollTrigger.update(); });
    }
    if (window.gsap) {
      gsap.ticker.add(function (t) { if (lenis) lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    const hasGSAP = window.gsap && window.ScrollTrigger;
    if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
    setupImageLoading();
    setupPhotoViewer(hasGSAP);
    setupLetter(hasGSAP, lenis);
    setupPhotoTilt();
    setupAmbientStory(hasGSAP);
    setupJourneyCanvas(hasGSAP);
    setupOpeningFilm(hasGSAP, heavy, lenis); // before the reveal system: the film owns the hero copy

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

    const Z = isSmall
      ? { base: 11, leaf2: 12, leaf1: 13, cover: 15.6, coverLand: 3, leaf1Land: 6.5, leaf2Land: 10, lift: 26, coverLift: 22, dive: 2.6 }
      : { base: 18, leaf2: 19.2, leaf1: 20.6, cover: 24, coverLand: 4, leaf1Land: 9, leaf2Land: 14, lift: 50, coverLift: 40, dive: 3.0 };

    window.scrollTo(0, 0);
    document.body.classList.add("book-intro-playing");
    if (lenis && typeof lenis.stop === "function") lenis.stop();

    // GSAP owns the hero copy during the film (keep the IO reveal system away)
    const heroBits = gsap.utils.toArray(".hero-content .reveal");
    heroBits.forEach(function (el) { el.classList.remove("reveal"); });

    gsap.set(".book-scene, .book-root, .cover, .leaf", { force3D: true });
    gsap.set(".book-scene", { rotationX: 56, rotationY: -11, rotationZ: -5, scale: 0.96, transformOrigin: "50% 54%" });
    gsap.set(".book-root", { xPercent: -25, y: 30, transformOrigin: "50% 50%" });
    gsap.set(".cover", { z: Z.cover, rotationY: 0, transformOrigin: "0% 50%" });
    gsap.set(".leaf-1", { z: Z.leaf1, rotationY: 0, transformOrigin: "0% 50%" });
    gsap.set(".leaf-2", { z: Z.leaf2, rotationY: 0, transformOrigin: "0% 50%" });
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
      .add("open", 1.25)
      .to(".cover", { keyframes: { rotationY: [0, -66, -180], z: [Z.cover, Z.cover + Z.coverLift, Z.coverLand] }, duration: 2.3, ease: "power1.inOut" }, "open")
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

    // III & IV. two unhurried page turns — every spread gets its moment
    addTurn("turn1", ".leaf-1", Z.leaf1, Z.leaf1Land, ".leaf-2 .leaf-front .page-cast", ".cover-inside .page-cast", 5.15);
    tl.to(".memory-card.card-c, .memory-card.card-d", { autoAlpha: 0.5, y: 0, scale: 0.97, duration: 1.0, stagger: 0.16, ease: "power2.out" }, 6.0)
      // read beat: our first strip + where it began
      .to(".leaf-1 .leaf-back .page-photo, .leaf-2 .leaf-front .page-photo", { scale: 1.03, duration: 1.5, ease: "sine.inOut" }, 6.7);
    addTurn("turn2", ".leaf-2", Z.leaf2, Z.leaf2Land, ".base-page .page-cast", ".leaf-1 .leaf-back .page-cast", 8.2);

    // V. linger on the last spread, then dive into the photo → hero match-cut
    tl.to(".leaf-2 .leaf-back .page-photo, .base-page .page-photo", { scale: 1.035, duration: 1.7, ease: "sine.inOut" }, 9.7)
      .to(".book-glow", { opacity: 0.28, duration: 0.9, ease: "sine.inOut" }, 9.7)
      .add("dive", 11.5)
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
      tl.add(label, at)
        .to(leaf, { keyframes: { rotationY: [0, -74, -180], z: [zFrom, zFrom + Z.lift, zLand], skewY: [0, -1.7, 0] }, duration: 1.45, ease: "power2.inOut" }, label)
        .to(leaf + " .leaf-front .leaf-shade", { opacity: 0.32, duration: 0.7, ease: "sine.in" }, label)
        .fromTo(leaf + " .leaf-back .leaf-shade", { opacity: 0.5 }, { opacity: 0.06, duration: 0.75, ease: "sine.out" }, label + "+=0.62")
        .fromTo(underCast, { opacity: 0, scaleX: 0.3 }, { opacity: 0.4, scaleX: 1.05, duration: 0.7, ease: "sine.out" }, label)
        .to(underCast, { opacity: 0, duration: 0.7, ease: "sine.in" }, label + "+=0.7")
        .fromTo(landCast, { opacity: 0, scaleX: 1.15 }, { opacity: 0.34, scaleX: 1, duration: 0.55, ease: "sine.out" }, label + "+=0.55")
        .to(landCast, { opacity: 0, duration: 0.45, ease: "sine.out" }, label + "+=1.18")
        .to(".book-ground", { opacity: 0.82, duration: 0.2, yoyo: true, repeat: 1, ease: "sine.inOut" }, label + "+=1.2")
        .to(".book-glow", { opacity: 0.3, duration: 0.4, ease: "sine.out" }, label + "+=0.9")
        .to(".book-glow", { opacity: 0.13, duration: 0.6, ease: "sine.inOut" }, label + "+=1.4");
    }

    /* skip: one flick, key, or tap on the pill fast-forwards the film */
    let skipping = false;
    function skipFilm() {
      if (skipping || !document.body.classList.contains("book-intro-playing")) return;
      skipping = true;
      if (skipBtn) skipBtn.classList.remove("is-live");
      tl.pause();
      gsap.to(tl, { progress: 1, duration: 0.95, ease: "power1.inOut" });
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
      new Promise(function (resolve) { setTimeout(resolve, 1400); })
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
        setTimeout(function () {
          const preloader = new Image();
          preloader.decoding = "async";
          preloader.onload = refreshScroll;
          preloader.src = src;
          if (i < 8 && preloader.decode) preloader.decode().then(refreshScroll).catch(noop);
        }, delay);
      });
    });
  }

  function markImageReady(img) {
    img.classList.add("is-loaded");
    const frame = img.closest(".frame");
    if (frame) frame.classList.add("is-loaded");
    refreshScroll();
  }

  /* ---------- 3B. AMBIENT STORY BACKDROP ---------- */
  function setupAmbientStory(hasGSAP) {
    const ambience = document.getElementById("ambience");
    if (!ambience) return;

    const root = document.documentElement;
    const photoLayers = Array.prototype.slice.call(ambience.querySelectorAll(".ambient-photo"));
    const scenes = Array.prototype.slice.call(document.querySelectorAll(
      ".hero, .chapter, .milestone, [data-moment], .wall-sec, .numbers, .letter, .finale"
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

    activateNearestScene();

    if (hasGSAP && window.ScrollTrigger) {
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: function (self) {
          root.style.setProperty("--ribbon-shift", ((self.progress - 0.5) * 86).toFixed(2) + "%");
          scheduleAmbientUpdate();
        }
      });
      window.addEventListener("resize", debounce(activateNearestScene, 120));
    } else {
      window.addEventListener("scroll", scheduleAmbientUpdate, { passive: true });
      window.addEventListener("resize", scheduleAmbientUpdate);
    }

    function scheduleAmbientUpdate() {
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
      if (scene.classList.contains("finale") || scene.classList.contains("letter")) return 15;
      if (scene.classList.contains("wall-sec") || scene.classList.contains("numbers")) return 13;
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
      const img = scene.querySelector(".frame img, .wall img");
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
    if (!constellationCanvas || !journeyCanvas) return;

    const constellationCtx = constellationCanvas.getContext("2d");
    const journeyCtx = journeyCanvas.getContext("2d");
    if (!constellationCtx || !journeyCtx) return;

    const sceneEls = Array.prototype.slice.call(document.querySelectorAll(
      ".hero, .chapter, .milestone, [data-moment], .wall-sec, .numbers, .letter, .finale"
    ));
    if (!sceneEls.length) return;

    const memories = sceneEls.map(function (el, i) {
      el.dataset.storyIndex = i;
      return {
        el: el,
        index: i,
        satellites: createSatellites(i),
        baseSide: getBaseSide(el, i)
      };
    });
    const stars = createStars(isSmall ? 48 : 96);
    const root = document.documentElement;
    const fallbackMood = { a: "111 160 255", b: "255 159 182", c: "255 210 122", deep: "8 14 38" };

    let w = 0;
    let h = 0;
    let dpr = 1;
    let scrollProgress = 0;
    let activeIndex = 0;
    let lastScenePulse = -1;
    const pointer = { x: 0, y: 0, strength: 0 };

    size();
    updateState();
    draw(performance.now());

    addEventListener("resize", debounce(function () {
      size();
      updateState();
      draw(performance.now());
    }, 120));

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
          if (node && node.y > -60 && node.y < h + 60) {
            window.dispatchEvent(new CustomEvent("loveburst", {
              detail: { x: node.x, y: node.y, count: 10, spread: 54 }
            }));
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
    requestAnimationFrame(loop);

    function loop(now) {
      const minFrameMs = document.body.classList.contains("book-intro-playing") ? 160 : (isSmall ? 50 : 33);
      if (!document.hidden && now - lastCanvasFrame >= minFrameMs) {
        lastCanvasFrame = now;
        updateState();
        draw(now);
      }
      requestAnimationFrame(loop);
    }

    function size() {
      dpr = Math.min(isSmall ? 1.2 : 1.45, devicePixelRatio || 1);
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

    function updateState() {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - h);
      scrollProgress = clamp(scrollY / max, 0, 1);
      activeIndex = getActiveIndex();
    }

    function getActiveIndex() {
      const focusY = h * 0.52;
      let best = activeIndex;
      let bestScore = -Infinity;

      memories.forEach(function (memory) {
        const rect = memory.el.getBoundingClientRect();
        const visible = Math.max(0, Math.min(rect.bottom, h) - Math.max(rect.top, 0));
        if (visible <= 0) return;
        const center = rect.top + rect.height * 0.5;
        const centerDistance = Math.abs(center - focusY);
        const score = visible - centerDistance * 0.32;
        if (score > bestScore) {
          best = memory.index;
          bestScore = score;
        }
      });

      return best;
    }

    function getNodes() {
      return memories.map(function (memory) {
        const rect = memory.el.getBoundingClientRect();
        const centerY = rect.top + rect.height * 0.5;
        const localProgress = clamp((h * 0.78 - rect.top) / Math.max(1, rect.height + h * 0.56), 0, 1);
        const drift = Math.sin(memory.index * 1.37 + scrollProgress * Math.PI * 2) * (isSmall ? 7 : 24);
        const x = clamp(w * memory.baseSide + drift, isSmall ? 24 : 58, w - (isSmall ? 24 : 58));
        const visited = memory.index < activeIndex || centerY < h * 0.58;
        return {
          index: memory.index,
          el: memory.el,
          x: x,
          y: centerY,
          localProgress: localProgress,
          visited: visited,
          active: memory.index === activeIndex,
          satellites: memory.satellites
        };
      });
    }

    function draw(now) {
      const nodes = getNodes();
      const mood = readMood();
      pointer.strength *= 0.94;

      constellationCtx.clearRect(0, 0, w, h);
      journeyCtx.clearRect(0, 0, w, h);

      drawWorldCurtains(constellationCtx, now, mood);
      drawStarWorld(constellationCtx, now, mood);
      drawMemoryConstellations(constellationCtx, nodes, now, mood);
      drawFinalHeart(constellationCtx, now, mood);
      drawJourneyPath(journeyCtx, nodes, now, mood);
      drawBookWake(journeyCtx, nodes, now, mood);
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

    function drawJourneyPath(ctx, nodes, now, mood) {
      const overscan = h * 0.58;
      const visibleNodes = nodes.filter(function (node) {
        return node.y > -overscan && node.y < h + overscan;
      });
      if (!visibleNodes.length) return;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = rgba(mood.a, 0.42);
      ctx.shadowBlur = 18;

      if (visibleNodes.length > 1) {
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = isSmall ? 1.4 : 2;
        ctx.strokeStyle = rgba(mood.c, 0.58);
        drawSpline(ctx, visibleNodes);
      }

      const liveNodes = visibleNodes.filter(function (node) { return node.index <= activeIndex + 1; });
      if (liveNodes.length > 1) {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, rgba(mood.a, 0.94));
        grad.addColorStop(0.56, rgba(mood.b, 0.84));
        grad.addColorStop(1, rgba(mood.c, 0.92));
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = isSmall ? 2.2 : 3.8;
        ctx.strokeStyle = grad;
        drawSpline(ctx, liveNodes);

        ctx.save();
        ctx.globalAlpha = isSmall ? 0.32 : 0.48;
        ctx.lineWidth = isSmall ? 1 : 1.5;
        ctx.strokeStyle = rgba(mood.c, 0.96);
        ctx.setLineDash([8, 18]);
        ctx.lineDashOffset = -now * 0.026;
        drawSpline(ctx, liveNodes);
        ctx.restore();

        drawPathTravelers(ctx, liveNodes, now, mood);
      }

      visibleNodes.forEach(function (node) {
        const pulse = node.active ? 0.5 + 0.5 * Math.sin(now * 0.0052) : 0;
        const alpha = node.active ? 1 : (node.visited ? 0.72 : 0.26);
        const radius = (node.active ? 6.6 + pulse * 4.1 : node.visited ? 4 : 2.4) * (isSmall ? 0.72 : 1);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = node.active ? rgba(mood.c, 0.96) : rgba(mood.a, 0.86);
        ctx.shadowColor = node.active ? rgba(mood.c, 0.9) : rgba(mood.a, 0.46);
        ctx.shadowBlur = node.active ? 22 : 12;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        if (node.active) {
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

    function drawPathTravelers(ctx, points, now, mood) {
      if (points.length < 2) return;
      const travelers = isSmall ? 1 : 3;
      for (let i = 0; i < travelers; i++) {
        const t = (now * 0.00012 + i / travelers + scrollProgress * 0.3) % 1;
        const point = pointAlongPath(points, t);
        if (!point || point.y < -40 || point.y > h + 40) continue;
        const tail = pointAlongPath(points, Math.max(0, t - 0.035));
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

    function pointAlongPath(points, t) {
      if (!points.length) return null;
      if (points.length === 1) return { x: points[0].x, y: points[0].y };

      let total = 0;
      const lengths = [];
      for (let i = 1; i < points.length; i++) {
        const len = distance(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
        lengths.push(len);
        total += len;
      }
      if (!total) return { x: points[0].x, y: points[0].y };

      let walked = 0;
      const target = total * clamp(t, 0, 1);
      for (let i = 1; i < points.length; i++) {
        const len = lengths[i - 1];
        if (walked + len >= target) {
          const local = (target - walked) / len;
          return {
            x: points[i - 1].x + (points[i].x - points[i - 1].x) * local,
            y: points[i - 1].y + (points[i].y - points[i - 1].y) * local
          };
        }
        walked += len;
      }
      const last = points[points.length - 1];
      return { x: last.x, y: last.y };
    }

    function drawMemoryConstellations(ctx, nodes, now, mood) {
      const overscan = h * 0.32;
      nodes.forEach(function (node) {
        if (node.y < -overscan || node.y > h + overscan) return;
        const activeBoost = node.active ? 1 : 0;
        const baseAlpha = node.active ? 0.92 : (node.visited ? 0.38 : 0.16);
        const orbit = 1 + Math.sin(now * 0.0015 + node.index) * 0.07;
        const plotted = [];

        ctx.save();
        ctx.lineCap = "round";
        node.satellites.forEach(function (sat, i) {
          const sway = Math.sin(now * 0.0011 + sat.phase + scrollProgress * 4.2) * 0.16;
          const distance = sat.distance * orbit * (1 + activeBoost * 0.2);
          const sx = node.x + Math.cos(sat.angle + sway) * distance;
          const sy = node.y + Math.sin(sat.angle + sway) * distance * 0.72;
          const twinkle = 0.58 + 0.42 * Math.sin(now * sat.speed + sat.phase);
          plotted.push({ x: sx, y: sy, size: sat.size, twinkle: twinkle });

          ctx.globalAlpha = baseAlpha * (0.42 + twinkle * 0.58);
          ctx.strokeStyle = i % 2 ? rgba(mood.a, 0.72) : rgba(mood.b, 0.66);
          ctx.lineWidth = node.active ? 1.15 : 0.68;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        });

        if (node.active || node.visited) {
          plotted.forEach(function (point, i) {
            if (i % 2 !== 0) return;
            const next = plotted[(i + 2) % plotted.length];
            if (!next) return;
            ctx.globalAlpha = baseAlpha * (node.active ? 0.36 : 0.16);
            ctx.strokeStyle = i % 4 ? rgba(mood.c, 0.7) : rgba(mood.b, 0.64);
            ctx.lineWidth = node.active ? 0.9 : 0.55;
            ctx.setLineDash(node.active ? [4, 10] : []);
            ctx.lineDashOffset = -now * 0.018;
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
          ctx.shadowBlur = node.active ? 20 : 8;
          ctx.beginPath();
          ctx.arc(point.x, point.y, point.size * (node.active ? 1.35 : 1.05), 0, Math.PI * 2);
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

    function drawFinalHeart(ctx, now, mood) {
      const reveal = clamp((scrollProgress - 0.82) / 0.16, 0, 1);
      if (reveal <= 0) return;

      const cx = w * (isSmall ? 0.5 : 0.72);
      const cy = h * (isSmall ? 0.44 : 0.5);
      const scale = Math.min(w, h) * (isSmall ? 0.0058 : 0.0085);
      const count = 24;
      const points = [];

      for (let i = 0; i < count; i++) {
        const t = (Math.PI * 2 * i) / count;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        points.push({
          x: cx + x * scale * 10,
          y: cy + y * scale * 10,
          phase: i * 0.41
        });
      }

      ctx.save();
      ctx.globalAlpha = reveal * 0.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = rgba(mood.b, 0.78);
      ctx.fillStyle = rgba(mood.c, 0.94);
      ctx.shadowColor = rgba(mood.b, 0.82);
      ctx.shadowBlur = 16;
      ctx.lineWidth = isSmall ? 1 : 1.35;
      ctx.beginPath();
      points.forEach(function (point, i) {
        const beat = Math.sin(now * 0.002 + point.phase) * reveal * 1.8;
        const x = point.x + beat;
        const y = point.y - beat * 0.55;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();

      points.forEach(function (point) {
        const twinkle = 0.72 + 0.28 * Math.sin(now * 0.003 + point.phase);
        ctx.globalAlpha = reveal * twinkle;
        ctx.beginPath();
        ctx.arc(point.x, point.y, isSmall ? 1.5 : 2.1, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
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
      if (el.classList.contains("wall-sec") || el.classList.contains("numbers")) return 0.84;
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
      const styles = getComputedStyle(root);
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
  }

  /* ---------- 3C. INTERACTIVE PHOTO PRINTS ---------- */
  function setupPhotoViewer(hasGSAP) {
    const viewer = document.getElementById("photo-viewer");
    const viewerImg = document.getElementById("photo-viewer-img");
    const caption = document.getElementById("photo-viewer-caption");
    const closeBtn = document.getElementById("photo-close");
    const backdrop = viewer ? viewer.querySelector(".photo-viewer-backdrop") : null;
    const shell = viewer ? viewer.querySelector(".photo-viewer-shell") : null;
    if (!viewer || !viewerImg || !caption || !closeBtn || !backdrop || !shell) return;

    let lastFocus = null;
    const photos = document.querySelectorAll(".frame img, .wall img");
    photos.forEach(function (img) {
      const label = getPhotoCaption(img);
      img.setAttribute("role", "button");
      img.setAttribute("tabindex", "0");
      img.setAttribute("aria-label", label ? "open photo: " + label : "open photo");
      img.addEventListener("click", function () { openPhoto(img); });
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPhoto(img);
        }
      });
    });

    closeBtn.addEventListener("click", closePhoto);
    backdrop.addEventListener("click", closePhoto);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && viewer.classList.contains("is-open")) closePhoto();
    });

    function openPhoto(img) {
      lastFocus = document.activeElement;
      const src = img.currentSrc || img.src || img.getAttribute("src");
      const text = getPhotoCaption(img);
      viewerImg.src = src;
      viewerImg.alt = img.alt || text || "photo memory";
      caption.textContent = text;
      viewer.classList.add("is-open");
      viewer.setAttribute("aria-hidden", "false");
      document.body.classList.add("viewer-open");
      closeBtn.focus({ preventScroll: true });

      if (hasGSAP) {
        gsap.fromTo(shell, { y: 28, scale: 0.94, rotationZ: -1, autoAlpha: 0 },
          { y: 0, scale: 1, rotationZ: 0, autoAlpha: 1, duration: 0.52, ease: "power3.out" });
        gsap.fromTo(viewerImg, { rotationY: -16, rotationX: 4, rotationZ: -2.5 },
          { rotationY: 0, rotationX: 0, rotationZ: -1.2, duration: 0.75, ease: "power3.out" });
      }
    }

    function closePhoto() {
      viewer.classList.remove("is-open");
      viewer.setAttribute("aria-hidden", "true");
      document.body.classList.remove("viewer-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
  }

  function getPhotoCaption(img) {
    const moment = img.closest("[data-moment]");
    if (moment) {
      const date = moment.querySelector(".moment-date");
      const title = moment.querySelector(".moment-title");
      return [date ? date.textContent.trim() : "", title ? title.textContent.trim() : ""].filter(Boolean).join(" · ");
    }
    const src = img.getAttribute("src");
    const match = Array.prototype.slice.call(document.querySelectorAll("[data-moment] img"))
      .find(function (candidate) { return candidate.getAttribute("src") === src; });
    if (match) return getPhotoCaption(match);
    return img.alt || "one of our pages";
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
        [90, 680].forEach(function (delay) {
          setTimeout(function () {
            centerPaper();
            refreshScroll();
          }, delay);
        });
        window.dispatchEvent(new CustomEvent("loveburst", {
          detail: { x: innerWidth / 2, y: innerHeight * 0.55, count: 26, spread: 150 }
        }));
      }
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
