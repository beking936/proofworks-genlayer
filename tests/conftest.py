"""Project-level pytest configuration.

Fresh clones can have an unrelated/stale `genlayer` package installed globally.
Before tests import contracts, force the pinned local GenVM SDK prepared by
`scripts/setup_genvmroot.py` to the front of sys.path and clear any already
loaded stale modules.
"""

from pathlib import Path
import sys
import pytest

ROOT = Path(__file__).resolve().parents[1]
LOCAL_SDK = ROOT / ".genvmroot" / "runners" / "py-lib-genlayer-std" / "src"
if LOCAL_SDK.exists():
    sys.path.insert(0, str(LOCAL_SDK))


def _clear_genlayer_modules() -> None:
    for name in list(sys.modules):
        if name == "genlayer" or name.startswith("genlayer."):
            del sys.modules[name]


_clear_genlayer_modules()


@pytest.fixture(autouse=True)
def _clear_stale_genlayer_modules():
    if LOCAL_SDK.exists() and str(LOCAL_SDK) not in sys.path:
        sys.path.insert(0, str(LOCAL_SDK))
    _clear_genlayer_modules()
    yield
