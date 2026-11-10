import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const SECTION_DIR = "/origin-story/";

// The section is a self-contained page in public/origin-story, embedded as delivered. It is read as text and
// passed through srcDoc, so the host's content type can't turn it into a file download on phones.
// Same-origin iframe: it is sized to its content, and its shop link goes to this site's collection.
export default function OriginStory() {
  const navigate = useNavigate();
  // Close to the real height, so the page doesn't jump when the frame loads.
  const [height, setHeight] = useState(() => (window.innerWidth < 640 ? 1550 : 1130));
  const cleanup = useRef(null);
  const [html, setHtml] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(`${SECTION_DIR}index.html`)
      .then((r) => r.text())
      .then((text) => {
        // A host's SPA fallback answers with the shop itself, which must not end up inside the frame.
        if (alive && text.includes('id="origin-story"')) setHtml(text.replace("<head>", `<head><base href="${SECTION_DIR}">`));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => () => cleanup.current?.(), []);

  const onLoad = (e) => {
    cleanup.current?.();
    const doc = e.target.contentDocument;
    const section = doc?.getElementById("origin-story");
    if (!section) return;
    // The file itself stays as delivered; only its background variable follows the site.
    doc.documentElement.style.setProperty("--paper", "#DCDCDC");
    const measure = () => setHeight(Math.ceil(section.getBoundingClientRect().height));
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    measure();
    const onClick = (ev) => {
      if (!ev.target.closest(".os-cta")) return;
      ev.preventDefault();
      navigate("/collection");
    };
    // Wheel events inside an iframe never reach Lenis, so the page lost its smooth scrolling over this section.
    const onWheel = (ev) => {
      if (ev.ctrlKey || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;
      ev.preventDefault();
      window.dispatchEvent(new WheelEvent("wheel", { deltaX: ev.deltaX, deltaY: ev.deltaY, deltaMode: ev.deltaMode, bubbles: true, cancelable: true }));
    };
    doc.addEventListener("click", onClick);
    doc.addEventListener("wheel", onWheel, { passive: false });
    cleanup.current = () => {
      observer.disconnect();
      doc.removeEventListener("click", onClick);
      doc.removeEventListener("wheel", onWheel);
    };
  };

  if (!html) return <div style={{ height }} className="bg-wino-band" data-testid="origin-story-loading" />;

  return (
    <iframe
      title="The Making of Origin Story"
      srcDoc={html}
      onLoad={onLoad}
      scrolling="no"
      style={{ height }}
      className="bg-wino-band block w-full border-0"
      data-testid="origin-story"
    />
  );
}
