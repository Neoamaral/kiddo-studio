import type { TierId } from "@/data/types";

/**
 * Presentation for the pricing tickets, keyed by tier id.
 *
 * Kept out of src/data/pricing.ts so the data file holds prices, not colours.
 * The literals stay raw here (`"#fff"`, not kiddoColors.white) because these
 * strings land verbatim in the DOM — swapping "#fff" for "#FFFFFF" would be a
 * real markup change. Substituting kiddoColors is a separate follow-up.
 */
export interface TicketTheme {
  bg: string;
  text: string;
  accent: string;
  /** Dark ticket — replaces the fragile `t.text === "#fff"` check. */
  dark: boolean;
  /** Lime accent — replaces `t.accent === "#C8E820"`; drives the CTA colours. */
  limeAccent: boolean;
}

export const TICKET_THEMES: Record<TierId, TicketTheme> = {
  h: { bg: "#fff", text: "#1A1A1A", accent: "#C8E820", dark: false, limeAccent: true },
  hd: { bg: "#F2EFE6", text: "#1A1A1A", accent: "#1A1A1A", dark: false, limeAccent: false },
  fd: { bg: "#C8E820", text: "#1A1A1A", accent: "#1A1A1A", dark: false, limeAccent: false },
  md: { bg: "#111111", text: "#fff", accent: "#C8E820", dark: true, limeAccent: true },
};
