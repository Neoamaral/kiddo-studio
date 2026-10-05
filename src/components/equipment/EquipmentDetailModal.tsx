"use client";

/**
 * Equipment detail modal: gallery + description + an action.
 *
 * Composes the generic <Modal> shell — it owns none of the focus/portal/scroll
 * machinery, only layout and copy.
 *
 * The footer is a slot, because the right action depends on where the modal is
 * opened from. On /equipment it is the pair of links below. Inside the booking
 * flow a link is actively dangerous: /booking holds the whole half-filled form
 * in local state, so navigating there from inside it throws away the client's
 * date, slot, package and details. The booking caller passes a button instead.
 */

import { useId } from "react";
import { ScribbleArrowIcon, kiddoColors } from "@/components/kiddo-assets";
import { useIsMobile } from "@/hooks/useIsMobile";
import { itemDescription, itemPhotos } from "@/data/equipment";
import type { EquipmentItem } from "@/data/types";
import Modal from "@/components/ui/Modal";
import EquipmentGallery from "./EquipmentGallery";
import { HotBadge, ItemPrice, StockBars, displayStyle, monoXsStyle } from "./ledgerBits";

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 0",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.4)" }}>{label}</span>
      <span style={{ textAlign: "right", minWidth: 0 }}>{children}</span>
    </div>
  );
}

function DetailContent({
  item,
  titleId,
  onClose,
  action,
  availability,
}: {
  item: EquipmentItem;
  titleId: string;
  onClose: () => void;
  action?: React.ReactNode;
  availability?: React.ReactNode;
}) {
  // The modal only mounts on click, long after useIsMobile has settled — so
  // unlike the ledger rows there is no desktop-then-mobile flash here.
  const isMobile = useIsMobile(768);
  const isNarrow = useIsMobile(1024);
  const isDesktop = !isNarrow;

  const photos = itemPhotos(item);

  return (
    <>
      {/* Sticky header so Close is always reachable without scrolling. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px clamp(16px, 3vw, 28px)",
          borderBottom: `2px solid ${kiddoColors.black}`,
          background: "#F8F5EE",
          flexShrink: 0,
        }}
      >
        <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.45)" }}>
          {item.code}
          {item.hot && <HotBadge />}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: `1px solid ${kiddoColors.black}`,
            background: "transparent",
            color: kiddoColors.black,
            fontSize: 18,
            fontFamily: "var(--font-mono)",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "1.4fr minmax(320px, 0.9fr)" : "1fr",
          gap: "clamp(18px, 3vw, 32px)",
          padding: "clamp(16px, 3vw, 28px)",
          overflowY: "auto",
          overscrollBehavior: "contain", // stops iOS scroll chaining to the page
          minHeight: 0,
        }}
      >
        <EquipmentGallery
          photos={photos}
          itemName={item.name}
          isMobile={isMobile}
          isDesktop={isDesktop}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <h2
            id={titleId}
            style={{
              ...displayStyle,
              fontSize: "clamp(28px, 4vw, 44px)",
              color: kiddoColors.black,
              margin: 0,
            }}
          >
            {item.name}
          </h2>

          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              lineHeight: 1.65,
              color: "rgba(0,0,0,0.7)",
              margin: 0,
            }}
          >
            {itemDescription(item)}
          </p>

          <div style={{ borderTop: "1px solid rgba(0,0,0,0.15)" }}>
            <SpecRow label="SPEC">
              <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.6)" }}>{item.spec}</span>
            </SpecRow>
            <SpecRow label="PER DAY">
              <ItemPrice item={item} />
            </SpecRow>
            <SpecRow label="AVAILABILITY">
              {/*
                item.inStock is what the studio OWNS, which is the honest answer
                on /equipment. Inside a booking it is not: the client has picked
                a date, and a row can read "SOLD OUT — THAT DATE" while the
                studio owns four. The booking caller passes the date-aware count
                so the two never contradict each other on screen.
              */}
              {availability ?? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <StockBars count={item.inStock} />
                  <span style={{ ...monoXsStyle, color: "rgba(0,0,0,0.45)" }}>
                    {item.inStock} avail.
                  </span>
                </span>
              )}
            </SpecRow>
          </div>

          {action ?? <DefaultCtas />}
        </div>
      </div>
    </>
  );
}

/** The footer /equipment uses. Unchanged — only moved. */
function DefaultCtas() {
  return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {/* /booking reads no query params — linking it plain rather than
                shipping an ?item= nothing consumes. */}
            <a
              href="/booking"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontWeight: 700,
                background: kiddoColors.black,
                color: kiddoColors.lime,
                padding: "14px 22px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                textDecoration: "none",
              }}
            >
              BOOK THIS ITEM
              <ScribbleArrowIcon variant="right" width={20} height={10} color={kiddoColors.lime} />
            </a>
            <a
              href="/contact"
              style={{
                ...monoXsStyle,
                color: "rgba(0,0,0,0.55)",
                textAlign: "center",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              ENQUIRE ABOUT THIS ITEM
            </a>
          </div>
  );
}

export default function EquipmentDetailModal({
  item,
  onClose,
  action,
  availability,
}: {
  item: EquipmentItem | null;
  onClose: () => void;
  /**
   * Replaces the BOOK THIS ITEM / ENQUIRE footer. Omitted on /equipment, where
   * the links are right. Supplied by the booking flow, where they are not.
   */
  action?: React.ReactNode;
  /** Replaces "N avail." with a date-aware count. See the SpecRow above. */
  availability?: React.ReactNode;
}) {
  const titleId = useId();
  const isMobile = useIsMobile(768);

  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      labelledBy={titleId}
      maxWidth={1100}
      fullBleed={isMobile}
    >
      {/* key remounts the tree per item, resetting the gallery index to 0
          without a synchronising effect. */}
      {item && (
        <DetailContent
          key={item.code}
          item={item}
          titleId={titleId}
          onClose={onClose}
          action={action}
          availability={availability}
        />
      )}
    </Modal>
  );
}
