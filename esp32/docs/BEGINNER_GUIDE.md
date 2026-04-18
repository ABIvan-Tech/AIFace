# AIFace ESP32 — Beginner's Guide

Welcome! This guide walks you through **everything** you need to get your AIFace ESP32 board up and running — from installing software to seeing your device online. No previous ESP32 experience required.

---

## 0. What You Will Need

Before you start, make sure you have all of the following:

### Hardware
| Item | Notes |
|------|-------|
| **ESP32-S3 1.54" LCD Dev Board** | The AIFace hardware |
| **USB-C cable — data-capable** | ⚠️ Many cheap cables are **charge-only** and won't work. Look for "data + charging" on the packaging, or use the cable that came with a phone/tablet. |

### Software (we'll install these in Step 1)
| Software | Purpose |
|----------|---------|
| **Git** | Downloads the source code |
| **VS Code** | Code editor / IDE |
| **PlatformIO extension** | Handles compiling and flashing for embedded boards |
| **CP210x USB driver** (Windows only) | Lets Windows talk to the board over USB |

### Network
- A **2.4 GHz Wi-Fi** network (not 5 GHz — the ESP32 only supports 2.4 GHz)
- Your Wi-Fi password handy for Step 13

---

## 1. Install the Tools

### Step 1 — Install VS Code

**Why?** VS Code is a free, cross-platform code editor. We use it as our IDE (Integrated Development Environment) — the place where we write, build, and flash code.

1. Go to **https://code.visualstudio.com/** and download the installer for your OS.
2. Install it:
   - **macOS**: drag the app to your `Applications` folder.
   - **Windows**: run the `.exe` installer (keep all defaults, click Next → Next → Install).
   - **Linux**: download the `.deb` (Debian/Ubuntu) or `.rpm` (Fedora/RHEL) package and install with your package manager, or use `snap install --classic code`.
3. Launch VS Code.

---

### Step 2 — Install the PlatformIO Extension

**Why?** PlatformIO is a powerful tool for embedded development. It automatically downloads the right compiler for the ESP32-S3, manages all the libraries our firmware needs, and handles uploading the firmware to the board. Without it, you'd have to set all of that up manually.

1. In VS Code, click the **Extensions** icon in the left sidebar — it looks like four squares (or press `Ctrl+Shift+X` on Windows/Linux, `Cmd+Shift+X` on macOS).
2. In the search box, type **`PlatformIO IDE`**.
3. Click **Install** on the result from *PlatformIO*.
4. Wait 1–2 minutes while it installs.
5. When it finishes, VS Code will show a notification asking you to reload — click **"Reload Now"**.

After reloading, you'll see a new **alien/rocket icon (🪐)** in the left sidebar — that's PlatformIO.

---

### Step 3 — Install the USB Driver (Windows only)

**Why?** On Windows, the operating system needs a driver to recognise the USB-to-serial chip on the ESP32 board and create a COM port for it.

- **macOS** and **Linux**: no driver needed — skip to Step 4.
- **Windows**:
  1. Plug in your ESP32 board via USB-C.
  2. Open **Device Manager** (press `Win+X` → Device Manager).
  3. Look under **"Ports (COM & LPT)"**. If you see **"Silicon Labs CP210x"** or similar → driver is already installed, skip ahead.
  4. If you see an unknown device with a yellow ⚠️: download and install the **CP210x VCP driver** from:  
     👉 https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
  5. After installing, unplug and re-plug the board. You should now see it in Device Manager.

---

## 2. Get the Code

### Step 4 — Clone the Repository

**Why?** The firmware source code lives on GitHub. "Cloning" downloads a full copy to your computer.

Open a terminal (Terminal on macOS/Linux, PowerShell or Git Bash on Windows) and run:

```bash
git clone https://github.com/ABIvan-Tech/AIFace.git
cd AIFace
```

> **No Git?** Alternatively, go to https://github.com/ABIvan-Tech/AIFace, click the green **Code** button → **Download ZIP**, then extract the ZIP somewhere on your computer.

The folder you just downloaded contains several sub-projects. The one we care about is **`esp32/`** — that's the firmware for your board.

---

## 3. Open the Project

### Step 5 — Open the `esp32/` Folder in VS Code

**Why?** PlatformIO identifies a project by the `platformio.ini` file. This file lives inside `esp32/`, not in the repo root. If you open the wrong folder, PlatformIO won't recognise the project.

1. In VS Code: **File → Open Folder…**
2. Navigate to and select the **`AIFace/esp32/`** folder (⚠️ open `esp32/`, not the outer `AIFace/` folder).
3. Click **Open**.
4. VS Code will ask **"Do you trust the authors of the files in this folder?"** — click **Yes, I trust the authors**.

PlatformIO will detect `platformio.ini` and may show a notification at the bottom — that's normal.

---

### Step 6 — Wait for PlatformIO to Initialise

**Why?** The first time you open the project, PlatformIO needs to download the ESP32-S3 compiler toolchain and all the project's libraries. This is a one-time step (~200 MB).

