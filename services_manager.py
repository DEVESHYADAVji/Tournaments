"""
Microservice definitions for the Tournaments project
"""

import subprocess
import sys
import threading
from pathlib import Path
from typing import Dict, Optional, Tuple


class Service:
    """Base service class"""
    
    def __init__(self, name: str, cmd: list, cwd: Path = None):
        self.name = name
        self.cmd = cmd
        self.cwd = cwd or Path(__file__).resolve().parent
        self.process: Optional[subprocess.Popen] = None
    
    def _print_output(self) -> None:
        """Print process output in real-time"""
        if not self.process or not self.process.stdout:
            return
        
        try:
            for line in self.process.stdout:
                print(f"  [{self.name}] {line.rstrip()}")
        except Exception as e:
            print(f"  [{self.name}] Error reading output: {e}")
    
    def start(self) -> bool:
        """Start the service"""
        try:
            print(f"[*] Starting {self.name}...")
            import platform
            
            # Use shell=True on Windows for npm commands
            use_shell = platform.system() == "Windows" and "npm" in str(self.cmd)
            
            self.process = subprocess.Popen(
                " ".join(self.cmd) if use_shell else self.cmd,
                cwd=self.cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                shell=use_shell,
            )
            print(f"[+] {self.name} started (PID: {self.process.pid})")
            
            # Start thread to display output
            output_thread = threading.Thread(target=self._print_output, daemon=True)
            output_thread.start()
            
            return True
        except Exception as e:
            print(f"[-] Failed to start {self.name}: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def stop(self) -> None:
        """Stop the service"""
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
                print(f"[+] Stopped {self.name}")
            except subprocess.TimeoutExpired:
                self.process.kill()
                print(f"[+] Force stopped {self.name}")
            except Exception as e:
                print(f"[!] Error stopping {self.name}: {e}")
    
    def is_running(self) -> bool:
        """Check if service is running"""
        return self.process is not None and self.process.poll() is None


class FrontendService(Service):
    """Frontend service (React + Vite)"""
    
    def __init__(self, root: Path):
        super().__init__(
            name="Frontend (React + Vite)",
            cmd=["npm", "run", "dev"],
            cwd=root / "frontend",
        )
        self.port = 5173


class BackendService(Service):
    """Backend API service (FastAPI)"""
    
    def __init__(self, root: Path):
        super().__init__(
            name="Backend API",
            cmd=[sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
            cwd=root / "backend",
        )
        self.port = 8000


class AIService(Service):
    """AI Microservices (Help Chatbot + Image to Text OCR)"""
    
    def __init__(self, name: str, module: str, port: int, root: Path):
        # Use uvicorn as a module for proper application loading
        super().__init__(
            name=name,
            cmd=[sys.executable, "-m", "uvicorn", module, "--host", "0.0.0.0", "--port", str(port)],
            cwd=root,
        )
        self.port = port


class ServiceManager:
    """Manages all service instances"""
    
    def __init__(self, root: Path = None):
        self.root = root or Path(__file__).resolve().parent
        self.services: Dict[str, Service] = {}
        self._setup_services()
    
    def _setup_services(self) -> None:
        """Initialize all services"""
        # Frontend
        self.services["frontend"] = FrontendService(self.root)
        
        # Backend
        self.services["backend"] = BackendService(self.root)
        
        # AI Services - use module import paths for uvicorn
        self.services["help-chatbot"] = AIService(
            name="Help Chatbot (Document QA)",
            module="services.ai-helpchat.chatbot:app",
            port=8002,
            root=self.root,
        )
        
        self.services["ocr-service"] = AIService(
            name="OCR Service (Image to Text)",
            module="services.ai-imgtotext.imgtotext:app",
            port=8001,
            root=self.root,
        )
    
    def start_all(self) -> None:
        """Start all services"""
        import time
        
        print("\n" + "=" * 70)
        print("[*] STARTING ALL MICROSERVICES")
        print("=" * 70 + "\n")
        
        for name, service in self.services.items():
            service.start()
            time.sleep(1)  # Stagger startup
        
        self._print_status()
    
    def _print_status(self) -> None:
        """Print status of all services"""
        print("\n" + "=" * 70)
        print("[+] ALL SERVICES STARTED")
        print("=" * 70)
        
        print("\n[*] Running Services:")
        print("  [+] Frontend (React + Vite) -> http://localhost:5173")
        print("  [+] Backend API (FastAPI) -> http://localhost:8000")
        print("  [+] Help Chatbot (Document QA) -> http://localhost:8002")
        print("  [+] OCR Service (Image to Text) -> http://localhost:8001")
        
        print("\n[*] API Documentation:")
        print("  [+] Backend: http://localhost:8000/docs")
        print("  [+] Help Chatbot: http://localhost:8002/docs")
        print("  [+] OCR Service: http://localhost:8001/docs")
        
        print("\n[*] Configuration:")
        print("  [+] Environment: .env file")
        print("  [+] Database: MySQL on port 3306")
        print("  [+] Ollama: http://localhost:11434")
        
        print("\n[!] Press Ctrl+C to stop all services\n")
    
    def stop_all(self) -> None:
        """Stop all services"""
        for service in self.services.values():
            service.stop()
    
    def get_service(self, name: str) -> Optional[Service]:
        """Get a service by name"""
        return self.services.get(name)
    
    def list_services(self) -> None:
        """List all available services"""
        print("\n[*] Available Services:")
        for name, service in self.services.items():
            status = "[+] Running" if service.is_running() else "[-] Stopped"
            print(f"  [*] {name}: {service.name} {status}")


if __name__ == "__main__":
    import signal
    
    manager = ServiceManager()
    
    def signal_handler(sig, frame):
        print("\n\n🛑 Stopping all services...\n")
        manager.stop_all()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        manager.start_all()
        # Keep services running
        while True:
            import time
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(None, None)
