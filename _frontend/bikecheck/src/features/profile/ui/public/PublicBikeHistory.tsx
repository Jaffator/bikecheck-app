// The service history in the design's rows: what the whole record adds up to, then every
// Service by month - date, the actions done, a Replacement badge, the price where it goes
// out, the parts touched as chips - and the older ones a tap away through the public route.
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import {
  formatMonthHeading,
  formatServiceDateShort,
  groupByServiceDate,
  type ServiceMonthGroup,
} from "@/features/service/serviceDates";
import { useSeededName } from "@/i18n/useSeededName";
import { formatCost } from "@/utils/money";
import { usePublicProfileBikeServices } from "../../profile.queries";
import { monthSum } from "../../profileFormat";
import type { ProfileHistory, ProfileService } from "../../profile.types";

function Tile({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="pp-hairline rounded-xl border bg-[var(--pp-card)] px-3 py-3 sm:px-4">
      <dt className="pp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pp-paper-dim)]">{label}</dt>
      <dd className="pp-mono mt-1 whitespace-nowrap text-[17px] tabular-nums leading-none sm:text-[20px]">{value}</dd>
    </div>
  );
}

// One Service: when, what was done, what it touched, and the price where it goes out.
function ServiceRow({ service }: { service: ProfileService }): ReactElement {
  const { t, i18n } = useTranslation();
  const seededName = useSeededName();
  const actions = service.actions.map((action) => seededName(action.i18n_key, action.name));

  return (
    <li className="pp-hairline rounded-xl border bg-[var(--pp-card)] p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {service.date !== null && (
          <p className="pp-mono text-[11px] tabular-nums text-[var(--pp-paper-dim)]">
            {formatServiceDateShort(service.date, i18n.language)}
          </p>
        )}
        <p className="text-[15px] font-semibold leading-snug">
          {actions.length === 0
            ? t("service.noActions")
            : actions.map((action, index) => (
                <span key={`${String(index)}-${action}`}>
                  {index > 0 && <span className="text-[var(--pp-paper-faint)]"> · </span>}
                  {action}
                </span>
              ))}
        </p>
        {service.is_replacement && (
          <span className="pp-mono rounded-md border border-[rgba(206,192,83,0.4)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--pp-gold-500)]">
            {t("sharing.replacement")}
          </span>
        )}
        {service.cost !== undefined && (
          <p className="pp-mono ml-auto text-[12px] tabular-nums text-[var(--pp-gold-500)]">
            {formatCost(service.cost.amount, service.cost.currency, i18n.language)}
          </p>
        )}
      </div>
      {service.parts.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {service.parts.map((part) => (
            <li
              key={part.name}
              className="pp-mono rounded-md bg-[var(--pp-card-inset)] px-2 py-1 text-[10px] text-[var(--pp-paper-dim)]"
            >
              {seededName(part.i18n_key, part.name)}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// One month: a gold heading with the month sum only where a price went out; the undated
// group closes the list under a fainter heading.
function MonthGroup({ group }: { group: ServiceMonthGroup<ProfileService> }): ReactElement {
  const { t, i18n } = useTranslation();
  const sum = monthSum(group.services);

  return (
    <div>
      <div className="pp-hairline flex items-baseline justify-between gap-4 border-b pb-2">
        <h3
          className={`pp-mono text-[11px] uppercase tracking-[0.16em] ${
            group.month === null ? "text-[var(--pp-paper-faint)]" : "text-[var(--pp-gold-500)]"
          }`}
        >
          {group.month === null ? t("sharing.noDate") : formatMonthHeading(group.month)}
        </h3>
        {sum !== null && (
          <p className="pp-mono text-[12px] tabular-nums text-[var(--pp-paper-dim)]">
            {formatCost(sum.amount, sum.currency, i18n.language)}
          </p>
        )}
      </div>
      <ul className="mt-3 space-y-1.5">
        {group.services.map((service) => (
          <ServiceRow key={service.id} service={service} />
        ))}
      </ul>
    </div>
  );
}

interface PublicBikeHistoryProps {
  handle: string;
  bikeId: number;
  history: ProfileHistory;
}

export function PublicBikeHistory({ handle, bikeId, history }: PublicBikeHistoryProps): ReactElement {
  const { t, i18n } = useTranslation();
  const older = usePublicProfileBikeServices(handle, bikeId, history.services.length);

  // The bike brought the first page; every page tapped in since continues the same list,
  // so a month that straddles the boundary stays one group.
  const services = [...history.services, ...(older.data?.pages.flatMap((page) => page.services) ?? [])];
  const total = older.data?.pages.at(-1)?.total_count ?? history.total_count;
  const remaining = Math.max(total - services.length, 0);
  const spend = history.totals.spend;

  return (
    <section id="servis" className="pp-hairline scroll-mt-32 border-t bg-[rgba(16,16,18,0.4)]">
      <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <h2 className="pp-display text-[26px] font-extrabold tracking-tight sm:text-[34px]">
          {t("publicProfile.serviceHistory")}
        </h2>
        <dl className={`mt-6 grid gap-2 sm:gap-3 ${spend === undefined ? "grid-cols-2 sm:max-w-sm" : "grid-cols-3 sm:max-w-xl"}`}>
          <Tile label={t("publicProfile.figureServices")} value={String(history.totals.services)} />
          <Tile label={t("sharing.historyReplacements")} value={String(history.totals.replacements)} />
          {spend !== undefined && (
            <Tile label={t("sharing.historySpend")} value={formatCost(spend.amount, spend.currency, i18n.language)} />
          )}
        </dl>
        <div className="mt-8 space-y-8">
          {groupByServiceDate(services, (service) => service.date).map((group) => (
            <MonthGroup key={group.key} group={group} />
          ))}
        </div>
        {older.isError && (
          <p className="mt-6 text-center text-[13px] text-[var(--pp-paper-dim)]">{t("sharing.olderFailed")}</p>
        )}
        {remaining > 0 && (
          <button
            type="button"
            disabled={older.isFetchingNextPage}
            onClick={() => void older.fetchNextPage()}
            className="pp-hairline-strong mt-8 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border px-5 text-[15px] font-medium text-[var(--pp-paper)] transition-colors duration-200 hover:border-[rgba(206,192,83,0.4)] disabled:opacity-60 sm:w-auto"
          >
            {t("sharing.showOlder", { count: remaining })}
          </button>
        )}
      </div>
    </section>
  );
}
