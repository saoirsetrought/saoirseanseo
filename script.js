// Videos shown in "My Work". Add, remove or reorder files here.
// Each entry is a file in assets/videos/; the title is used for screen readers.
const VIDEOS = [
  { src: "video-05.mp4", title: "6-9 before 9-6ish" },
  { src: "video-03.mp4", title: "Big tech news" },
  { src: "video-07.mp4", title: "I quit my job" },
  { src: "video-08.mp4", title: "" },
  { src: "video-04.mp4", title: "" },
  { src: "video-09.mp4", title: "6-9 before 9-6, London edition" },
  { src: "video-17.mp4", title: "Coolest bag(s) in the world" },
  { src: "video-18.mp4", title: "How to brain stack" },
  { src: "video-13.mp4", title: "" },
  { src: "video-11.mp4", title: "" },
  { src: "video-10.mp4", title: "" },
  { src: "video-15.mp4", title: "After AI Week" },
  { src: "video-02.mp4", title: "iPhone 17 Pro" },
  { src: "video-01.mp4", title: "Tech things I'd put on my Christmas list" },
  { src: "video-16.mp4", title: "How I got tech interviews" },
  { src: "video-06.mp4", title: "Free AI resources" },
  { src: "video-14.mp4", title: "" },
  { src: "video-12.mp4", title: "" },
];

document.getElementById("year").textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ============ Videos (homepage only) ============

const reel = document.getElementById("reel");
const lightbox = document.getElementById("lightbox");
const lightboxVideo = document.getElementById("lightbox-video");

// Each clip shows the frame at THUMB_TIME (seconds) until hovered
const THUMB_TIME = 2.3;

if (reel) {
  for (const v of VIDEOS) {
    const btn = document.createElement("button");
    btn.className = "clip";
    btn.type = "button";
    btn.setAttribute("aria-label", v.title ? `Play: ${v.title}` : "Play video with sound");
    btn.innerHTML = `
      <video muted loop playsinline preload="metadata" src="/assets/videos/${v.src}#t=${THUMB_TIME}"></video>
      <span class="clip__sound" aria-hidden="true"><svg><use href="#i-sound"/></svg></span>`;
    const vid = btn.querySelector("video");

    const preview = () => vid.play().catch(() => {});
    const reset = () => {
      vid.pause();
      vid.currentTime = THUMB_TIME;
    };

    // Hover (or keyboard focus) plays a muted preview; leaving returns to the thumbnail
    btn.addEventListener("mouseenter", preview);
    btn.addEventListener("mouseleave", reset);
    btn.addEventListener("focus", preview);
    btn.addEventListener("blur", reset);
    btn.addEventListener("click", () => {
      reset();
      openLightbox(v.src);
    });
    reel.appendChild(btn);
  }

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.closest(".lightbox__close")) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
  });
}

// Lightbox: watch a clip with sound
function openLightbox(src) {
  lightboxVideo.src = `/assets/videos/${src}`;
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  lightboxVideo.muted = false;
  lightboxVideo.play().catch(() => {});
  lightbox.querySelector(".lightbox__close").focus();
}

function closeLightbox() {
  lightboxVideo.pause();
  lightboxVideo.removeAttribute("src");
  lightboxVideo.load();
  lightbox.hidden = true;
  document.body.style.overflow = "";
}

// ============ Portfolio / Journal switch (homepage only) ============

const switchEl = document.querySelector(".switch");

if (switchEl) {
  const VIEWS = ["portfolio", "journal"];
  const PORTFOLIO_SECTIONS = ["who", "serious", "fun", "work"];
  const tab = (name) => document.getElementById(`tab-${name}`);
  const panel = (name) => document.getElementById(`view-${name}`);
  const scrollBehavior = reduceMotion ? "auto" : "smooth";

  function setView(name) {
    for (const v of VIEWS) {
      const on = v === name;
      panel(v).hidden = !on;
      tab(v).setAttribute("aria-selected", on);
      tab(v).tabIndex = on ? 0 : -1;
    }
    switchEl.dataset.active = name;
    document.body.dataset.view = name;
    document.querySelectorAll("[data-nav]").forEach((n) => (n.hidden = n.dataset.nav !== name));
    // Pause any playing previews when the videos are hidden
    if (name !== "portfolio") reel.querySelectorAll("video").forEach((v) => v.pause());
  }

  // Show the right view for the URL hash (#journal, #who, ...) and scroll to it
  function route(smooth) {
    const id = location.hash.slice(1);
    const behavior = smooth ? scrollBehavior : "auto";
    if (id === "journal") {
      setView("journal");
      document.querySelector(".viewswitch").scrollIntoView({ behavior, block: "start" });
    } else if (PORTFOLIO_SECTIONS.includes(id)) {
      setView("portfolio");
      document.getElementById(id).scrollIntoView({ behavior, block: "start" });
    } else {
      setView("portfolio");
    }
  }

  // Clicking the switch
  for (const v of VIEWS) {
    tab(v).addEventListener("click", () => {
      setView(v);
      history.replaceState(null, "", v === "journal" ? "#journal" : location.pathname);
    });
  }
  // Arrow keys move between the two options
  switchEl.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const next = switchEl.dataset.active === "portfolio" ? "journal" : "portfolio";
    tab(next).click();
    tab(next).focus();
  });

  // In-page links like "/#who" or "/#journal" switch views even if the hash hasn't changed
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="/#"]');
    if (!a) return;
    e.preventDefault();
    history.pushState(null, "", a.getAttribute("href").slice(1));
    route(true);
  });
  window.addEventListener("popstate", () => route(false));

  route(false);
}

// ============ Journal topic filter ============

const filterButtons = document.querySelectorAll(".topic-filter [data-topic]");
filterButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    const topic = btn.dataset.topic;
    filterButtons.forEach((b) => {
      const on = b === btn;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on);
    });
    document.querySelectorAll(".post-card").forEach((card) => {
      card.hidden = topic !== "all" && !card.dataset.topics.split(" ").includes(topic);
    });
  })
);
