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

const reel = document.getElementById("reel");
const lightbox = document.getElementById("lightbox");
const lightboxVideo = document.getElementById("lightbox-video");

document.getElementById("year").textContent = new Date().getFullYear();

// Each clip shows the frame at THUMB_TIME (seconds) until hovered
const THUMB_TIME = 2.3;

// Build the grid of clips
for (const v of VIDEOS) {
  const btn = document.createElement("button");
  btn.className = "clip";
  btn.type = "button";
  btn.setAttribute("aria-label", v.title ? `Play: ${v.title}` : "Play video with sound");
  btn.innerHTML = `
    <video muted loop playsinline preload="metadata" src="assets/videos/${v.src}#t=${THUMB_TIME}"></video>
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

// Lightbox: watch a clip with sound
function openLightbox(src) {
  lightboxVideo.src = `assets/videos/${src}`;
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

lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox || e.target.closest(".lightbox__close")) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
});
