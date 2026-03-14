#!/usr/bin/env python
"""
[*] DEBUG SCRIPT - Check if all services can start

This script tests each service individually to identify startup issues.

Usage:
  python debug.py
"""

import subprocess
import sys
import time
from pathlib import Path


def test_npm():
    """Test if npm is available"""
    print("\n[*] Checking npm...")
    try:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"  [+] npm {result.stdout.strip()} found")
            return True
        else:
            print(f"  [-] npm error: {result.stderr}")
            return False
    except FileNotFoundError:
        print("  [-] npm not found. Install Node.js from https://nodejs.org/")
        return False


def test_python_packages():
    """Test if required Python packages are installed"""
    print("\n[*] Checking Python packages...")
    packages = [
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "pydantic",
        "httpx",
    ]
    
    all_ok = True
    for package in packages:
        try:
            __import__(package)
            print(f"  [+] {package} installed")
        except ImportError:
            print(f"  [-] {package} NOT installed")
            all_ok = False
    
    return all_ok


def test_database():
    """Test MySQL connection"""
    print("\n[*] Checking MySQL connection...")
    try:
        import asyncmy
        print("  [+] asyncmy installed")
        print("  [!] Note: Cannot test live connection without async context")
        print("      Make sure MySQL is running on 127.0.0.1:3306")
        return True
    except ImportError:
        print("  [-] asyncmy NOT installed")
        return False


def test_frontend_dependencies():
    """Test if frontend dependencies are installed"""
    print("\n[*] Checking frontend dependencies...")
    root = Path(__file__).resolve().parent
    node_modules = root / "frontend" / "node_modules"
    
    if node_modules.exists():
        print(f"  [+] node_modules found")
        return True
    else:
        print(f"  [-] node_modules NOT found")
        print("     Run: cd frontend && npm install")
        return False


def test_ai_dependencies():
    """Test if AI service dependencies are installed"""
    print("\n[*] Checking AI dependencies...")
    packages = ["PyPDF2", "docx"]
    all_ok = True
    
    for package in packages:
        try:
            __import__(package)
            print(f"  [+] {package} installed")
        except ImportError:
            print(f"  [-] {package} NOT installed")
            print(f"     Run: pip install {package}")
            all_ok = False
    
    return all_ok


def test_env_file():
    """Test if .env file exists and has required variables"""
    print("\n[*] Checking .env file...")
    root = Path(__file__).resolve().parent
    env_file = root / ".env"
    
    if not env_file.exists():
        print("  [-] .env file NOT found")
        print("     Create .env with required configuration")
        return False
    
    print(f"  [+] .env file exists")
    
    # Check for required variables
    with open(env_file) as f:
        content = f.read()
    
    required_vars = [
        "SQLALCHEMY_DATABASE_URI",
        "AI_CHATBOT_OLLAMA_BASE_URL",
        "VITE_API_BASE_URL",
    ]
    
    all_ok = True
    for var in required_vars:
        if var in content:
            print(f"  [+] {var} configured")
        else:
            print(f"  [-] {var} NOT configured")
            all_ok = False
    
    return all_ok


def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("[*] TOURNAMENTS PROJECT - DEBUG CHECKER")
    print("=" * 70)
    
    results = {
        "npm": test_npm(),
        "python_packages": test_python_packages(),
        "database": test_database(),
        "frontend_deps": test_frontend_dependencies(),
        "ai_deps": test_ai_dependencies(),
        "env_file": test_env_file(),
    }
    
    print("\n" + "=" * 70)
    print("[*] SUMMARY")
    print("=" * 70)
    
    all_ok = all(results.values())
    
    for check, status in results.items():
        status_str = "[+] OK" if status else "[-] FAILED"
        check_name = check.replace("_", " ").title()
        print(f"  {check_name}: {status_str}")
    
    if all_ok:
        print("\n[+] All checks passed! You can run: python run.py")
    else:
        print("\n[-] Some checks failed. Fix the issues above and try again.")
    
    print()
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
