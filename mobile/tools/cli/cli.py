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
    ("neutral", "😐"),
    ("calm", "😌"),
    ("happy", "😊"),
    ("amused", "😄"),
    ("nervous", "😰"),
    ("sad", "😢"),
    ("angry", "😠"),
]


def _make_update_mutation(id: str, shape: dict):
    return {"op": "update", "id": id, "shape": shape}


def _base_mouth_shape(x1=-25, y1=0, x2=25, y2=0, rotation=0.0):
    return {
        "id": "mouth",
        "type": "line",
        "transform": {"x": 0.0, "y": 35.0, "rotation": rotation},
        "style": {"stroke": "#000000", "strokeWidth": 4.0, "opacity": 1.0},
        "props": {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "width": 50, "height": 20, "startAngle": 0, "sweepAngle": 180},
    }


def _base_brow_shape(id: str, x1: int, y1: int, x2: int, y2: int, rotation: float = 0.0):
    return {
        "id": id,
        "type": "line",
        "transform": {"x": 0.0, "y": 0.0, "rotation": rotation},
        "style": {"stroke": "#000000", "strokeWidth": 4.0, "opacity": 1.0},
        "props": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
    }


def _base_arc_shape(width: int, height: int, startAngle: float, sweepAngle: float, rotation: float = 0.0):
    return {
        "id": "mouth",
        "type": "arc",
        "transform": {"x": 0.0, "y": 35.0, "rotation": rotation},
        "style": {"stroke": "#000000", "strokeWidth": 4.0, "opacity": 1.0},
        "props": {"width": width, "height": height, "startAngle": startAngle, "sweepAngle": sweepAngle, "x1": -25, "y1": 0, "x2": 25, "y2": 0},
    }


def get_mutations_for_emotion(emotion: str):
    if emotion == "neutral":
        mouth = _base_mouth_shape()
        left = _base_brow_shape("left_brow", -40, -35, -15, -35)
        right = _base_brow_shape("right_brow", 15, -35, 40, -35)
        return [_make_update_mutation("mouth", mouth), _make_update_mutation("left_brow", left), _make_update_mutation("right_brow", right)]

    if emotion == "calm":
        mouth = _base_arc_shape(width=40, height=10, startAngle=0, sweepAngle=180)
        left = _base_brow_shape("left_brow", -40, -44, -15, -44)
        right = _base_brow_shape("right_brow", 15, -44, 40, -44)
        return [_make_update_mutation("mouth", mouth), _make_update_mutation("left_brow", left), _make_update_mutation("right_brow", right)]

    if emotion == "happy":
        mouth = _base_arc_shape(width=60, height=40, startAngle=0, sweepAngle=180)
        left = _base_brow_shape("left_brow", -40, -44, -15, -44)
        right = _base_brow_shape("right_brow", 15, -44, 40, -44)
        return [_make_update_mutation("mouth", mouth), _make_update_mutation("left_brow", left), _make_update_mutation("right_brow", right)]

    if emotion == "amused":
        mouth = _base_arc_shape(width=70, height=50, startAngle=0, sweepAngle=180)
        left = _base_brow_shape("left_brow", -40, -44, -15, -44)
        right = _base_brow_shape("right_brow", 15, -44, 40, -44)
        return [_make_update_mutation("mouth", mouth), _make_update_mutation("left_brow", left), _make_update_mutation("right_brow", right)]

    if emotion == "nervous":
        mouth = _base_arc_shape(width=40, height=15, startAngle=0, sweepAngle=-180)
        left = _base_brow_shape("left_brow", -40, -38, -15, -38, rotation=-15.0)
        right = _base_brow_shape("right_brow", 15, -38, 40, -38, rotation=15.0)
        return [_make_update_mutation("mouth", mouth), _make_update_mutation("left_brow", left), _make_update_mutation("right_brow", right)]

    if emotion == "sad":
        mouth = _base_arc_shape(width=45, height=25, startAngle=0, sweepAngle=-180)
        left = _base_brow_shape("left_brow", -40, -38, -15, -38, rotation=-15.0)
        right = _base_brow_shape("right_brow", 15, -38, 40, -38, rotation=15.0)
        return [_make_update_mutation("mouth", mouth), _make_update_mutation("left_brow", left), _make_update_mutation("right_brow", right)]

    if emotion == "angry":
        mouth = _base_arc_shape(width=55, height=35, startAngle=0, sweepAngle=-180)
        left = _base_brow_shape("left_brow", -40, -38, -15, -38, rotation=15.0)
        right = _base_brow_shape("right_brow", 15, -38, 40, -38, rotation=-15.0)
        return [_make_update_mutation("mouth", mouth), _make_update_mutation("left_brow", left), _make_update_mutation("right_brow", right)]

    # Final fallback (Neutral)
    mouth = _base_mouth_shape()
    left = _base_brow_shape("left_brow", -40, -35, -15, -35)
    right = _base_brow_shape("right_brow", 15, -35, 40, -35)
    return [_make_update_mutation("mouth", mouth), _make_update_mutation("left_brow", left), _make_update_mutation("right_brow", right)]


def build_message(emotion: str):
    mutations = get_mutations_for_emotion(emotion)
    return {
        "schema": "ai-face.v1",
        "type": "apply_mutations",
        "ts": int(time.time() * 1000),
        "payload": {"mutations": mutations},
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
    print("\nAIFace Mobile Test CLI (Living Agent Edition)")
    print("Select an emotion to send to the mobile display:")
    for i, (name, emoji) in enumerate(EMOTIONS, start=1):
        print(f"  {i}. {name} {emoji}")
    print("  0. Exit")


def run_cli(host: str, port: int):
    uri = f"ws://{host}:{port}/"
    loop = asyncio.get_event_loop()

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
            msg = build_message(emotion)
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
