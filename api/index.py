import sys
import os

# Add both project root and backend/ to sys.path
# so "from app.xxx" imports in backend/app/*.py resolve correctly
_root = os.path.join(os.path.dirname(__file__), "..")
_backend = os.path.join(_root, "backend")
for p in [_root, _backend]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.main import app  # noqa: E402
