AIFace Mobile CLI
=================

Small console utility to send test messages to the mobile display WebSocket server.

Requirements
------------
- Python 3.8+
- Optional: `websockets` package to actually send messages over WebSocket.

Install optional dependency:

```bash
python -m pip install websockets
```

Usage
-----

```bash
python cli.py --host 192.168.1.12 --port 8765
```

If `websockets` is not installed the tool will print the JSON message it would send.

Menu options: several emotion choices and exit.
