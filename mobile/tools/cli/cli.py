#!/usr/bin/env python3
"""
Simple CLI to send test messages to the mobile display WebSocket server.
Supports the new 'Living Agent' emotional set.

Usage:
  python cli.py --host <mobile_ip> --port 8765
"""
import argparse
import asyncio
import json
import time
import sys

try:
    import websockets
    HAS_WS = True
except Exception:
    HAS_WS = False

EMOTIONS = [
    ("neutral",  "😐"),
    ("calm",     "😌"),
    ("happy",    "😊"),
    ("amused",   "😄"),
    ("nervous",  "😰"),
    ("sad",      "😢"),
    ("angry",    "😠"),
]

# Per-emotion config: mood name, intensity, mouth shape params
EMOTION_CONFIG = {
    "neutral": {"mood": "neutral", "intensity": 0.0, "mouth_type": "line"},
    "calm":    {"mood": "calm",    "intensity": 0.5, "mouth_type": "arc", "mouth_w": 40, "mouth_h": 10, "mouth_sweep":  180},
    "happy":   {"mood": "happy",   "intensity": 0.8, "mouth_type": "arc", "mouth_w": 60, "mouth_h": 40, "mouth_sweep":  180},
    "amused":  {"mood": "amused",  "intensity": 1.0, "mouth_type": "arc", "mouth_w": 70, "mouth_h": 50, "mouth_sweep":  180},
    "nervous": {"mood": "nervous", "intensity": 0.7, "mouth_type": "arc", "mouth_w": 40, "mouth_h": 15, "mouth_sweep": -180},
    "sad":     {"mood": "sad",     "intensity": 0.8, "mouth_type": "arc", "mouth_w": 45, "mouth_h": 25, "mouth_sweep": -180},
    "angry":   {"mood": "angry",   "intensity": 1.0, "mouth_type": "arc", "mouth_w": 55, "mouth_h": 35, "mouth_sweep": -180},
}


def _build_mouth(emotion: str) -> dict:
    cfg = EMOTION_CONFIG.get(emotion, EMOTION_CONFIG["neutral"])
    if cfg["mouth_type"] == "line":
        return {
            "id": "mouth", "type": "line",
            "transform": {"x": 0.0, "y": 35.0, "rotation": 0.0},
            "style": {"stroke": "#000000", "strokeWidth": 4.0, "opacity": 1.0},
            "props": {"x1": -25, "y1": 0, "x2": 25, "y2": 0,
                      "width": 50, "height": 0, "startAngle": 0, "sweepAngle": 0},
        }
    return {
        "id": "mouth", "type": "arc",
        "transform": {"x": 0.0, "y": 35.0, "rotation": 0.0},
        "style": {"stroke": "#000000", "strokeWidth": 4.0, "opacity": 1.0},
        "props": {"x1": -25, "y1": 0, "x2": 25, "y2": 0,
                  "width": cfg["mouth_w"], "height": cfg["mouth_h"],
                  "startAngle": 0, "sweepAngle": cfg["mouth_sweep"]},
    }


