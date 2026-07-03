# T-4(b): Print more than 3 lines to stderr, then exit non-zero, to verify the
# bounded (last-3-lines) stderr tail in the failure toast (heartbeat-venv-autodetect CR).
# Expected: Jarvis shows an error notification with job name, step type, "exit 1",
# and only lines 3-5 below appended (the ring buffer retains the last 3 lines only,
# so lines 1-2 are dropped from the toast); the full stream (all 5 lines) is still
# visible in full in the Output Channel at debug level.
import sys

print("T-4b line 1: Traceback (most recent call last):", file=sys.stderr)
print("T-4b line 2:   File \"script.py\", line 1, in <module>", file=sys.stderr)
print("T-4b line 3:     import somepackage", file=sys.stderr)
print("T-4b line 4: ModuleNotFoundError: No module named 'somepackage'", file=sys.stderr)
print("T-4b line 5: (last stderr line before exit)", file=sys.stderr)
sys.exit(1)

