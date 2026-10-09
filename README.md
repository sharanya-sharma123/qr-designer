# QR Code Generator & Designer

Live demo: https://qr-designer-xi.vercel.app

A browser-only QR code generator built with React, Vite and the `qrcode` library. No backend needed.

## Features
- QR types: URL, Text, Email, Phone, Wi-Fi (inputs change with the selected type)
- Real-time preview
- Customization: size, margin, foreground/background colour, error correction level
- 5 visual presets, which can be edited after selecting
- Download as PNG (matches the preview)
- Input validation with clear error messages
- Scan reliability warnings (low contrast, inverted colours, small size, small margin)
- Recent QR codes saved in localStorage (survive refresh) and reusable
- Responsive layout for desktop and mobile

## Tech Stack
React, Vite, JavaScript, CSS, qrcode, Vercel

## Run Locally
    npm install
    npm run dev

## Testing Done
- All 5 QR types generate correctly
- Size, margin, colour and error correction update the preview instantly
- Invalid inputs show errors
- Downloaded PNG scanned successfully with a phone
- Recent codes persist after page refresh
- Checked mobile layout in browser DevTools

## Screenshots
![Wi-Fi QR](screenshots/2-wifi.png)
![Mobile view](screenshots/3-mobile.png)