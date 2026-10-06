/**
 * The connections rules and Meta's error vocabulary, checked without a network.
 *
 * The error mapper is the part worth testing offline. Every branch of it is a
 * sentence the studio reads at the moment something is wrong, and the
 * difference between a useful one and a useless one is whether they know what
 * to do next. The case that forced this file into existence is code 100 with
 * no subcode: the first version printed Meta's "Missing Permission" verbatim,
 * which is true, unhelpful, and sent the studio hunting for a setting that did
 * not need changing.
 */

import { mapMetaError, META_API_VERSION } from "../src/lib/integrations/meta-test";
import { validateIntegrations } from "../src/lib/integrations/validate";
import type { IntegrationsPatch } from "../src/lib/integrations/types";

process.env.SETTINGS_KEY ??= Buffer.alloc(32, 7).toString("base64");

let failures = 0;

function is(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.error(
      `FAIL  ${label}\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`
    );
  }
}

function says(label: string, errors: string[], needle: string) {
  const hit = errors.some((e) => e.toLowerCase().includes(needle.toLowerCase()));
  if (!hit) {
    failures++;
    console.error(`FAIL  ${label}\n      errors were ${JSON.stringify(errors)}`);
  }
}

/* ── the rules ───────────────────────────────────────────────────────────── */

const BLANK: IntegrationsPatch = {
  metaPixelId: "",
  metaTestEventCode: "",
  metaEnabled: false,
  googleTagId: "",
  googleEnabled: false,
};
const with_ = (p: Partial<IntegrationsPatch>): IntegrationsPatch => ({ ...BLANK, ...p });

is("everything empty is valid — switching both off is a real choice",
   validateIntegrations(BLANK), []);
is("a plain valid pair passes",
   validateIntegrations(with_({ metaPixelId: "1234567890123456", metaEnabled: true,
                               googleTagId: "G-ABC123XYZ", googleEnabled: true })), []);

says("a token pasted into the pixel field is named as a token",
     validateIntegrations(with_({ metaPixelId: "EAAGm0PX4ZCpsBO1" })), "access token");
says("a URL in the pixel field is refused",
     validateIntegrations(with_({ metaPixelId: "https://business.facebook.com/1234" })), "digits");
says("a pixel id with spaces is refused",
     validateIntegrations(with_({ metaPixelId: "1234 5678 9012 3456" })), "digits");
says("meta on without a pixel is refused",
     validateIntegrations(with_({ metaEnabled: true })), "without a Pixel ID");

says("UA- is named as Universal Analytics, not just rejected",
     validateIntegrations(with_({ googleTagId: "UA-12345678-1" })), "Universal Analytics");
says("and lowercase ua- too",
     validateIntegrations(with_({ googleTagId: "ua-12345678-1" })), "Universal Analytics");
says("a nonsense google tag is refused",
     validateIntegrations(with_({ googleTagId: "GTM-ABC123" })), "G-ABC123XYZ");
says("google on without a tag is refused",
     validateIntegrations(with_({ googleEnabled: true })), "without a tag");
is("AW- is accepted — Ads is as valid as Analytics",
   validateIntegrations(with_({ googleTagId: "AW-123456789", googleEnabled: true })), []);

says("a test code that is not TESTnnn is refused",
     validateIntegrations(with_({ metaTestEventCode: "12345" })), "TEST12345");
is("a proper test code passes",
   validateIntegrations(with_({ metaTestEventCode: "TEST98765" })), []);

/* ── Meta's vocabulary ───────────────────────────────────────────────────── */

const trace = "Ax7A9H-XsUtEvVvNAXCFLvl";

// Measured live: HTTP 400 with this exact body for a token that cannot parse.
const badToken = mapMetaError(
  { message: "Invalid OAuth access token - Cannot parse access token",
    type: "OAuthException", code: 190, fbtrace_id: trace },
  400
);
is("a bad token is reported as a token problem", badToken.code, 190);
is("and quotes Meta rather than paraphrasing",
   badToken.message.includes("Cannot parse access token"), true);
is("and says where to get a new one", (badToken.hint ?? "").includes("Events Manager"), true);
is("the trace id survives for Meta support", badToken.traceId, trace);
is("the API version is carried, because a version typo also reports as 190",
   badToken.apiVersion, META_API_VERSION);

const expired = mapMetaError({ message: "Session has expired", code: 190, error_subcode: 463 }, 400);
is("an expired token leads with expiry", (expired.hint ?? "").includes("expired"), true);

const wrongPixel = mapMetaError({ message: "Unsupported get request", code: 100, error_subcode: 33 }, 400);
is("code 100/33 is the pairing error",
   wrongPixel.message.includes("does not exist"), true);

/*
 * THE CASE THIS FILE EXISTS FOR.
 *
 * A Conversions API token from Events Manager can SEND to its dataset but not
 * READ it. The read probe therefore comes back "(#100) Missing Permission",
 * which says nothing about whether the integration works. It must not read as
 * a fault, and it must offer the way forward.
 */
const capiToken = mapMetaError(
  { message: "(#100) Missing Permission", type: "OAuthException", code: 100, fbtrace_id: trace },
  403
);
is("a CAPI token's read refusal is NOT presented as a fault",
   capiToken.message.includes("normal for a Conversions API token"), true);
is("it says the token can still send", capiToken.message.includes("can send events"), true);
is("it offers the test event code route",
   (capiToken.hint ?? "").includes("Test events"), true);
is("and the Dataset Quality API route",
   (capiToken.hint ?? "").includes("Dataset Quality API"), true);
is("and it tells the screen a send test is possible", capiToken.sendTestAvailable, true);
is("whereas 100/33 does not offer one", wrongPixel.sendTestAvailable, undefined);

const rateLimit = mapMetaError({ message: "User request limit reached", code: 4 }, 400);
is("a rate limit says to wait, not to change anything",
   (rateLimit.hint ?? "").includes("Wait a minute"), true);

const transient = mapMetaError({ message: "Please reduce the amount of data", code: 1 }, 500);
is("a transient error is named as Meta's problem",
   transient.message.includes("temporarily unavailable"), true);

// Meta writes these two for humans whenever it has something human to say.
const userFacing = mapMetaError(
  { error_user_title: "Dataset not active", error_user_msg: "Turn the dataset on first.", code: 2635 },
  400
);
is("Meta's own human title wins", userFacing.message, "Dataset not active");
is("and its human message becomes the hint", userFacing.hint, "Turn the dataset on first.");

const unknown = mapMetaError({ message: "Something new", code: 9999, type: "OAuthException" }, 400);
is("an unknown code still quotes Meta and its number",
   unknown.message.includes("Something new") && unknown.message.includes("9999"), true);

const nothing = mapMetaError(undefined, 502);
is("a body with no error object still says the status", nothing.message.includes("502"), true);
is("and never pretends to have succeeded", nothing.ok, false);

if (failures) {
  console.error(`\ncheck-integrations: ${failures} failure(s)`);
  process.exit(1);
}
console.log("check-integrations: all assertions passed");
