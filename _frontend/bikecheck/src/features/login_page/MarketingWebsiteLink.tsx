// The login logo: in the browser it leads back to the Marketing Website (ADR 0041); the Android app has none to go back to.
import type { ReactElement, ReactNode } from "react";
import { Capacitor } from "@capacitor/core";

const MARKETING_WEBSITE_URL = "https://bikecheck.cloud";

interface MarketingWebsiteLinkProps {
  className?: string;
  children: ReactNode;
}

export function MarketingWebsiteLink({ className, children }: MarketingWebsiteLinkProps): ReactElement {
  if (Capacitor.isNativePlatform()) return <div className={className}>{children}</div>;
  return (
    <a href={MARKETING_WEBSITE_URL} className={className}>
      {children}
    </a>
  );
}
