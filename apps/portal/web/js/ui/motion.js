// Apresentacao: parallax contido e revelacao ao rolar. Desligados quando o
// sistema pede movimento reduzido.

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MAX_SHIFT = 36;

export function enableMotion(root) {
  const cleanups = [];

  const reveals = root.querySelectorAll(".reveal");
  if (reduced() || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    reveals.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) el.classList.add("is-visible");
      else io.observe(el);
    });
    cleanups.push(() => io.disconnect());
  }

  const layers = [...root.querySelectorAll("[data-parallax]")];
  if (layers.length && !reduced()) {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      for (const el of layers) {
        const f = Number(el.dataset.parallax) || 0.1;
        const shift = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, y * f));
        el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
