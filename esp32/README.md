# AIFace — ESP32-S3 Display Client

This firmware turns an **ESP32-S3** development board with a **1.54-inch 240×240 ST7789 LCD** into an animated robot-face display. It connects to your Wi-Fi network, starts a WebSocket server on port **8765**, and advertises itself via mDNS so the AIFace MCP server can discover and drive it automatically.

---

## Hardware

| Part | Spec |
|------|------|
| MCU | ESP32-S3 (dual-core 240 MHz, 8 MB PSRAM, 16 MB Flash) |
| Display | 1.54" 240×240 LCD, ST7789 controller, 262K colors, SPI |
| Connectivity | 2.4 GHz Wi-Fi (used), BLE 5 (unused in v1) |

Default SPI wiring (hardwired on most all-in-one ESP32-S3 + LCD boards):

| Signal | GPIO |
|--------|------|
| MOSI   | 11   |
| SCLK   | 12   |
| CS     | 10   |
| DC     | 8    |
| RST    | 9    |
| BL     | 46   |

> If your board uses different pins, update **both** `src/config.h` **and** the `build_flags` section of `platformio.ini`.

---

## Quick Start

1. **Install PlatformIO** — install the [PlatformIO IDE extension](https://platformio.org/install/ide?install=vscode) for VS Code (or use the CLI).

2. **Open this folder** in VS Code — open `esp32/` as a PlatformIO project (File → Open Folder).

3. **Build & Flash** — no WiFi config needed before flashing.
   ```bash
   pio run --target upload
   # or use the PlatformIO toolbar in VS Code (→ Upload button)
   ```

4. **First boot WiFi setup**:
   - Device shows `Connecting WiFi...` or starts AP **`AIFace-Config`**
   - Connect your phone to **AIFace-Config** (no password)
   - Captive portal opens automatically → pick network → enter password → Save
   - Device reboots and connects — done.
   - To reset credentials: hold **BOOT** button for 3 s at power-on.

5. **Done** — the display shows the IP address and "Waiting for MCP..." once connected.

---

## Finding the IP Address

The IP address is shown directly on the TFT display after connecting to Wi-Fi. You can also read it from the serial monitor:

```bash
pio device monitor
```

The device also announces itself via mDNS as:
```
ai-face-esp32.local
```

So the MCP server can connect to `ws://ai-face-esp32.local:8765` without a hardcoded IP.

---

## What You Should See (Step by Step)

| Step | Display shows |
|------|---------------|
| Power on | `AIFace ESP32 / Booting...` |
| Boot hold window | `WiFi / Hold BOOT to reset` |
| Connecting (saved creds) | `Connecting WiFi... / AIFace-Config` |
| Portal active | `Connecting WiFi... / AIFace-Config` (connect phone to AP) |
| Connected | `WiFi OK / IP: 192.168.x.x` |
| Ready | `Ready. Waiting / 192.168.x.x:8765` |
| MCP connected + scene active | Animated face |
| MCP disconnected | `Waiting for MCP... / 192.168.x.x:8765` |

---

## See Also

- [`docs/SETUP.md`](docs/SETUP.md) — detailed PlatformIO setup, pin adjustment, and troubleshooting
- [`src/config.h`](src/config.h) — all configurable constants
