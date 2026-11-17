# Tezda logo kit

- `svg/`: master files
  - **Lockups:** `tezda-lockup` (horizontal, main), `tezda-stacked` (vertical), `tezda-lockup-reverse` (for dark backgrounds, no background of its own), `-dark` (with its own background), `-black`, `-white`
  - **Symbol:** `tezda-symbol`, `-black`, `-white`, and `-small` (small-size cut for 16–32px)
  - **Other:** `tezda-wordmark` (wordmark only), `tezda-app-icon`, `tezda-app-icon-small`
- `web/`: website and PWA set
  - **Icons:** `favicon.ico` (16/32/48), `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable-512.png`
  - **Config:** `site.webmanifest`, `head-snippet.html`
- `lockup/`: lockup in black and white, plus 1200px PNGs
- `presentation.html` + `slides/`: presentation with mockups (app icon, website, browser tab, social, sticker, bag)
- `guidelines.html` / `guidelines.png`: one-page usage guide
- Source: `../final/build.py` regenerates all the SVGs

## Open items
- The "tezda" wordmark is built from SVG strokes. It renders correctly in browsers, but before handing it to print or another designer, run "Outline stroke" in Figma/Illustrator.
- The CMYK and Pantone values are approximate. Check them on a print proof.
- Trademark: search for "Tezda" in the IMA register and register it in classes 9, 35, 42 and 43.
