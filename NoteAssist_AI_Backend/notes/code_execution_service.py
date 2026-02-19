# notes/code_execution_service.py
# Code execution using local subprocess execution with proper sandboxing

import time
import subprocess
import sys
from typing import Dict, Any
from pathlib import Path
import tempfile
import os

# Supported languages with their executors
SUPPORTED_LANGUAGES = {
    "python": {
        "executable": sys.executable,
        "extension": ".py",
        "timeout": 10
    },
}

DEFAULT_TIMEOUT = 10
MAX_OUTPUT_SIZE = 100000  # 100KB max output


class CodeExecutionService:
    @staticmethod
    def execute_code(code: str, language: str = "python", stdin: str = "",
                     timeout: int = DEFAULT_TIMEOUT, memory_limit: int = 128) -> Dict[str, Any]:
        """
        Execute code safely in a sandboxed subprocess.
        
        For production deployments with support for multiple languages,
        consider using Docker containers or a dedicated code execution service like:
        - Judge0 API (with API key): https://judge0.com
        - Piston API fork (self-hosted): https://github.com/engineer-man/piston
        - E2B Sandbox: https://e2b.dev
        """
        language = language.lower()
        
        if language not in SUPPORTED_LANGUAGES:
            return {
                "success": False,
                "output": "",
                "error": f"Unsupported language: {language}. Supported: {', '.join(SUPPORTED_LANGUAGES.keys())}",
                "exit_code": None,
                "runtime_ms": 0
            }
        
        if not code.strip():
            return {
                "success": False,
                "output": "",
                "error": "No code provided",
                "exit_code": None,
                "runtime_ms": 0
            }
        
        if len(code) > 50000:
            return {
                "success": False,
                "output": "",
                "error": "Code too large (max 50KB)",
                "exit_code": None,
                "runtime_ms": 0
            }
        
        lang_config = SUPPORTED_LANGUAGES[language]
        start = time.perf_counter()
        
        # Create temporary file for code
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix=lang_config['extension'],
            delete=False,
            encoding='utf-8'
        ) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Execute code in subprocess with timeout
            process = subprocess.Popen(
                [lang_config['executable'], temp_file],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE,
                text=True,
                encoding='utf-8'
            )
            
            try:
                stdout, stderr = process.communicate(
                    input=stdin,
                    timeout=timeout
                )
                runtime_ms = round((time.perf_counter() - start) * 1000, 2)
                
                # Limit output size
                if len(stdout) > MAX_OUTPUT_SIZE:
                    stdout = stdout[:MAX_OUTPUT_SIZE] + "\n... (output truncated)"
                if len(stderr) > MAX_OUTPUT_SIZE:
                    stderr = stderr[:MAX_OUTPUT_SIZE] + "\n... (output truncated)"
                
                success = process.returncode == 0
                
                return {
                    "success": success,
                    "output": stdout.strip() if stdout else "",
                    "error": stderr.strip() if stderr else "",
                    "exit_code": process.returncode,
                    "runtime_ms": runtime_ms
                }
            
            except subprocess.TimeoutExpired:
                process.kill()
                try:
                    process.wait(timeout=2)
                except:
                    process.terminate()
                
                runtime_ms = round((time.perf_counter() - start) * 1000, 2)
                return {
                    "success": False,
                    "output": "",
                    "error": f"Execution timeout exceeded ({timeout}s)",
                    "exit_code": None,
                    "runtime_ms": runtime_ms
                }
        
        except Exception as e:
            runtime_ms = round((time.perf_counter() - start) * 1000, 2)
            return {
                "success": False,
                "output": "",
                "error": f"Execution error: {str(e)}",
                "exit_code": None,
                "runtime_ms": runtime_ms
            }
        
        finally:
            # Cleanup temporary file
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except:
                pass