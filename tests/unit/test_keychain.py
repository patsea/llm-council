"""The OpenRouter key is read from macOS Keychain (aloma-claude-code / openrouter), never from .env (29 Sep 2026)."""
import subprocess

from backend.keychain import read_openrouter_key, KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT


class FakeRun:
    def __init__(self, returncode=0, stdout="sk-or-test\n"):
        self.calls = []
        self.returncode = returncode
        self.stdout = stdout

    def __call__(self, args, **kwargs):
        self.calls.append((args, kwargs))
        return subprocess.CompletedProcess(args, self.returncode, stdout=self.stdout, stderr="")


def test_reads_the_named_keychain_item_and_strips_the_newline():
    run = FakeRun()
    assert read_openrouter_key(run=run) == "sk-or-test"
    args, kwargs = run.calls[0]
    assert args == ["/usr/bin/security", "find-generic-password", "-a", "openrouter", "-s", "aloma-claude-code", "-w"]
    assert kwargs.get("capture_output") is True


def test_the_item_name_is_aloma_claude_code_openrouter():
    assert (KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT) == ("aloma-claude-code", "openrouter")


def test_a_missing_item_gives_none():
    assert read_openrouter_key(run=FakeRun(returncode=44, stdout="")) is None


def test_an_empty_item_gives_none():
    assert read_openrouter_key(run=FakeRun(stdout="\n")) is None


def test_an_environment_variable_is_not_used(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "from-env")
    assert read_openrouter_key(run=FakeRun(returncode=44, stdout="")) is None


def test_config_no_longer_loads_dotenv():
    import pathlib
    src = pathlib.Path(__file__).resolve().parents[2].joinpath("backend", "config.py").read_text()
    assert "load_dotenv" not in src and 'os.getenv("OPENROUTER_API_KEY")' not in src
