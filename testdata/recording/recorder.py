"""
Mock recorder for Jarvis UAT.
Simulates recorder.py behaviour without capturing audio.
Polls for .stop sentinel and exits cleanly.
"""
import argparse
import os
import sys
import time

parser = argparse.ArgumentParser(description="Mock Whisper recorder for Jarvis UAT")
parser.add_argument("--project", required=True, help="Project name being recorded")
parser.add_argument("--output", required=True, help="Output directory for audio chunks")
args = parser.parse_args()

whisper_path = os.path.dirname(os.path.abspath(__file__))
stop_file = os.path.join(whisper_path, ".stop")

print(f"[mock-recorder] started for project={args.project}", flush=True)
print(f"[mock-recorder] output={args.output}", flush=True)
print(f"[mock-recorder] polling for {stop_file}", flush=True)

while not os.path.exists(stop_file):
    time.sleep(0.5)

print("[mock-recorder] .stop detected, exiting cleanly", flush=True)
sys.exit(0)
