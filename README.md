# QR Designer

A browser-only QR code generator and designer built with **React + TypeScript + Vite**. Enter content, customise the look, watch the preview update live, and download the result. Nothing is sent to a server.

DEPLOYED LINK
https://qr-task-alpha.vercel.app

## Features

- **QR types:** URL, plain text, email (`mailto:` with subject/body), phone (`tel:`) and Wi-Fi (`WIFI:` with WPA/WEP/open and hidden networks). Each type shows its own inputs.
- **Live preview** that updates on every change.
- **Customisation:** size (100–1000px), margin, foreground and background colours (picker or hex), error correction level (L/M/Q/H), dot pattern, corner styles, gradient foreground (linear or radial), and a logo upload.
- **Presets:** Classic, Soft, Ocean, Sunset, Forest and Dotty. A preset only sets visual options, and you can change anything afterwards.
- **Export:** PNG download that is pixel-identical to the preview, SVG download, and copy to clipboard.
- **Validation:** inline, per-field messages (URL format/scheme/domain, email format, phone digits, Wi-Fi SSID length and WPA/WEP password rules, content capacity per error correction level).
- **Scan reliability:**
  - Every design is rendered exactly as it would download and **decoded with [jsQR](https://github.com/cozmo/jsQR)**, giving a "Verified scannable" or "Could not be scanned" badge.
  - Warnings for low contrast (WCAG ratio, including both gradient colours), inverted colours, a small quiet zone, dense or small codes, logos with low error correction, oversized logos, and gappy dot styles.
- **Recent QR codes:** codes you download, copy or save go into `localStorage` (last 12, de-duplicated, with thumbnails). Click one to restore its content and style. They survive a page refresh.
- **Responsive** layout for desktop and mobile (down to 320px), plus a **dark/light theme** that follows the system and remembers your choice.

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm test          # run the test suite (Vitest)
npm run build     # type-check and build for production into dist/
npm run preview   # serve the production build
```

## Tests

`npm test` runs 58 tests:

| File | Covers |
| --- | --- |
| `src/test/qrData.test.ts` | Validation and payload format for every QR type, with invalid inputs. Each type is encoded and **decoded back** at every error correction level. |
| `src/test/readability.test.ts` | Contrast maths and every readability warning. |
| `src/test/storage.test.ts` | Recent list persistence, reload, de-duplication, the 12-item cap, corrupt data, quota handling; presets apply and can be modified. |
| `src/test/App.test.tsx` | UI: per-type inputs, live updates, error messages, download uses the preview's data and style, presets, warnings, recent list survives a remount and restores, theme toggle. |

These were also checked manually in Chrome on the production build:

- The downloaded PNG matches the preview canvas pixel for pixel.
- Every preset decodes.
- A low-contrast design is flagged as unscannable.
- Recent codes persist across a reload.
- There is no horizontal overflow at 390px or 320px.

## Project structure

```
src/
  App.tsx                 page layout, state, export actions
  components/
    DataForm.tsx          type-specific inputs and errors
    StylePanel.tsx        presets and customisation controls
    Preview.tsx           live canvas preview and scan check
    RecentList.tsx        locally stored recent codes
  lib/
    qrData.ts             QR types, validation, payload builders
    style.ts              style model and presets
    readability.ts        contrast and scannability warnings
    qrRenderer.ts         qr-code-styling wrapper, export, jsQR decode
    storage.ts            localStorage helpers (recent, theme)
```

## Deployment

This is a static Vite app, so Vercel and Netlify detect it automatically (build command `npm run build`, output directory `dist`).

```bash
npx vercel --prod
```
