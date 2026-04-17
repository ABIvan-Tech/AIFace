# AIFace ESP32 — Detailed Setup Guide

## 1. Install PlatformIO

### Option A — VS Code extension (recommended)
1. Install [VS Code](https://code.visualstudio.com/).
2. Open Extensions (`Ctrl+Shift+X`) and search for **PlatformIO IDE**.
3. Install and restart VS Code.

### Option B — CLI only
```bash
pip install platformio
```

---

## 2. Open the Project

1. In VS Code choose **File → Open Folder** and select the `esp32/` directory (not the repo root).
2. PlatformIO detects `platformio.ini` automatically and downloads the required toolchain and libraries on the first build (≈2–5 minutes).

---

## 3. First Boot — WiFi Setup

No credentials needed before flashing. On first boot the device shows:

| Display | What to do |
|---------|-----------|
| `Connecting WiFi...` | Wait — tries previously saved credentials |
| Portal not needed | Proceeds automatically if credentials are saved |
| `AIFace-Config` AP appears | Connect your phone to **AIFace-Config** (no password) |
| Captive portal opens | Pick your network, enter password, Save |
| Device reboots | Done — credentials saved to flash |

**To reset WiFi credentials**: hold the BOOT button during power-on for 3 seconds.
The display shows "WiFi Reset" and the device restarts into setup mode.

---

## 4. Build & Flash

### Via VS Code toolbar
- Click the **✓ Build** (checkmark) button to compile.
- Click the **→ Upload** (right-arrow) button to flash.

### Via terminal
```bash
cd esp32/
pio run                    # build only
pio run --target upload    # build + flash
pio device monitor         # open serial monitor (115200 baud)
```

> **Tip**: hold the **BOOT** button while pressing **RESET** if the board doesn't enter flashing mode automatically.

---

## 5. Pin Adjustment

If your display is wired differently, you must update **two places**:

### `src/config.h`
```cpp
#define PIN_TFT_MOSI 11   // change to your actual GPIO
#define PIN_TFT_SCLK 12
#define PIN_TFT_CS   10
#define PIN_TFT_DC    8
#define PIN_TFT_RST   9
#define PIN_TFT_BL   46
```

### `platformio.ini` → `build_flags`
```ini
-DTFT_MOSI=11   ; must match config.h
-DTFT_SCLK=12
-DTFT_CS=10
-DTFT_DC=8
-DTFT_RST=9
-DTFT_BL=46
```

TFT_eSPI reads pins at compile time from build flags, so both files must be in sync.

---

## 6. Verify It Works

After flashing, watch the display:

1. `AIFace ESP32 / Booting...` — firmware started
2. `Connecting WiFi... / <SSID>` — attempting to connect
3. `WiFi OK / IP: 192.168.x.x` — connected successfully
4. `Ready. Waiting / 192.168.x.x:8765` — WebSocket server is up

Open a browser and navigate to `http://192.168.x.x` — you won't see a web page (it's a raw WebSocket server), but if you get a TCP connection refused it means the port is wrong. A connection that is accepted and then immediately closed is normal for a plain HTTP request to a WebSocket server.

Check mDNS resolution from another device on the same network:
```bash
ping ai-face-esp32.local   # macOS / Linux
dns-sd -q ai-face-esp32.local  # macOS detailed
```

---

## 7. Troubleshooting

### Display stays blank / backlight off
- Check `PIN_TFT_BL` — some boards have the backlight wired to a different GPIO or always-on.
- Confirm `build_flags` in `platformio.ini` match your wiring.
- Try setting `TFT_BL` to `-1` (disabled) if there is no backlight pin.

### Display shows garbage / wrong colours
- Confirm the driver is `ST7789_DRIVER` (most 240×240 LCD modules use this).
- If colours look inverted, add `-DTFT_INVERSION_ON=1` to `build_flags`.
- If the image is rotated, change `_tft.setRotation(0)` in `renderer.cpp` (values 0–3).

### Wi-Fi never connects
- On first boot, the device starts a captive portal AP named **AIFace-Config**. Connect to it and follow the on-screen instructions.
- To force re-provisioning, hold the BOOT button at power-on for 3 seconds until the display shows "WiFi Reset".
- The ESP32-S3 only supports 2.4 GHz Wi-Fi; make sure your router broadcasts on 2.4 GHz.
- Check the serial monitor for detailed status from the WiFi stack.

### MCP server can't discover the device
- Ensure both the ESP32 and the machine running the MCP server are on the **same network**.
- If mDNS doesn't work, use the IP address shown on the display directly.
- Check that port 8765 is not blocked by a firewall on the machine running the MCP server.

### Compilation errors about `DynamicJsonDocument`
- This project uses **ArduinoJson v7** which replaces `DynamicJsonDocument` with `JsonDocument`. Make sure the library version in `platformio.ini` is `^7.0.0`.

### Upload fails with "A fatal error occurred"
- Hold the **BOOT** button on the ESP32-S3 board while pressing **RST**, then release both and retry upload.
- Try lowering `upload_speed` in `platformio.ini` to `460800` or `115200`.
