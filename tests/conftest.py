import os

os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("SQLALCHEMY_DATABASE_URI", "mysql+asyncmy://user:password@localhost:3306/tournaments")
