import dayjs from "dayjs";

const FORMAT = "D. M. YYYY";

export function proDate(date: string): string {
  return dayjs(date).format(FORMAT);
}

// Pro renews monthly; a day the next month does not have is its last one.
export function nextPaymentDate(paidAt?: string): string {
  return dayjs(paidAt).add(1, "month").format(FORMAT);
}
