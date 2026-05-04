# Kiddo Studio — Visual Design Assets

## Color Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `kiddo-lime` | `#C8E820` | Primary accent, CTAs, highlights, handwritten words |
| `kiddo-black` | `#1A1A1A` | Body text, dark elements |
| `kiddo-cream` | `#F2EFE6` | Page background, light sections |
| `kiddo-dark` | `#111111` | Dark sections (Studio Intro, Space, Footer) |
| `kiddo-off-white` | `#F8F5EE` | Subtle light backgrounds |
| `kiddo-mid-gray` | `#888888` | Muted text, secondary info |

CSS variables available in all components: `--kiddo-lime`, `--kiddo-black`, `--kiddo-cream`, `--kiddo-dark`, `--kiddo-off-white`.

## Typography

| Role | Font | Variable | Tailwind Class | Usage |
|------|------|----------|----------------|-------|
| Headlines | Bebas Neue | `--font-display` | `font-display` | Section titles, hero text, card titles |
| Handwritten | Permanent Marker | `--font-hand` | `font-hand` | `HandwrittenWord` component, accent words |
| Labels/Mono | Space Mono | `--font-mono` | `font-mono` | Nav, pricing labels, metadata, coordinates |
| Body | System UI | `--font-body` | `font-body` | Paragraphs, descriptions |

### Font Size Scale
- `text-display-hero`: `clamp(3.5rem, 9vw, 9rem)` / line-height 0.92
- `text-display-lg`: `clamp(2rem, 5vw, 5rem)` / line-height 1
- `text-display-md`: `clamp(1.5rem, 3vw, 3rem)` / line-height 1.1

## Component → Section Map

| Section | Key Components Used |
|---------|---------------------|
| **Hero** | `HandwrittenWord`, `BrushUnderline`, `ScribbleArrowIcon`, `ScribbleCircle`, `TapeStrip`, `GridPaperPatch`, `CollagePhotoFrame`, `SmileyFaceIcon`, `VerticalDots`, `SmallTextArrowLink` |
| **Studio Intro** | `HandwrittenWord`, `BrushUnderline`, `TapeStrip`, `SmileyFaceIcon`, `ScribbleArrowIcon`, `SmallTextArrowLink` |
| **Services** | `SectionLabelNumber`, `NeonHighlightStroke`, `CameraSketchIcon`, `StoolSketchIcon`, `StudioLightSketchIcon`, `SmallTextArrowLink` |
| **The Space** | `BrushUnderline`, `CircleArrowButton`, `SmallTextArrowLink` |
| **Process** | `HandwrittenWord`, `BrushUnderline`, `ScribbleArrowIcon`, `CalendarSketchIcon`, `DoorSketchIcon`, `SmileyFaceIcon`, `HandDrawnStarIcon` |
| **Recent Projects** | `BrushUnderline`, `CircleArrowButton`, `SmallTextArrowLink` |
| **Pricing CTA** | `HandwrittenWord`, `ScribbleArrowIcon`, `SmileyFaceIcon`, `SmallTextArrowLink`, `CollagePhotoFrame`, `CircularBadgeSeal` |
| **Header** | `KiddoLogo` |
| **Footer** | `KiddoLogo`, `CircularBadgeSeal` |

## Images

All production images live in `public/images/`. Source files are in `asset/images/`.

| File | Content | Used In |
|------|---------|---------|
| `hero-camera.jpg` | B&W collage, boy with camera | Hero right panel |
| `studio-filmstrip.jpg` | Film strip with faces | Studio Intro left |
| `studio-interior.jpg` | Studio with lime wall | Studio Intro right |
| `art-collage.jpg` | Pop-art collage with tape | Services card 04 |
| `space-cyclorama.jpg` | Cyclorama area | The Space |
| `space-creative.jpg` | Leather sofa + art wall | The Space |
| `space-prop-room.jpg` | Props and ladder | The Space |
| `space-black-box.jpg` | Dark black box room | The Space |
| `project-01.jpg` → `project-06.jpg` | Studio shoot portfolio | Recent Projects |
| `equipment-footer.jpg` | B&W studio lights | Pricing CTA right |

## Live Design Manual

Visit `/kiddo-assets-preview` in the running dev server to interactively browse all 20 components with their props.
