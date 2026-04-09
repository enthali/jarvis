# T-3: Print the Python executable path so you can verify the active venv is used.
# Expected: path shown in Jarvis Heartbeat Output Channel points to the workspace venv.
import sys
print(f"T-3 Python executable: {sys.executable}")
print(f"T-3 Python version:    {sys.version}")
