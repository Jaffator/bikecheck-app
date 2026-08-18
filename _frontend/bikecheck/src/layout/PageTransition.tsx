import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";

// Sub-pages slide in from the right and leave to the right; the page underneath
// stays put. Tab switches keep the plain fade they always had.
type Direction = "forward" | "backward" | "fade";

interface PageTransitionProps {
  // Changes whenever the route does — the transition keys off this.
  pathname: string;
  // True while the current route is a sub-page (settings, profile, ...).
  isSubPage: boolean;
  // For a fixed-height slot such as the header bar, where the incoming content
  // cannot give the container its height the way a page does.
  fillHeight?: boolean;
  // CSS colour each sliding layer paints while in flight, so the two layers
  // never show through each other. Must match the surface behind this slot.
  surface?: string;
  children: ReactNode;
}

interface Frame {
  pathname: string;
  node: ReactNode;
}

// Unhurried on purpose — the push is meant to be watched, not just registered.
// Trimmed alongside the easing below: that curve finishes its brake earlier,
// so the old budget would have left the panel sitting still at the end.
const DURATION_MS = 480;

// Same quick departure as before, but the second control point sits further
// along, so the brake finishes instead of crawling to the end. Pulling that
// point back toward 0.3 lengthens the tail again; pushing it past 0.7 turns
// the whole thing into a linear glide.
const EASING = "cubic-bezier(0.16, 0.9, 0.55, 1)";

function getDirection(wasSubPage: boolean, isSubPage: boolean): Direction {
  // Entering a sub-page pushes it over the page that stays behind.
  if (!wasSubPage && isSubPage) return "forward";
  // Leaving one pulls it back off to the right.
  if (wasSubPage && !isSubPage) return "backward";
  // Sub-page to sub-page, or tab to tab — no push to express.
  return "fade";
}

export function PageTransition({
  pathname,
  isSubPage,
  fillHeight = false,
  surface = "var(--mantine-color-background-9)",
  children,
}: PageTransitionProps): ReactElement {
  const [current, setCurrent] = useState<Frame>({ pathname, node: children });
  // The page being animated away. Null whenever nothing is in flight.
  const [leaving, setLeaving] = useState<Frame | null>(null);
  const [direction, setDirection] = useState<Direction>("fade");
  const wasSubPage = useRef(isSubPage);
  // Mirrors the rendered frame so the effect can read it without depending on
  // the state it also writes, which would re-run it on its own update.
  const currentRef = useRef<Frame>({ pathname, node: children });

  useEffect(() => {
    const next: Frame = { pathname, node: children };
    if (pathname === currentRef.current.pathname) {
      // Same route, re-rendered children (a query resolved, a step changed) —
      // swap the content without restarting an animation. Bail out when the
      // element is identical, or this would re-render on every parent render.
      if (currentRef.current.node === children) return;
      currentRef.current = next;
      setCurrent(next);
      return;
    }
    setDirection(getDirection(wasSubPage.current, isSubPage));
    // The frame on screen becomes the outgoing one.
    setLeaving(currentRef.current);
    currentRef.current = next;
    setCurrent(next);
    wasSubPage.current = isSubPage;
  }, [pathname, children, isSubPage]);

  useEffect(() => {
    if (leaving === null) return;
    const timer = window.setTimeout(() => setLeaving(null), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  const animating = leaving !== null;

  return (
    <div
      style={{
        position: "relative",
        height: fillHeight ? "100%" : undefined,
        // A page sliding out past the edge must not widen the document. Only
        // clipped while something is in flight — a permanent overflow here
        // would cut off anything a page hangs outside its own box. The header
        // is a fixed-height slot, so it clips at all times.
        overflowX: animating || fillHeight ? "hidden" : undefined,
      }}
    >
      {leaving !== null && (
        <div
          key={leaving.pathname}
          aria-hidden
          style={{
            // Taken out of flow so the incoming page keeps the scroll position
            // and the container height it would have had on its own.
            position: "absolute",
            inset: 0,
            // The outgoing sub-page slides over the one that stays; on a plain
            // fade neither page should sit above the other.
            zIndex: direction === "backward" ? 2 : 1,
            animation: `${exitAnimation(direction)} ${DURATION_MS}ms ${EASING} forwards`,
            pointerEvents: "none",
            // Pages carry no background of their own — it lives on the AppShell.
            // Two bare layers on top of each other would show through, so each
            // one paints its own surface for as long as it is in flight.
            background: surface,
          }}
        >
          {leaving.node}
        </div>
      )}
      <div
        key={current.pathname}
        style={{
          // A transform on this wrapper would make it the containing block for
          // any position: fixed child (the add-bike footer), so it only carries
          // one while the animation actually runs.
          animation: animating ? `${enterAnimation(direction)} ${DURATION_MS}ms ${EASING}` : undefined,
          zIndex: direction === "forward" ? 2 : 1,
          position: "relative",
          height: fillHeight ? "100%" : undefined,
          // Opaque only while sliding — the arriving page must not let the
          // outgoing one show through it. Left transparent at rest so the
          // AppShell background and the footer gradient stay visible.
          background: animating ? surface : undefined,
          // Without a minimum the arriving page is only as tall as its content,
          // so a short page would slide in as a band with the old page beside it.
          minHeight: animating && !fillHeight ? "100%" : undefined,
        }}
      >
        {current.node}
      </div>
    </div>
  );
}

function enterAnimation(direction: Direction): string {
  if (direction === "forward") return "pageSlideInRight";
  if (direction === "backward") return "pageSlideInLeft";
  return "fadeIn";
}

function exitAnimation(direction: Direction): string {
  if (direction === "forward") return "pageSlideOutLeft";
  if (direction === "backward") return "pageSlideOutRight";
  return "fadeOut";
}
