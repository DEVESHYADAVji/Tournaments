import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("SQLALCHEMY_DATABASE_URI", "mysql+asyncmy://user:password@localhost:3306/tournaments")
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))
