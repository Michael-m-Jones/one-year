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
    setupPhotoViewer(hasGSAP);
    setupLetter(hasGSAP, lenis);
    setupPhotoTilt();
    setupAmbientStory(hasGSAP);
    setupJourneyCanvas(hasGSAP);

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
        gsap.set(".book-stage, .book-orbit, .book-spread, .book-cover, .book-page-turn, .book-light, .memory-card", { force3D: true });
        gsap.set(".book-stage", { scale: 1, z: 0, autoAlpha: 1, transformOrigin: "50% 52%" });
        gsap.set(".book-orbit", { rotateX: 62, rotateZ: -3.5, y: 46, scale: 0.86, transformOrigin: "50% 56%" });
        gsap.set(".book-spread", { autoAlpha: 0.66, scale: 0.82, y: 30, rotateX: 0 });
        gsap.set(".book-cover", { rotateY: -4, x: 0, autoAlpha: 1, transformOrigin: "0% 50%" });
        gsap.set(".book-page-turn", { rotateY: 0, x: 0, autoAlpha: 0, transformOrigin: "0% 50%" });
        gsap.set(".book-light", { autoAlpha: 0, scale: 0.88 });
        gsap.set(".portal-haze", { scale: 0.96, opacity: 0.62 });
        gsap.set(".memory-card", { autoAlpha: 0, y: 34, scale: 0.82, rotateZ: function (i) { return [-16, 14, 10, -18][i] || 0; } });
        gsap.set(".hero-content", { autoAlpha: 0, y: 70, scale: 0.96 });

        const openBook = gsap.timeline({
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "+=220%",
            scrub: 0.9,
            pin: true,
            anticipatePin: 1,
            onUpdate: function (self) {
              document.documentElement.style.setProperty("--book-progress", self.progress.toFixed(4));
            }
          }
        });

        openBook
          .to(".memory-card", { autoAlpha: 0.86, y: 0, scale: 1, stagger: 0.04, ease: "power2.out", duration: 0.18 }, 0)
          .to(".book-orbit", { rotateX: 54, rotateZ: -5.5, y: 10, scale: 1.03, ease: "sine.out", duration: 0.24 }, 0)
          .to(".book-cover", { rotateY: -98, x: -5, ease: "power2.inOut", duration: 0.34 }, 0.08)
          .to(".book-cover", { autoAlpha: 0.18, ease: "none", duration: 0.12 }, 0.36)
          .to(".book-page-turn", { autoAlpha: 0.96, rotateY: -16, ease: "power2.out", duration: 0.13 }, 0.18)
          .to(".book-page-turn", { rotateY: -142, x: -9, autoAlpha: 0.08, ease: "power2.inOut", duration: 0.38 }, 0.29)
          .to(".book-spread", { autoAlpha: 1, scale: 1.08, y: -12, ease: "power2.out", duration: 0.38 }, 0.12)
          .to(".book-light", { autoAlpha: 1, scale: 1.22, ease: "sine.out", duration: 0.36 }, 0.2)
          .to(".card-a", { x: -118, y: -66, rotateZ: -27, scale: 1.12, ease: "sine.inOut", duration: 0.42 }, 0.23)
          .to(".card-b", { x: 118, y: -70, rotateZ: 24, scale: 1.11, ease: "sine.inOut", duration: 0.42 }, 0.23)
          .to(".card-c", { x: -132, y: 86, rotateZ: 19, scale: 1.08, ease: "sine.inOut", duration: 0.42 }, 0.23)
          .to(".card-d", { x: 128, y: 82, rotateZ: -24, scale: 1.09, ease: "sine.inOut", duration: 0.42 }, 0.23)
          .to(".portal-haze", { scale: 1.48, opacity: 0.98, ease: "sine.inOut", duration: 0.46 }, 0.26)
          .to(".book-orbit", { rotateX: 42, rotateZ: -1.5, y: -8, scale: 1.16, ease: "power1.inOut", duration: 0.28 }, 0.46)
          .to(".memory-card", { autoAlpha: 0, scale: 1.2, ease: "power2.in", duration: 0.24 }, 0.62)
          .to(".book-stage", { scale: 1.72, z: 420, yPercent: -3, autoAlpha: 0, ease: "power2.inOut", duration: 0.36 }, 0.56)
          .to(".hero-photo", { scale: 1.23, yPercent: 5, filter: "saturate(1.25) brightness(.98)", ease: "sine.inOut", duration: 0.44 }, 0.52)
          .to(".hero-content", { autoAlpha: 1, y: 0, scale: 1, ease: "power2.out", duration: 0.24 }, 0.78)
          .to(".hero-content", { yPercent: -26, opacity: 0, ease: "none", duration: 0.16 }, 0.95);
      }

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
          activateNearestScene();
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
      const bgEl = scene.querySelector(".hero-photo, .book-photo");
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
    const stars = createStars(isSmall ? 72 : 160);
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

    requestAnimationFrame(loop);

    function loop(now) {
      updateState();
      draw(now);
      requestAnimationFrame(loop);
    }

    function size() {
      dpr = Math.min(2, devicePixelRatio || 1);
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
      frame.addEventListener("pointermove", function (e) {
        const r = frame.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) - 0.5;
        const py = ((e.clientY - r.top) / r.height) - 0.5;
        frame.style.setProperty("--rx", (-py * 7).toFixed(2) + "deg");
        frame.style.setProperty("--ry", (px * 7).toFixed(2) + "deg");
        frame.style.setProperty("--lift", "-6px");
        frame.classList.add("is-tilting");
      }, { passive: true });
      frame.addEventListener("pointerleave", function () {
        frame.style.setProperty("--rx", "0deg");
        frame.style.setProperty("--ry", "0deg");
        frame.style.setProperty("--lift", "0px");
        frame.classList.remove("is-tilting");
      });
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
      burstAt(e.clientX, e.clientY, 14, 0);
    });

    addEventListener("loveburst", function (e) {
      const detail = e.detail || {};
      burstAt(detail.x || innerWidth / 2, detail.y || innerHeight / 2, detail.count || 24, detail.spread || 0);
    });

    function burstAt(x, y, count, spread) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
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
    }

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
