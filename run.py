#!/usr/bin/env python
"""
[*] TOURNAMENTS PROJECT - MAIN ORCHESTRATOR
Start all services (Frontend, Backend, AI) with one command

Usage:
  python run.py              # Start all services
  python run.py --help       # Show help
  python run.py --list       # List available services
  python run.py --service backend  # Start only backend
"""

import sys
import argparse
from pathlib import Path
from services_manager import ServiceManager


def main():
    parser = argparse.ArgumentParser(
        description="Tournaments Project - Service Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run.py                    # Start all services
  python run.py --service backend  # Start only backend service
  python run.py --list             # List all available services
        """,
    )
    
    parser.add_argument(
        "--service",
        type=str,
        choices=["frontend", "backend", "help-chatbot", "ocr-service"],
        help="Start only a specific service",
    )
    
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all available services",
    )
    
    args = parser.parse_args()
    
    # Initialize manager
    root = Path(__file__).resolve().parent
    manager = ServiceManager(root)
    
    # List services
    if args.list:
        manager.list_services()
        return
    
    # Start specific service or all services
    import signal
    
    def signal_handler(sig, frame):
        print("\n\n[*] Stopping services...\n")
        manager.stop_all()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        if args.service:
            # Start specific service
            service = manager.get_service(args.service)
            if service:
                print("\n" + "=" * 70)
                print(f"[*] STARTING {args.service.upper()} SERVICE")
                print("=" * 70 + "\n")
                service.start()
                print(f"\n[+] {service.name} is running on port {service.port}")
                print("[!] Press Ctrl+C to stop\n")
                # Keep service running
                while True:
                    import time
                    time.sleep(1)
            else:
                print(f"[-] Service '{args.service}' not found")
                return
        else:
            # Start all services
            manager.start_all()
            # Keep services running
            while True:
                import time
                time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(None, None)


if __name__ == "__main__":
    main()
