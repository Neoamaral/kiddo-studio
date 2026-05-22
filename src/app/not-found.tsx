import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import {
  SmileyFaceIcon,
  HandwrittenWord,
  ScribbleArrowIcon,
  TapeStrip,
  HandDrawnStarIcon,
} from "@/components/kiddo-assets";

export default function NotFound() {
  return (
    <>
      <Header />
      <main>
        <section
          style={{
            background: "#F2EFE6",
            position: "relative",
            padding: "100px 0 140px",
            overflow: "hidden",
            minHeight: 600,
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 80, opacity: 0.4 }}>
            <ScribbleArrowIcon variant="diagonal" width={80} height={80} />
          </div>
          <div
            style={{
              position: "absolute",
              top: 40,
              right: 80,
              transform: "rotate(10deg)",
            }}
          >
            <TapeStrip variant="yellow" width={140} />
          </div>
          <div style={{ position: "absolute", bottom: 60, left: 120 }}>
            <HandDrawnStarIcon width={64} />
          </div>

          <div
            className="kiddo-container"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              textAlign: "center",
              position: "relative",
            }}
          >
            <SmileyFaceIcon variant="drip" width={220} fill={"#C8E820"} />
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "rgba(0,0,0,0.45)",
              }}
            >
              ERROR 404 · LOST PAGE
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(5rem,14vw,13.75rem)",
                lineHeight: 0.9,
                letterSpacing: "-0.02em",
              }}
            >
              404.
            </h1>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem,4vw,3.75rem)",
                lineHeight: 1,
              }}
            >
              COULDN&apos;T FIND{" "}
              <HandwrittenWord text="that one." color={"#C8E820"} fontSize="inherit" rotation={-3} />
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(0,0,0,0.55)",
                maxWidth: 460,
                lineHeight: 1.7,
              }}
            >
              Maybe we moved it. Maybe it never existed. Either way — there&apos;s plenty more to
              play with.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 14,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <Link
                href="/"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  background: "#C8E820",
                  color: "#1A1A1A",
                  border: "1px solid #1A1A1A",
                  padding: "12px 22px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  textDecoration: "none",
                }}
              >
                BACK HOME{" "}
                <ScribbleArrowIcon variant="right" width={20} height={10} color={"#1A1A1A"} />
              </Link>
              <Link
                href="/projects"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  background: "transparent",
                  color: "#1A1A1A",
                  border: "1px solid #1A1A1A",
                  padding: "12px 22px",
                  textDecoration: "none",
                }}
              >
                SEE PROJECTS
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
