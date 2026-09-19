// PROTOTYPE #132 — throwaway. Floating bar under the public page: jump between the mock
// handles, and on my own address flip visibility and the section switches the share
// drawer (#121) would — so the page can be walked without going back into the app. Dev only.
import type { CSSProperties, ReactElement } from "react";
import { Link, useLocation } from "react-router-dom";
import { type PublicLang } from "./publicProfile.copy";
import { garagePath } from "./publicProfile.model";
import { usePrototypeStore, VISIBILITY_LABEL, type SectionKey, type Visibility } from "./prototype.store";

const BAR: CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: 16,
  transform: "translateX(-50%)",
  zIndex: 200,
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "center",
  gap: 6,
  maxWidth: "calc(100vw - 24px)",
  padding: "8px 10px",
  borderRadius: 999,
  background: "#f4f4f5",
  color: "#111",
  boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
  font: "12px/1.2 system-ui, sans-serif",
};

const BUTTON: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #c8c8cc",
  background: "#fff",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const ACTIVE: CSSProperties = {
  ...BUTTON,
  background: "#111",
  color: "#fff",
  borderColor: "#111",
};

// One of each state: PUBLIC with everything, PUBLIC without history, FOLLOWERS, OFF, unknown.
const HANDLES = ["martin-k", "tomas_h", "kata", "verca", "michal", "nikdo"];

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "components", label: "díly" },
  { key: "setup", label: "setup" },
  { key: "history", label: "servis" },
  { key: "costs", label: "ceny" },
];

const VISIBILITIES: Visibility[] = ["OFF", "FOLLOWERS", "PUBLIC"];

export function PublicPrototypeBar({ handle, lang }: { handle: string; lang: PublicLang }): ReactElement | null {
  const location = useLocation();
  const myHandle = usePrototypeStore((state) => state.handle);
  const visibility = usePrototypeStore((state) => state.visibility);
  const setVisibility = usePrototypeStore((state) => state.setVisibility);
  const sections = usePrototypeStore((state) => state.sections);
  const toggleSection = usePrototypeStore((state) => state.toggleSection);

  if (!import.meta.env.DEV) return null;
  const mine = handle === myHandle;

  return (
    <div role="group" aria-label="Prototyp" style={BAR}>
      <span style={{ fontWeight: 600, opacity: 0.6 }}>#132</span>
      {[myHandle, ...HANDLES].map((item) => {
        const active = location.pathname.startsWith(garagePath(item));
        return (
          <Link key={item} to={garagePath(item)} style={active ? ACTIVE : BUTTON}>
            {item === myHandle ? `já (${item})` : item}
          </Link>
        );
      })}
      {mine && (
        <>
          <span style={{ width: 1, height: 18, background: "#c8c8cc" }} aria-hidden="true" />
          {VISIBILITIES.map((item) => (
            <button
              key={item}
              type="button"
              style={item === visibility ? ACTIVE : BUTTON}
              onClick={() => setVisibility(item)}
            >
              {VISIBILITY_LABEL[item]}
            </button>
          ))}
          <span style={{ width: 1, height: 18, background: "#c8c8cc" }} aria-hidden="true" />
          {SECTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={sections[item.key]}
              disabled={item.key === "costs" && !sections.history}
              style={
                sections[item.key]
                  ? ACTIVE
                  : {
                      ...BUTTON,
                      opacity: item.key === "costs" && !sections.history ? 0.4 : 1,
                    }
              }
              onClick={() => toggleSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </>
      )}
      <span style={{ opacity: 0.6 }}>{lang}</span>
    </div>
  );
}
