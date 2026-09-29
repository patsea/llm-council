"""Read the OpenRouter API key from macOS Keychain.

The key lives in Keychain item aloma-claude-code / openrouter (moved there from .env on 29 Sep 2026).
It is never read from .env or the environment, and never logged.
"""
import subprocess

KEYCHAIN_SERVICE = "aloma-claude-code"
KEYCHAIN_ACCOUNT = "openrouter"


def read_openrouter_key(run=subprocess.run):
    """Return the key, or None when the item is missing, empty or unreadable."""
    try:
        r = run(["/usr/bin/security", "find-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", KEYCHAIN_SERVICE, "-w"],
                capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        return None
    if r.returncode != 0:
        return None
    key = (r.stdout or "").strip()
    return key or None