def build_scene(emotion: str) -> dict:
    """Build a full set_scene frame for the given emotion."""
    cfg = EMOTION_CONFIG.get(emotion, EMOTION_CONFIG["neutral"])
    shapes = [
        {
            "id": "background",
            "type": "rect",
            "transform": {"x": 0.0, "y": 0.0, "rotation": 0.0},
            "style": {"fill": "#FFFFFF", "stroke": "#FFFFFF", "strokeWidth": 0.0, "opacity": 1.0},
            "props": {"width": 200, "height": 200, "x1": 0, "y1": 0, "x2": 0, "y2": 0, "startAngle": 0, "sweepAngle": 360},
        },
        {
            "id": "face_base",
            "type": "circle",
            "transform": {"x": 0.0, "y": 0.0, "rotation": 0.0},
            "style": {"fill": "#FFD8B0", "stroke": "#FFD8B0", "strokeWidth": 0.0, "opacity": 1.0},
            "props": {"radius": 90, "width": 0, "height": 0, "x1": 0, "y1": 0, "x2": 0, "y2": 0, "startAngle": 0, "sweepAngle": 360},
        },
        {
            "id": "left_eye",
            "type": "circle",
            "transform": {"x": -30.0, "y": -20.0, "rotation": 0.0},
            "style": {"fill": "#000000", "stroke": "#000000", "strokeWidth": 1.0, "opacity": 1.0},
            "props": {"radius": 8, "width": 0, "height": 0, "x1": 0, "y1": 0, "x2": 0, "y2": 0, "startAngle": 0, "sweepAngle": 360},
        },
        {
            "id": "right_eye",
            "type": "circle",
            "transform": {"x": 30.0, "y": -20.0, "rotation": 0.0},
            "style": {"fill": "#000000", "stroke": "#000000", "strokeWidth": 1.0, "opacity": 1.0},
            "props": {"radius": 8, "width": 0, "height": 0, "x1": 0, "y1": 0, "x2": 0, "y2": 0, "startAngle": 0, "sweepAngle": 360},
        },
        {
            "id": "left_brow",
            "type": "line",
            "transform": {"x": 0.0, "y": 0.0, "rotation": 0.0},
            "style": {"stroke": "#000000", "strokeWidth": 4.0, "opacity": 1.0},
            "props": {"x1": -40, "y1": -38, "x2": -15, "y2": -38, "width": 0, "height": 0, "startAngle": 0, "sweepAngle": 0},
        },
        {
            "id": "right_brow",
            "type": "line",
            "transform": {"x": 0.0, "y": 0.0, "rotation": 0.0},
            "style": {"stroke": "#000000", "strokeWidth": 4.0, "opacity": 1.0},
            "props": {"x1": 15, "y1": -38, "x2": 40, "y2": -38, "width": 0, "height": 0, "startAngle": 0, "sweepAngle": 0},
        },
        _build_mouth(emotion),
    ]
    return {
        "schema": "ai-face.v1",
        "type": "set_scene",
        "ts": int(time.time() * 1000),
        "payload": {
            "scene": shapes,
            "mood": cfg["mood"],
            "intensity": cfg["intensity"],
        },
    }


async def send_ws(uri: str, message: dict):
    try:
        async with websockets.connect(
            uri,
            open_timeout=2.0,
            close_timeout=0.2,
            ping_interval=None,
        ) as ws:
            await ws.send(json.dumps(message))
            print("Sent:", json.dumps(message))
            try:
                resp = await asyncio.wait_for(ws.recv(), timeout=0.25)
                print("Response:", resp)
            except asyncio.TimeoutError:
                pass
    except Exception as e:
        print("WebSocket error:", e)


def print_menu():
    print("\nAIFace ESP32 Test CLI")
    print("Select an emotion to send to the mobile display:")
    for i, (name, emoji) in enumerate(EMOTIONS, start=1):
        print(f"  {i}. {name} {emoji}")
    print("  0. Exit")


def run_cli(host: str, port: int):
    uri = f"ws://{host}:{port}/"
    loop = asyncio.get_event_loop()

    if not HAS_WS:
        print("(websockets not installed — will print JSON only)")

    while True:
        print_menu()
        try:
            choice = input("Choice: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            return

        if not choice.isdigit():
            print("Please enter a number.")
            continue

        idx = int(choice)
        if idx == 0:
            return
        if 1 <= idx <= len(EMOTIONS):
            emotion = EMOTIONS[idx - 1][0]
            cfg = EMOTION_CONFIG.get(emotion, EMOTION_CONFIG["neutral"])
            print(f"Setting emotion: {emotion} (mood={cfg['mood']}, intensity={cfg['intensity']})")
            msg = build_scene(emotion)
            if HAS_WS:
                loop.run_until_complete(send_ws(uri, msg))
            else:
                print("websockets package not available — showing JSON:")
                print(json.dumps(msg, indent=2))
        else:
            print("Unknown choice")


def main():
    p = argparse.ArgumentParser(description="AIFace Mobile test CLI")
    p.add_argument("--host", default="127.0.0.1", help="mobile host IP")
    p.add_argument("--port", default=8765, type=int, help="mobile websocket port")
    args = p.parse_args()

    run_cli(args.host, args.port)


if __name__ == "__main__":
    main()
