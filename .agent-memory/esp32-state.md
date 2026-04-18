# AIFace ESP32 — Current State

## Hardware
- Waveshare ESP32-S3-LCD-1.54, 240×240 ST7789, battery-powered
- WiFi: 192.168.1.219, WebSocket port 8765
- Buttons: BOOT=GPIO0 (WiFi reset), PWR=GPIO5 (deep sleep), PLUS=GPIO4 (reserved)
- SPI: MOSI=39, SCLK=38, CS=21, DC=45, RST=40, BL=46

## Firmware Features (as of 7ccc457)
- WiFiManager captive portal (first boot) + BOOT hold 3s to reset creds
- WebSocket server :8765, receives set_scene / apply_mutations / reset
- mDNS: ai-face-esp32.local
- Dirty-flag rendering: only redraws when scene changes
- All 5 shape types: circle, ellipse, rect, line, arc
- Ellipse: props.width/2, props.height/2 as radii
- Arc: elliptical (width/height semi-axes), sweepAngle
- PWR button (GPIO5) hold 0.8s → deep sleep; press to wake (EXT0 on GPIO5)
- LifeSim: breathing (±2.5Y, 0.18Hz) + blinking (140ms, 2.5–5.5s intervals)
  - Active only when no MCP mutation for >1s
  - 200ms tick, markDirty() forces re-render

## CLI Testing
- python mobile/tools/cli/cli.py --host 192.168.1.219 --port 8765
- Mutations: flat format {op, id, transform, style, props}
- Mouth type: arc from start

## Key Architecture Notes
- LifeSim copies Shape before applying offsets — SceneStore holds clean base
- WsServer calls lifeSim.onExternalActivity() on every set_scene/apply_mutations
- Coordinate system: [-100,100] → screen 240×240
- drawRect: uses props.width/2, props.height/2
