# test_all_languages.py
# Test script to verify all supported languages work with Wandbox API
# Run: python test_all_languages.py

import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from notes.code_execution_service import CodeExecutionService, WANDBOX_COMPILERS

# Test code for each language
TEST_CASES = {
    "python": {
        "code": 'print("Hello from Python!")',
        "expected": "Hello from Python!"
    },
    "javascript": {
        "code": 'console.log("Hello from JavaScript!");',
        "expected": "Hello from JavaScript!"
    },
    "typescript": {
        "code": 'const msg: string = "Hello from TypeScript!"; console.log(msg);',
        "expected": "Hello from TypeScript!"
    },
    "java": {
        "code": '''class prog {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}''',
        "expected": "Hello from Java!"
    },
    "cpp": {
        "code": '''#include <iostream>
using namespace std;
int main() {
    cout << "Hello from C++!" << endl;
    return 0;
}''',
        "expected": "Hello from C++!"
    },
    "c": {
        "code": '''#include <stdio.h>
int main() {
    printf("Hello from C!\\n");
    return 0;
}''',
        "expected": "Hello from C!"
    },
    "csharp": {
        "code": '''using System;
class Program {
    static void Main() {
        Console.WriteLine("Hello from C#!");
    }
}''',
        "expected": "Hello from C#!"
    },
    "go": {
        "code": '''package main
import "fmt"
func main() {
    fmt.Println("Hello from Go!")
}''',
        "expected": "Hello from Go!"
    },
    "rust": {
        "code": '''fn main() {
    println!("Hello from Rust!");
}''',
        "expected": "Hello from Rust!"
    },
    "ruby": {
        "code": 'puts "Hello from Ruby!"',
        "expected": "Hello from Ruby!"
    },
    "php": {
        "code": '<?php echo "Hello from PHP!\\n"; ?>',
        "expected": "Hello from PHP!"
    },
    # NOTE: kotlin, swift, scala temporarily unavailable on Wandbox
    "r": {
        "code": 'print("Hello from R!")',
        "expected": 'Hello from R!'
    },
    "perl": {
        "code": 'print "Hello from Perl!\\n";',
        "expected": "Hello from Perl!"
    },
    "bash": {
        "code": 'echo "Hello from Bash!"',
        "expected": "Hello from Bash!"
    },
    "lua": {
        "code": 'print("Hello from Lua!")',
        "expected": "Hello from Lua!"
    },
    "sql": {
        "code": "SELECT 'Hello from SQL!' AS message;",
        "expected": "Hello from SQL!"
    },
}

def run_tests():
    """Run tests for all supported languages"""
    print("=" * 70)
    print("TESTING ALL SUPPORTED LANGUAGES (via Wandbox API)")
    print("=" * 70)
    print(f"\nSupported languages: {len(WANDBOX_COMPILERS)}")
    print(f"Test cases: {len(TEST_CASES)}\n")
    
    results = {"passed": [], "failed": []}
    
    for lang, test in TEST_CASES.items():
        print(f"\n{'-' * 50}")
        print(f"Testing: {lang.upper()}")
        print(f"{'-' * 50}")
        
        try:
            result = CodeExecutionService.execute_code(
                code=test["code"],
                language=lang,
                timeout=30  # Give more time for compiled languages
            )
            
            output = result.get("output", "").strip()
            error = result.get("error", "")
            success = result.get("success", False)
            runtime = result.get("runtime_ms", 0)
            
            # Check if expected output is in the result
            expected = test["expected"]
            passed = success and expected in output
            
            if passed:
                print(f"[PASS] ({runtime}ms)")
                print(f"   Output: {output[:100]}{'...' if len(output) > 100 else ''}")
                results["passed"].append(lang)
            else:
                print(f"[FAIL]")
                print(f"   Success: {success}")
                print(f"   Expected: {expected}")
                print(f"   Got output: {output[:200] if output else '(empty)'}")
                if error:
                    print(f"   Error: {error[:200]}")
                results["failed"].append((lang, error or "Output mismatch"))
                
        except Exception as e:
            print(f"[EXCEPTION]: {str(e)}")
            results["failed"].append((lang, str(e)))
    
    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"\nPassed: {len(results['passed'])}/{len(TEST_CASES)}")
    print(f"Failed: {len(results['failed'])}/{len(TEST_CASES)}")
    
    if results["passed"]:
        print(f"\nPassing languages: {', '.join(results['passed'])}")
    
    if results["failed"]:
        print(f"\nFailed languages:")
        for lang, error in results["failed"]:
            print(f"  - {lang}: {error[:80]}")
    
    print("\n" + "=" * 70)
    
    return len(results["failed"]) == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)