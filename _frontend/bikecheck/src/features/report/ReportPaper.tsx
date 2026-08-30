// The furniture every Report is printed on: the sheet, its sections, and the two voices a
// document speaks in — Inter for what a thing is called, mono for the metadata around it.
import type { ReactElement, ReactNode } from "react";
import logoDark from "@/assets/icons/bikecheck/Logo_dark.svg";
import { REPORT_PAPER, reportDate } from "./reportFormat";

// The sheet as it is read on a screen: as wide as the thread it arrived in.
export function ScreenSheet({ children }: { children: ReactNode }): ReactElement {
  return (
    <article
      data-purpose="document-preview"
      style={{ backgroundColor: REPORT_PAPER.sheet, color: REPORT_PAPER.ink }}
      className="w-full max-w-3xl mx-auto flex flex-col gap-7 px-5 py-7 sm:px-10 sm:py-10"
    >
      {children}
    </article>
  );
}

// The same document on paper, asked for by `?print=1` rather than left to a print
// stylesheet, so the render chromium captures is explicit. Sized to A4 inside the printer's
// own margins, which is what keeps a document running past one page off the paper's edge.
export function PrintSheet({ children }: { children: ReactNode }): ReactElement {
  return (
    <article
      data-purpose="document-print"
      style={{ backgroundColor: REPORT_PAPER.sheet, color: REPORT_PAPER.ink }}
      className="w-full max-w-[182mm] min-h-[265mm] mx-auto flex flex-col gap-8 text-left"
    >
      {children}
    </article>
  );
}

// What the reader sees first: the mark, and which of the three documents this is.
export function DocumentHeader({ title, print = false }: { title: string; print?: boolean }): ReactElement {
  return (
    <header className={`flex flex-col items-center ${print ? "gap-4" : "gap-1"}`}>
      <img src={logoDark} alt="BikeCheck" className={print ? "h-10 w-auto" : "h-9 w-auto"} />
      <span
        className={`font-mono uppercase font-semibold ${print ? "text-xs tracking-[0.22em]" : "text-[11px] tracking-[0.18em]"}`}
        style={{ color: REPORT_PAPER.inkMuted }}
      >
        {title}
      </span>
    </header>
  );
}

// Where the document says when it was written, and by what.
export function DocumentFooter({
  issued,
  generatedAt,
  language,
  print = false,
}: {
  issued: string;
  generatedAt: string;
  language: string;
  print?: boolean;
}): ReactElement {
  return (
    <footer
      className={`mt-auto pt-5 text-center font-mono uppercase tracking-[0.14em] ${print ? "text-[9px]" : "text-[10px]"}`}
      style={{ borderTop: `1px solid ${REPORT_PAPER.rule}`, color: REPORT_PAPER.inkMuted }}
    >
      {issued} {reportDate(generatedAt, language)} · bikecheck.cloud
    </footer>
  );
}

// One fact in a header block: what it is, then what it says.
export function Field({
  label,
  value,
  mono = false,
  accent = false,
  muted = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  muted?: boolean;
}): ReactElement {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <RowLabel>{label}</RowLabel>
      <span
        className={`${mono ? "font-mono" : ""} text-sm leading-snug break-words`}
        style={{ color: accent ? REPORT_PAPER.accent : muted ? REPORT_PAPER.inkMuted : REPORT_PAPER.ink }}
      >
        {value}
      </span>
    </div>
  );
}

export function Section({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="flex flex-col gap-3">
      <div
        className="flex items-center gap-2 pb-2"
        style={{ borderBottom: `1px solid ${REPORT_PAPER.ruleStrong}`, color: REPORT_PAPER.ink }}
      >
        {icon}
        <h3 className="font-mono uppercase text-xs font-semibold tracking-[0.14em]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

// The metadata voice: mono, small, quiet. Names a thing without speaking for the section.
export function RowLabel({ children }: { children: ReactNode }): ReactElement {
  return (
    <span
      className="font-mono uppercase text-[10px] font-semibold tracking-[0.12em]"
      style={{ color: REPORT_PAPER.inkMuted }}
    >
      {children}
    </span>
  );
}
