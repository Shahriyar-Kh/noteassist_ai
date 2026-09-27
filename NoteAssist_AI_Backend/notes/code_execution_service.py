# notes/code_execution_service.py
# Code execution using Wandbox API for multi-language support
# Wandbox: https://wandbox.org (free public API, no key required)

import time
import requests
import re
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

# Wandbox API endpoint (free, no key required)
WANDBOX_API_URL = "https://wandbox.org/api/compile.json"

# Wandbox compiler mappings (updated Feb 2026)
# Format: language -> compiler_name
WANDBOX_COMPILERS = {
    "python": "cpython-3.12.7",
    "javascript": "nodejs-20.17.0",
    "typescript": "typescript-5.6.2",
    "java": "openjdk-jdk-22+36",
    "cpp": "gcc-head",
    "c": "gcc-head-c",
    "csharp": "mono-6.12.0.199",
    "go": "go-1.23.2",
    "rust": "rust-1.82.0",
    "ruby": "ruby-3.4.1",
    "php": "php-8.3.12",
    "perl": "perl-5.42.0",
    "bash": "bash",
    "lua": "lua-5.4.7",
    "r": "r-4.4.1",
    "sql": "sqlite-3.46.1",
}

# NOTE: Kotlin, Swift, Scala are temporarily unavailable on Wandbox

# Some compilers need special source handling
WANDBOX_COMPILE_OPTIONS = {
    "cpp": {"options": "warning,c++20"},
    "c": {"options": "warning,c17"},
    "java": {},
    "csharp": {},
}

DEFAULT_TIMEOUT = 15
MAX_OUTPUT_SIZE = 100000  # 100KB max output


def preprocess_java_code(code: str) -> str:
    """
    Preprocess Java code to work with Wandbox.
    Wandbox uses 'prog.java' as the filename, so public classes must be renamed.
    
    - 'public class Main' -> 'class prog'
    - 'public class <AnyName>' -> 'class prog'
    - 'class <AnyName>' (non-public) -> 'class prog'
    """
    # Pattern to match public class declaration
    # Matches: public class ClassName { or public class ClassName{
    public_class_pattern = r'\bpublic\s+class\s+\w+\s*(\{|extends|implements)'
    
    # Pattern to match any class declaration (for the main class)
    # Only match the main/first class, not inner classes
    class_pattern = r'^(\s*)(?:public\s+)?class\s+\w+(\s*(?:\{|extends|implements))'
    
    # Check if there's a public class (must match filename)
    if re.search(public_class_pattern, code):
        # Replace 'public class <Name>' with 'class prog'
        code = re.sub(
            r'\bpublic\s+class\s+\w+(\s*(?:\{|extends|implements))',
            r'class prog\1',
            code,
            count=1  # Only replace the first occurrence (main class)
        )
    else:
        # Replace first 'class <Name>' with 'class prog'
        code = re.sub(
            class_pattern,
            r'\1class prog\2',
            code,
            count=1,
            flags=re.MULTILINE
        )
    
    return code


class CodeExecutionService:
    
    @staticmethod
    def execute_with_wandbox(code: str, language: str, stdin: str = "",
                              timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        """Execute code using Wandbox API (free, no key required)"""
        
        if language not in WANDBOX_COMPILERS:
            return {
                "success": False,
                "output": "",
                "error": f"Language '{language}' not supported",
                "exit_code": None,
                "runtime_ms": 0
            }
        
        # Preprocess Java code (Wandbox uses prog.java, so class must be named 'prog')
        if language == "java":
            code = preprocess_java_code(code)
            logger.debug(f"Preprocessed Java code for Wandbox")
        
        compiler = WANDBOX_COMPILERS[language]
        
        payload = {
            "code": code,
            "compiler": compiler,
            "stdin": stdin,
        }
        
        # Add compile options if needed
        if language in WANDBOX_COMPILE_OPTIONS:
            payload.update(WANDBOX_COMPILE_OPTIONS[language])
        
        start = time.perf_counter()
        
        try:
            response = requests.post(
                WANDBOX_API_URL,
                json=payload,
                timeout=timeout + 15,  # Add buffer for compile time
                headers={
                    "Content-Type": "application/json",
                }
            )
            
            runtime_ms = round((time.perf_counter() - start) * 1000, 2)
            
            if response.status_code != 200:
                logger.error(f"Wandbox API error: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "output": "",
                    "error": f"Code execution service error (status {response.status_code})",
                    "exit_code": None,
                    "runtime_ms": runtime_ms
                }
            
            result = response.json()
            
            # Get outputs
            program_output = result.get("program_output", "") or ""
            program_error = result.get("program_error", "") or ""
            compiler_error = result.get("compiler_error", "") or ""
            status = result.get("status", "0")
            signal = result.get("signal", "")
            
            # Determine success
            success = status == "0" and not compiler_error and not signal
            
            # Build error message
            error = ""
            if compiler_error:
                error = f"Compilation Error:\n{compiler_error}"
            elif program_error:
                error = program_error
            elif signal:
                error = f"Program terminated with signal: {signal}"
            elif status != "0":
                error = f"Program exited with code: {status}"
            
            # Limit output
            output = program_output.strip()
            if len(output) > MAX_OUTPUT_SIZE:
                output = output[:MAX_OUTPUT_SIZE] + "\n... (output truncated)"
            
            return {
                "success": success,
                "output": output,
                "error": error.strip() if error else "",
                "exit_code": int(status) if status.isdigit() else 1,
                "runtime_ms": runtime_ms
            }
            
        except requests.Timeout:
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
            logger.error(f"Wandbox API error: {e}")
            return {
                "success": False,
                "output": "",
                "error": f"Execution error: {str(e)}",
                "exit_code": None,
                "runtime_ms": runtime_ms
            }

    @staticmethod
    def execute_code(code: str, language: str = "python", stdin: str = "",
                     timeout: int = DEFAULT_TIMEOUT, memory_limit: int = 128) -> Dict[str, Any]:
        """
        Execute code using Wandbox API (free, no registration required).
        Returns an error when the external service is unavailable.
        
        Supported languages:
        - Python, JavaScript, TypeScript, Java, C++, C, C#
        - Go, Rust, Ruby, PHP, Kotlin, Swift, Scala
        - R, Perl, Bash, Lua, SQL
        """
        language = language.lower()
        
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
        
        # Check if language is supported
        all_supported = set(WANDBOX_COMPILERS)
        if language not in all_supported:
            return {
                "success": False,
                "output": "",
                "error": f"Unsupported language: {language}. Supported: {', '.join(sorted(all_supported))}",
                "exit_code": None,
                "runtime_ms": 0
            }
        
        # Try Wandbox API first
        if language in WANDBOX_COMPILERS:
            logger.info(f"Executing {language} code via Wandbox API")
            result = CodeExecutionService.execute_with_wandbox(code, language, stdin, timeout)
            
            return result
        
        return {
            "success": False,
            "output": "",
            "error": f"No execution method available for: {language}",
            "exit_code": None,
            "runtime_ms": 0
        }