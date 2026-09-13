// The compression knob a section draws: the brand the mounted part names, or the generic one.
import type { ReactElement } from "react";
import type { CompressionDialProps } from "../dial.types";
import type { DialBrand } from "../dialBrand";
import { FoxCompressionDial } from "./FoxCompressionDial";
import { GenericCompressionDial } from "./GenericCompressionDial";
import { RockShoxCompressionDial } from "./RockShoxCompressionDial";

interface BrandedCompressionDialProps extends CompressionDialProps {
  brand: DialBrand;
}

export function CompressionDial({ brand, ...props }: BrandedCompressionDialProps): ReactElement {
  if (brand === "fox") return <FoxCompressionDial {...props} />;
  if (brand === "rockshox") return <RockShoxCompressionDial {...props} />;
  return <GenericCompressionDial {...props} />;
}