- You'll see a **progress bar** at the bottom of VS Code and messages like *"Installing platform espressif32"*.
- This takes **2–5 minutes** depending on your internet speed.
- ⚠️ **Do not close VS Code during this step.**

Once it's done, the progress bar disappears and the status bar returns to normal.

---

## 4. Build the Firmware

### Step 7 — Build (Compile) the Project

**Why?** Our source code is human-readable C++. The ESP32 can't run C++ directly — it needs a binary `.bin` file. The "build" step runs the compiler to produce that file.

**Option A — VS Code toolbar (recommended):**
- Look at the **blue toolbar at the very bottom** of VS Code (the PlatformIO toolbar).
- Click the **✓ checkmark** icon (tooltip: "Build").

**Option B — Terminal:**
```bash
pio run
```

Wait 1–2 minutes. Watch the terminal output at the bottom.

- ✅ **Success**: you'll see `====== [SUCCESS] ======` in green.
- ❌ **Error**: see the [Troubleshooting](#troubleshooting) section at the end of this guide.

---

## 5. Connect the Board

### Step 8 — Plug In the ESP32-S3 via USB-C

1. Take your USB-C cable (data-capable!).
2. Plug one end into the ESP32 board, the other into your computer.
3. The board's **power LED** should light up immediately. If it doesn't, try a different cable.

---

### Step 9 — Check That Your Computer Sees the Board

**Why?** Before we can flash, we need to confirm the OS has recognised the board and assigned it a serial port.

**macOS:**
```bash
ls /dev/cu.usb*
# Expected output: /dev/cu.usbserial-0001
#              or: /dev/cu.SLAB_USBtoUART
```

**Windows:** Open **Device Manager** → expand **"Ports (COM & LPT)"** → look for **"Silicon Labs CP210x (COMx)"** or **"USB Serial Device (COMx)"**.

**Linux:**
```bash
ls /dev/ttyUSB* /dev/ttyACM*
# Expected output: /dev/ttyUSB0
#              or: /dev/ttyACM0
```

If nothing shows up → see [Board not detected](#board-not-detected-no-com-port--no-devttyusb) in Troubleshooting.

---

## 6. Flash (Upload) the Firmware

### Step 10 — Flash the Firmware

**Why?** "Flashing" copies the compiled `.bin` file from your computer onto the ESP32's internal flash memory. After this, the ESP32 can run your firmware independently, without being connected to the computer.

**Option A — VS Code toolbar:**
- In the blue PlatformIO toolbar at the bottom, click the **→ right-arrow** icon (tooltip: "Upload").

**Option B — Terminal:**
```bash
pio run --target upload
```

PlatformIO will automatically:
1. Build the project (if it hasn't been built yet)
2. Detect the serial port
3. Put the ESP32 into flashing mode
4. Transfer the firmware (takes 30–60 seconds — you'll see `Writing at 0x...` lines scrolling)
5. Reset the board automatically when done

- ✅ **Success**: terminal ends with `Hard resetting via RTS pin...`
- ❌ **Error "Failed to connect"**: see [Troubleshooting](#failed-to-connect-to-esp32-timed-out-waiting-for-packet-header)

> **If upload fails on the first try:** Hold the **BOOT** button on the board, press and release the **RESET** button, then release **BOOT**. This manually forces the ESP32 into download mode. Retry upload immediately after.

---

## 7. First Boot — Set Up Wi-Fi

The firmware has **no Wi-Fi credentials baked in** — for good reason: you shouldn't hardcode passwords into firmware. Instead, on first boot the device creates a temporary Wi-Fi hotspot so you can configure your network securely from your phone.

---

### Step 11 — Watch the Display

After flashing, the LCD will show boot messages:

```
AIFace ESP32
Booting...
```

Then:

```
WiFi
Hold BOOT to reset
```

> This is a **3-second window** where you can hold BOOT to wipe saved Wi-Fi credentials. Just wait — don't press anything unless you intentionally want to reset.

Then:

```
Connecting WiFi...
AIFace-Config
```

The device is now broadcasting a temporary Wi-Fi hotspot called **`AIFace-Config`**.

---

### Step 12 — Connect Your Phone to `AIFace-Config`

1. On your phone, open **Wi-Fi settings**.
2. Find the network **`AIFace-Config`** (open network, no password).
3. Connect to it.
4. A **captive portal page** should open automatically (like when you connect to hotel Wi-Fi).
   - If it doesn't open automatically: open your phone's browser and go to **`http://192.168.4.1`**

---

### Step 13 — Configure Your Wi-Fi

On the portal page:
1. Tap **"Configure WiFi"**.
2. A list of nearby Wi-Fi networks appears — tap **your home/office network**.
3. Enter your **Wi-Fi password**.
4. Tap **Save**.

> ⚠️ Remember: the ESP32 only supports **2.4 GHz** networks. If you have a combined 2.4/5 GHz network, make sure to pick the 2.4 GHz band (often labelled with `_2G` or `_2.4`).

---

### Step 14 — Device Reboots and Connects

The ESP32 saves your credentials to internal flash memory and reboots. The display will show:

```
WiFi OK
IP: 192.168.1.xxx
```

Then:

```
Ready. Waiting
192.168.1.xxx:8765
```

✅ **Your ESP32 is now on your network and ready to use!**

> **Next time** you power on the board, it will connect to your Wi-Fi automatically — no phone or computer needed.

---

## 8. Verify Everything Works

### Step 15 — Check mDNS Discovery (optional)

**Why?** The firmware advertises itself on the local network as `ai-face-esp32.local`. If this works, the MCP server (running on your computer) can find the device automatically without you needing to know its IP address.

Make sure your **computer is on the same Wi-Fi network** as the ESP32, then:

**macOS / Linux:**
```bash
ping ai-face-esp32.local
```

**Windows (PowerShell):**
```powershell
ping ai-face-esp32.local
```

- ✅ **Getting replies?** mDNS works — the MCP server will find your device automatically.
- ❌ **Request timeout / not found?** Use the IP address shown on the display instead (e.g., `192.168.1.42`).

---

### Step 16 — Open the Serial Monitor (optional, for debugging)

**Why?** The Serial Monitor lets you see log messages from the firmware in real time — useful if something isn't working as expected.

**Option A — Terminal:**
```bash
pio device monitor
```

**Option B — VS Code toolbar:**
- Click the **🔌 plug icon** ("Monitor") in the blue PlatformIO toolbar.

You'll see timestamped log messages from the ESP32. Press `Ctrl+C` to exit.

---

## Troubleshooting

### "Failed to connect to ESP32: Timed out waiting for packet header"

The board is not entering flash mode automatically.

1. Hold the **BOOT** button → press and release **RESET** → release **BOOT**.
2. Retry the upload **immediately** (within a few seconds).
3. If it still fails, try lowering the upload speed. In `platformio.ini`, change:
   ```ini
   upload_speed = 921600
   ```
   to:
   ```ini
   upload_speed = 115200
   ```
   Then retry.

---

### Board Not Detected (no COM port / no `/dev/ttyUSB`)

- **Try a different USB cable** — this is the most common cause. Charge-only cables have no data wires.
- **Try a different USB port** on your computer.
- **Windows**: install the CP210x driver from https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
- **Linux**: your user may not have permission to access serial ports. Add yourself to the `dialout` group:
  ```bash
  sudo usermod -aG dialout $USER
  ```
  Then **log out and back in** (a reboot also works). After that, retry.

---

### Display Stays Black / No Backlight

- Check the USB connection — the power LED should be on.
- The default backlight pin is **GPIO46**. If your board variant has it wired differently, update two places:
  - `src/config.h`: change `PIN_TFT_BL` to your board's backlight pin number.
  - `platformio.ini`: change `-DTFT_BL=46` to `-DTFT_BL=xx` (replace `xx` with the correct pin).

---

### Display Shows Scrambled Colours or Wrong Image

The firmware is configured for an **ST7789 240×240** display. If your board has a different controller, check the chip marking printed on the display module.

- **Colours look inverted**: add `-DTFT_INVERSION_ON=1` to the `build_flags` section in `platformio.ini`, then rebuild and re-flash.
- **Image is rotated**: open `src/renderer.cpp` and change `_tft.setRotation(0)` — try values `1`, `2`, or `3` until the orientation is correct.

---

### `AIFace-Config` Wi-Fi Not Appearing

- Wait up to **30 seconds** after power-on — the hotspot takes a moment to start.
- Check the LCD: it should show `AIFace-Config` on the second line. If it shows an IP address instead, the device already has saved credentials from a previous setup.
- **To reset saved credentials**: hold the **BOOT** button for 3 seconds immediately after powering on. The display will confirm the reset.

---

### Wi-Fi Portal Won't Open on Phone

- Make sure your phone is connected to **`AIFace-Config`**, not your home Wi-Fi.
- Manually open your phone's browser and navigate to **`http://192.168.4.1`**
- **iPhone users**: if iOS shows "No Internet Connection" and asks whether to stay connected — tap **"Use Without Internet"**. The portal doesn't need the internet to work.

---

### Build Error: `DynamicJsonDocument was not declared`

You have an outdated version of the ArduinoJson library cached. Run:

```bash
pio pkg update
```

Then rebuild (`pio run`).

---

### PlatformIO Toolbar Not Visible

- Make sure you opened the **`esp32/`** subfolder in VS Code, not the outer `AIFace/` repo root.
- Click the **🪐 PlatformIO alien icon** in the left sidebar → **"Project Tasks"** → expand **"esp32-s3-devkitc-1"** → you'll find Build, Upload, and Monitor there.

---

## Quick Reference

| Action | VS Code button | Terminal command |
|--------|---------------|-----------------|
| Build / Compile | ✓ (checkmark) | `pio run` |
| Upload / Flash | → (right arrow) | `pio run --target upload` |
| Serial Monitor | 🔌 (plug) | `pio device monitor` |
| Clean build cache | — | `pio run --target clean` |
| Update libraries | — | `pio pkg update` |

---

*That's it! If you run into anything not covered here, open an issue on the [GitHub repository](https://github.com/ABIvan-Tech/AIFace/issues).*
