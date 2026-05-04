"use client";

import {
  SmileyFaceIcon,
  ScribbleArrowIcon,
  BrushUnderline,
  NeonHighlightStroke,
  TapeStrip,
  VerticalDots,
  HandDrawnStarIcon,
  CalendarSketchIcon,
  DoorSketchIcon,
  CircleArrowButton,
  CameraSketchIcon,
  StoolSketchIcon,
  StudioLightSketchIcon,
  CircularBadgeSeal,
  ScribbleCircle,
  GridPaperPatch,
  CollagePhotoFrame,
  SectionLabelNumber,
  SmallTextArrowLink,
  HandwrittenWord,
  kiddoColors,
} from "@/components/kiddo-assets";

/* ─── small helpers ─── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2
        className="text-xs font-bold tracking-[0.25em] uppercase mb-1"
        style={{ color: kiddoColors.midGray }}
      >
        {children}
      </h2>
      <div className="h-px bg-black/10 w-full" />
    </div>
  );
}

function Tile({
  label,
  children,
  dark,
}: {
  label: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 p-6 rounded"
      style={{ background: dark ? kiddoColors.black : "#EEEAD8", minHeight: 140 }}
    >
      <div className="flex items-center justify-center">{children}</div>
      <span
        className="text-[10px] tracking-widest uppercase"
        style={{ color: dark ? kiddoColors.midGray : kiddoColors.midGray }}
      >
        {label}
      </span>
    </div>
  );
}

/* ─── PAGE ─── */
export default function KiddoAssetsPreview() {
  return (
    <main
      className="min-h-screen px-10 py-14"
      style={{ background: kiddoColors.cream, color: kiddoColors.black }}
    >
      {/* Header */}
      <div className="mb-16">
        <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: kiddoColors.midGray }}>
          Visual Asset System
        </p>
        <h1
          className="font-black text-6xl leading-none tracking-tight mb-4"
          style={{ fontFamily: "'Arial Black', sans-serif" }}
        >
          KIDDO <span style={{ color: kiddoColors.lime }}>STUDIO</span>
        </h1>
        <p className="text-sm" style={{ color: kiddoColors.midGray }}>
          All reusable components — icons, scribbles, tape, typography, collage pieces.
        </p>
      </div>

      {/* ── SMILEY ELEMENTS ── */}
      <section className="mb-16">
        <SectionTitle>Smiley Elements</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Tile label="Clean Smiley">
            <SmileyFaceIcon variant="clean" width={80} height={80} />
          </Tile>
          <Tile label="Clean Filled">
            <SmileyFaceIcon variant="clean" width={80} height={80} fill={kiddoColors.lime} />
          </Tile>
          <Tile label="Drip Smiley" dark>
            <SmileyFaceIcon variant="drip" width={80} height={110} />
          </Tile>
          <Tile label="Drip Large">
            <SmileyFaceIcon variant="drip" width={100} height={135} />
          </Tile>
        </div>
      </section>

      {/* ── ARROWS ── */}
      <section className="mb-16">
        <SectionTitle>Scribble Arrows</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Tile label="Right Arrow">
            <ScribbleArrowIcon variant="right" width={80} height={28} />
          </Tile>
          <Tile label="Down Arrow">
            <ScribbleArrowIcon variant="down" width={28} height={80} />
          </Tile>
          <Tile label="Diagonal Arrow">
            <ScribbleArrowIcon variant="diagonal" width={60} height={60} />
          </Tile>
          <Tile label="Circle Arrow (Filled)">
            <CircleArrowButton variant="filled" size={56} />
          </Tile>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <Tile label="Circle Outline" dark>
            <CircleArrowButton variant="outline" size={56} color={kiddoColors.lime} />
          </Tile>
          <Tile label="Circle Arrow Left">
            <CircleArrowButton variant="filled" size={56} direction="left" />
          </Tile>
          <Tile label="Arrow on Dark" dark>
            <ScribbleArrowIcon variant="right" width={80} height={28} color={kiddoColors.lime} />
          </Tile>
          <Tile label="Text + Arrow">
            <SmallTextArrowLink label="Explore the Space" />
          </Tile>
        </div>
      </section>

      {/* ── BRUSH / UNDERLINE ── */}
      <section className="mb-16">
        <SectionTitle>Brush Underlines &amp; Highlights</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Tile label="Short Underline">
            <BrushUnderline variant="short" />
          </Tile>
          <Tile label="Long Underline">
            <BrushUnderline variant="long" />
          </Tile>
          <Tile label="Double Underline">
            <BrushUnderline variant="double" />
          </Tile>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <Tile label="Horizontal Highlight">
            <NeonHighlightStroke variant="horizontal" width={200} height={48} />
          </Tile>
          <Tile label="Square Splash">
            <NeonHighlightStroke variant="square" width={100} height={100} />
          </Tile>
          <Tile label="Vertical Mark" dark>
            <NeonHighlightStroke variant="vertical" width={48} height={120} />
          </Tile>
        </div>
      </section>

      {/* ── TAPE ── */}
      <section className="mb-16">
        <SectionTitle>Tape Strips</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Tile label="Yellow Tape">
            <TapeStrip variant="yellow" rotation={-8} />
          </Tile>
          <Tile label="Black Tape" dark>
            <TapeStrip variant="black" rotation={4} />
          </Tile>
          <Tile label="Paper Tape">
            <TapeStrip variant="paper" rotation={-3} />
          </Tile>
        </div>
      </section>

      {/* ── SCRIBBLES ── */}
      <section className="mb-16">
        <SectionTitle>Scribbles &amp; Decorative</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Tile label="Scribble Circle">
            <ScribbleCircle width={80} height={80} />
          </Tile>
          <Tile label="Scribble Circle Yellow">
            <ScribbleCircle width={80} height={80} color={kiddoColors.lime} strokeWidth={2} />
          </Tile>
          <Tile label="Vertical Dots">
            <VerticalDots count={4} activeIndex={1} />
          </Tile>
          <Tile label="Grid Paper Patch">
            <GridPaperPatch width={100} height={80} />
          </Tile>
        </div>
      </section>

      {/* ── SERVICE ICONS ── */}
      <section className="mb-16">
        <SectionTitle>Service Icons</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Tile label="01 Production">
            <CameraSketchIcon width={110} height={90} />
          </Tile>
          <Tile label="02 Studio Rental">
            <StoolSketchIcon width={72} height={110} />
          </Tile>
          <Tile label="03 Equipment">
            <StudioLightSketchIcon width={90} height={126} />
          </Tile>
          <Tile label="04 Art Dept." dark>
            <CameraSketchIcon width={110} height={90} color={kiddoColors.cream} showAccent={false} />
          </Tile>
        </div>
      </section>

      {/* ── PROCESS ICONS ── */}
      <section className="mb-16">
        <SectionTitle>Process Step Icons</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Tile label="01 Book">
            <CalendarSketchIcon width={56} height={56} />
          </Tile>
          <Tile label="02 Show Up">
            <DoorSketchIcon width={50} height={64} />
          </Tile>
          <Tile label="03 Play">
            <SmileyFaceIcon variant="clean" width={56} height={56} />
          </Tile>
          <Tile label="04 Create">
            <HandDrawnStarIcon width={56} height={56} />
          </Tile>
        </div>
      </section>

      {/* ── TYPOGRAPHY ── */}
      <section className="mb-16">
        <SectionTitle>Handwritten Words &amp; Typography</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Tile label='HandwrittenWord "PLAY"'>
            <HandwrittenWord text="PLAY." fontSize={44} />
          </Tile>
          <Tile label='Highlighted "weird"'>
            <HandwrittenWord text="weird," fontSize={36} highlightColor={kiddoColors.lime} color={kiddoColors.black} />
          </Tile>
          <Tile label='"easy." in lime'>
            <HandwrittenWord text="easy." fontSize={44} rotation={-3} />
          </Tile>
        </div>

        <div className="mt-8 p-8 rounded" style={{ background: kiddoColors.black }}>
          <p
            className="font-black text-5xl leading-tight tracking-tight mb-2"
            style={{ fontFamily: "'Arial Black', sans-serif", color: "#fff" }}
          >
            WE DON&apos;T WORK.
            <br />
            WE{" "}
            <HandwrittenWord text="PLAY." fontSize="inherit" />
          </p>
          <BrushUnderline variant="long" width={280} />
        </div>
      </section>

      {/* ── SECTION NUMBERS ── */}
      <section className="mb-16">
        <SectionTitle>Section Label Numbers</SectionTitle>
        <div className="flex items-center gap-6 flex-wrap">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex flex-col items-center gap-2">
              <SectionLabelNumber number={n} size={36} />
              <span className="text-[10px] tracking-widest text-gray-500">0{n}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── BADGE / SEAL ── */}
      <section className="mb-16">
        <SectionTitle>Circular Badge Seal</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Tile label="Badge Default">
            <CircularBadgeSeal size={140} />
          </Tile>
          <Tile label="Badge on Dark" dark>
            <CircularBadgeSeal size={140} color={kiddoColors.lime} bgColor={kiddoColors.black} />
          </Tile>
          <Tile label="Badge Spinning">
            <CircularBadgeSeal size={120} spinning />
          </Tile>
        </div>
      </section>

      {/* ── COLLAGE FRAME ── */}
      <section className="mb-16">
        <SectionTitle>Collage Photo Frame</SectionTitle>
        <div className="flex flex-wrap gap-10 items-end">
          <CollagePhotoFrame
            src="/asset/images/WhatsApp-Image-2026-05-02-at-14.48_01.png"
            alt="Studio"
            width={200}
            height={240}
            rotation={-4}
            tape="top"
            tapeColor="yellow"
            blackAndWhite
          />
          <CollagePhotoFrame
            src="/asset/images/WhatsApp-Image-2026-05-02-at-14.48_02.png"
            alt="Studio 2"
            width={200}
            height={260}
            rotation={3}
            tape="corner"
            tapeColor="black"
          />
          <CollagePhotoFrame
            src="/asset/images/WhatsApp-Image-2026-05-02-at-14.48_03.png"
            alt="Studio 3"
            width={180}
            height={220}
            rotation={-2}
            tape="none"
            shadow
          />
        </div>
      </section>

      {/* ── IN-CONTEXT DEMO ── */}
      <section className="mb-16">
        <SectionTitle>In-Context: Service Card Demo</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-black/10">
          {[
            { n: 1, title: "PRODUCTION", desc: "We craft images. Films, commercials, ideas with soul.", Icon: () => <CameraSketchIcon width={90} height={76} /> },
            { n: 2, title: "STUDIO RENTAL", desc: "You bring the idea. We give you the space.", Icon: () => <StoolSketchIcon width={60} height={90} /> },
            { n: 3, title: "EQUIPMENT", desc: "Light it right. Shoot it your way.", Icon: () => <StudioLightSketchIcon width={72} height={100} /> },
            { n: 4, title: "ART DEPARTMENT", desc: "Build what doesn't exist.", Icon: () => <HandDrawnStarIcon width={60} height={60} /> },
          ].map(({ n, title, desc, Icon }) => (
            <div key={n} className="p-8 bg-[#F2EFE6] flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <SectionLabelNumber number={n} />
                <div className="flex-1 flex justify-end">
                  <Icon />
                </div>
              </div>
              <div>
                <h3
                  className="font-black text-lg leading-tight tracking-tight mb-2"
                  style={{ fontFamily: "'Arial Black', sans-serif" }}
                >
                  {title}
                </h3>
                <p className="text-xs leading-relaxed text-black/60">{desc}</p>
              </div>
              <SmallTextArrowLink label="View Work" />
            </div>
          ))}
        </div>
      </section>

      {/* ── PROCESS STEPS DEMO ── */}
      <section className="mb-16">
        <SectionTitle>In-Context: Process Steps Demo</SectionTitle>
        <div className="flex items-center gap-0 bg-[#F2EFE6] p-10 overflow-x-auto">
          <div className="mr-10 shrink-0">
            <HandwrittenWord text="easy." fontSize={52} rotation={-4} />
            <BrushUnderline variant="short" width={100} />
          </div>

          {[
            { n: 1, label: "BOOK", sub: "Pick your date and time.", Icon: () => <CalendarSketchIcon width={44} height={44} /> },
            { n: 2, label: "SHOW UP", sub: "Come in and make it yours.", Icon: () => <DoorSketchIcon width={38} height={48} /> },
            { n: 3, label: "PLAY", sub: "Experiment. Try everything.", Icon: () => <SmileyFaceIcon variant="clean" width={44} height={44} /> },
            { n: 4, label: "CREATE", sub: "Make something you're proud of.", Icon: () => <HandDrawnStarIcon width={44} height={44} /> },
          ].map(({ n, label, sub, Icon }, i) => (
            <div key={n} className="flex items-center">
              <div className="flex flex-col items-center gap-2 px-4 min-w-[100px] text-center">
                <span
                  className="text-xs font-bold tracking-widest"
                  style={{ color: kiddoColors.midGray }}
                >
                  0{n}
                </span>
                <Icon />
                <p
                  className="font-black text-sm tracking-tight"
                  style={{ fontFamily: "'Arial Black', sans-serif" }}
                >
                  {label}
                </p>
                <p className="text-[10px] text-black/50 leading-snug max-w-[80px]">{sub}</p>
              </div>
              {i < 3 && (
                <ScribbleArrowIcon variant="right" width={40} height={20} color={kiddoColors.black} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 pt-8 flex items-center justify-between">
        <div>
          <p className="font-black text-lg" style={{ fontFamily: "'Arial Black', sans-serif" }}>
            KIDDO <span style={{ color: kiddoColors.lime }}>STUDIO</span>
          </p>
          <p className="text-xs text-black/40 mt-1">Asset System — {Object.keys({ SmileyFaceIcon: 1 }).length * 20} components</p>
        </div>
        <CircularBadgeSeal size={90} />
      </footer>
    </main>
  );
}
