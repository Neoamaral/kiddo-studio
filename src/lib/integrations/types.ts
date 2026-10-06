/**
 * The shapes the integrations screen speaks in.
 *
 * Three of them, and the split between them is the whole security story:
 *
 *   PublicTagIds        what reaches the BROWSER. Ids only, never a token.
 *   IntegrationsView    what the ADMIN SCREEN sees. Still never the token —
 *                       only a TokenState describing it.
 *   IntegrationsPatch   what the screen SENDS. The token appears here and
 *                       nowhere else, and only when it is being changed.
 *
 * There is deliberately no type in this file that carries a readable token
 * alongside the rest of the settings. A shape that can hold it is a shape that
 * can leak it, and the one function that produces a plaintext token
 * (getCapiToken) returns a bare string to a single caller.
 */

/** Everything the public site needs, and nothing else. */
export interface PublicTagIds {
  metaPixelId: string | null;
  googleTagId: string | null;
}

export const NO_TAGS: PublicTagIds = { metaPixelId: null, googleTagId: null };

/**
 * What the panel is told about the stored token, instead of the token.
 *
 * `unreadable` is split by reason because the three answers are different
 * actions: a rotated key means paste it again, a tampered record means
 * something is wrong, and a missing server key is not the studio's problem at
 * all and re-pasting would fail too.
 */
export type TokenState =
  | { kind: "absent" }
  | { kind: "ok"; keyId: string }
  | { kind: "unreadable"; reason: "key-changed" | "tampered" | "malformed"; keyId: string | null }
  | { kind: "no-key" };

export interface IntegrationsView {
  metaPixelId: string;
  metaTestEventCode: string;
  metaEnabled: boolean;
  googleTagId: string;
  googleEnabled: boolean;

  token: TokenState;

  /** ISO timestamp, and the optimistic-concurrency version. */
  updatedAt: string;
  updatedBy: string | null;
}

/**
 * What a save sends.
 *
 * `metaCapiToken` is tri-state and the distinction matters:
 *   undefined  leave the stored token alone (the field was never touched)
 *   ""         DELETE the stored token
 *   "EAA…"     replace it
 *
 * A screen that always sent the current value would have to receive it first,
 * and receiving it is exactly what must never happen.
 */
export interface IntegrationsPatch {
  metaPixelId: string;
  metaTestEventCode: string;
  metaEnabled: boolean;
  googleTagId: string;
  googleEnabled: boolean;
  metaCapiToken?: string;
}
