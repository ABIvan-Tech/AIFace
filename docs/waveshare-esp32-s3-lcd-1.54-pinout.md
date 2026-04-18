# Waveshare ESP32-S3-LCD-1.54 — Confirmed SPI Pin Assignments

**Board:** Waveshare ESP32-S3-LCD-1.54 / ESP32-S3-Touch-LCD-1.54  
**SKU:** 33867 (no touch), 33869 (with touch CST816)  
**Description:** ESP32-S3 1.54inch LCD Development Board, 240×240, 262K Color, Dual Microphones  
**Source:** [waveshareteam/ESP32-S3-Touch-LCD-1.54](https://github.com/waveshareteam/ESP32-S3-Touch-LCD-1.54) (official Waveshare repo)

---

## Display Controller

**ST7789** (confirmed by `esp_lcd_new_panel_st7789()` call in `bsp_display.c` and `Arduino_ST7789` in GFX example)

> Not GC9A01, not ILI9341. It is the **ST7789** variant.  
> Color inversion is required (`esp_lcd_panel_invert_color(*panel_handle, true)` in ESP-IDF).

---

## SPI Pin Assignments (Waveshare Integrated Board)

These are the **internal GPIO connections** on the Waveshare all-in-one development board — the LCD is soldered on-board, not an external breakout.

| Signal       | GPIO | Notes                          |
|-------------|------|--------------------------------|
| TFT_MOSI    | **39** | SPI data (SDA)               |
| TFT_SCLK    | **38** | SPI clock (SCL)              |
| TFT_CS      | **21** | Chip select (active LOW)     |
| TFT_DC      | **45** | Data/Command select          |
| TFT_RST     | **40** | Reset (active LOW)           |
| TFT_BL      | **46** | Backlight, PWM via LEDC      |
| TFT_MISO    | NC   | Not connected                  |

SPI Host: **SPI2_HOST**  
Pixel clock: **40 MHz** (default in BSP)

---

## Source Evidence

### ESP-IDF BSP Header (`bsp_display.h`)

```c
// File: examples/ESP32-S3-LCD-1.54-demo/ESP-IDF-5.5.1/01_factory/components/esp_bsp/bsp_display.h
#define EXAMPLE_SPI_HOST SPI2_HOST

#define EXAMPLE_PIN_MISO GPIO_NUM_NC
#define EXAMPLE_PIN_MOSI GPIO_NUM_39
#define EXAMPLE_PIN_SCLK GPIO_NUM_38

#define EXAMPLE_PIN_LCD_CS  GPIO_NUM_21
#define EXAMPLE_PIN_LCD_DC  GPIO_NUM_45
#define EXAMPLE_PIN_LCD_RST GPIO_NUM_40
#define EXAMPLE_PIN_LCD_BL  GPIO_NUM_46
```

### Arduino GFX Example (`04_gfx_helloworld.ino`)

```cpp
// File: examples/ESP32-S3-LCD-1.54-demo/Arduino-3.2.0/examples/04_gfx_helloworld/04_gfx_helloworld.ino
#define GFX_BL 46

Arduino_DataBus* bus = new Arduino_ESP32SPI(
    45 /* DC */, 21 /* CS */, 38 /* SCK */, 39 /* MOSI */, -1 /* MISO */);
Arduino_GFX* gfx = new Arduino_ST7789(
    bus, 40 /* RST */, 0 /* rotation */, true, 240, 240);
```

Both the ESP-IDF and Arduino examples are **identical** and cross-confirm each other.

---

## ⚠️ Current Project Mismatch

The AIFace project's current `esp32/src/config.h` and `esp32/platformio.ini` have **different pin assignments** that do NOT match this Waveshare board:

| Signal   | Config (current) | Waveshare (correct) | Match? |
|---------|-----------------|---------------------|--------|
| TFT_MOSI | 11              | **39**              | ❌     |
| TFT_SCLK | 12              | **38**              | ❌     |
| TFT_CS   | 10              | **21**              | ❌     |
| TFT_DC   | 8               | **45**              | ❌     |
| TFT_RST  | 9               | **40**              | ❌     |
| TFT_BL   | 46              | **46**              | ✅     |

The current config (pins 10/11/12 for SPI, 8/9 for DC/RST) appears to be generic ESP32-S3 DevKitC-1 hardware SPI2 defaults, not the Waveshare board's actual wiring.

**To fix**, update both `esp32/src/config.h` and `esp32/platformio.ini`:

```cpp
// src/config.h — correct values for Waveshare ESP32-S3-LCD-1.54
#define PIN_TFT_MOSI 39
#define PIN_TFT_SCLK 38
#define PIN_TFT_CS   21
#define PIN_TFT_DC   45
#define PIN_TFT_RST  40
#define PIN_TFT_BL   46
```

```ini
; platformio.ini build_flags — must mirror config.h
-DTFT_MOSI=39
-DTFT_SCLK=38
-DTFT_CS=21
-DTFT_DC=45
-DTFT_RST=40
-DTFT_BL=46
```

Also add `-DTFT_INVERSION_ON=1` since ST7789 on this board requires color inversion.

---

## Variant: External Breakout Display on DevKitC-1

For comparison — if you are connecting a **separate 1.54" ST7789 breakout module** to an ESP32-S3-DevKitC-1 via jumper wires (as in the Keyestudio kit or profharris expansion board), the wiring is completely different:

| Signal   | GPIO (breakout wiring) |
|---------|------------------------|
| TFT_MOSI | 47                     |
| TFT_SCLK | 21                     |
| TFT_CS   | 41                     |
| TFT_DC   | 40                     |
| TFT_RST  | 45                     |
| TFT_BL   | 42                     |

These are the pins from the Keyestudio ESP32S3-LCD154 kit docs and the `profharris/ESP32-S3-1.54in-TFT-Expansion-Board-with-Speaker` repo. **Do not use these for the Waveshare integrated board.**

---

## Confidence Assessment

| Claim | Confidence | Evidence |
|-------|-----------|---------|
| Display controller = ST7789 | ✅ Certain | `esp_lcd_new_panel_st7789()` + `Arduino_ST7789` in official code |
| MOSI = GPIO 39 | ✅ Certain | `bsp_display.h` + `.ino` in official Waveshare repo, fully consistent |
| SCLK = GPIO 38 | ✅ Certain | Same dual-source confirmation |
| CS = GPIO 21 | ✅ Certain | Same |
| DC = GPIO 45 | ✅ Certain | Same |
| RST = GPIO 40 | ✅ Certain | Same |
| BL = GPIO 46 | ✅ Certain | Same (also only pin matching current project config) |

---

## Sources

1. [`waveshareteam/ESP32-S3-Touch-LCD-1.54`](https://github.com/waveshareteam/ESP32-S3-Touch-LCD-1.54) — official Waveshare GitHub repository (created 2026-03-12)
2. `examples/ESP32-S3-LCD-1.54-demo/ESP-IDF-5.5.1/01_factory/components/esp_bsp/bsp_display.h` — ESP-IDF BSP pin definitions
3. `examples/ESP32-S3-LCD-1.54-demo/ESP-IDF-5.5.1/01_factory/components/esp_bsp/bsp_display.c` — confirms `esp_lcd_new_panel_st7789` driver and color inversion
4. `examples/ESP32-S3-LCD-1.54-demo/Arduino-3.2.0/examples/04_gfx_helloworld/04_gfx_helloworld.ino` — Arduino cross-confirmation (identical SHA for both touch and non-touch variants)
5. [Waveshare product listing](https://www.waveshare.com/product/esp32-s3-lcd-1.54.htm) — confirms ST7789, SPI, 240×240, dual mics, SKU 33867/33869
