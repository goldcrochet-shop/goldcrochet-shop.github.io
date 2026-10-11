"""
Gold Crochet Master E2E Test Suite Runner.
Executes Tiers 1-4 with unified reporting, performance metrics, and exit code handling.
"""

import argparse
import os
import sys
import time
import unittest
from datetime import datetime

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from tests.server import LocalServer
from tests.chrome_cdp import ChromeCDP
from tests.base_test import BaseE2ETest
from tests.tier1_features import TestTier1Features
from tests.tier2_boundaries import TestTier2Boundaries
from tests.tier3_combinations import TestTier3Combinations
from tests.tier4_scenarios import TestTier4Scenarios

class ColoredText:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"

    @classmethod
    def ok(cls, text):
        return f"{cls.GREEN}{text}{cls.RESET}"

    @classmethod
    def fail(cls, text):
        return f"{cls.RED}{text}{cls.RESET}"

    @classmethod
    def warn(cls, text):
        return f"{cls.YELLOW}{text}{cls.RESET}"

    @classmethod
    def info(cls, text):
        return f"{cls.CYAN}{text}{cls.RESET}"

    @classmethod
    def bold(cls, text):
        return f"{cls.BOLD}{text}{cls.RESET}"

class CustomTestResult(unittest.TextTestResult):
    def __init__(self, stream, descriptions, verbosity):
        super().__init__(stream, descriptions, verbosity)
        self.test_records = []
        self._test_start_time = 0

    def startTest(self, test):
        super().startTest(test)
        self._test_start_time = time.time()

    def addSuccess(self, test):
        super().addSuccess(test)
        elapsed = time.time() - self._test_start_time
        self.test_records.append((test.id(), "PASS", elapsed, None))
        if self.showAll:
            self.stream.writeln(f" {ColoredText.ok('[PASS]')} ({elapsed:.3f}s)")

    def addFailure(self, test, err):
        super().addFailure(test, err)
        elapsed = time.time() - self._test_start_time
        self.test_records.append((test.id(), "FAIL", elapsed, err))
        if self.showAll:
            self.stream.writeln(f" {ColoredText.fail('[FAIL]')} ({elapsed:.3f}s)")

    def addError(self, test, err):
        super().addError(test, err)
        elapsed = time.time() - self._test_start_time
        self.test_records.append((test.id(), "ERROR", elapsed, err))
        if self.showAll:
            self.stream.writeln(f" {ColoredText.warn('[ERROR]')} ({elapsed:.3f}s)")

def run_suite(tiers=None, failfast=False, verbose=True):
    start_total = time.time()
    
    print("\n" + "=" * 78)
    print(ColoredText.bold(ColoredText.info("  GOLD CROCHET — AUTOMATED E2E TEST SUITE (CHROME HEADLESS CDP)")))
    print("=" * 78)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Target Server: http://127.0.0.1:8088")
    print(f"CDP Remote Port: 9228")
    print("-" * 78)

    # Initialize shared server and Chrome instance
    print("Launching Local HTTP Server and Headless Google Chrome...")
    server = LocalServer(port=8088)
    server.start()
    
    cdp = ChromeCDP(port=9228)
    try:
        cdp.start()
    except Exception as e:
        server.stop()
        print(ColoredText.fail(f"FATAL: Could not initialize Chrome CDP: {e}"))
        return 1

    BaseE2ETest.server = server
    BaseE2ETest.cdp = cdp

    suite = unittest.TestSuite()
    tier_map = {
        1: (TestTier1Features, "Tier 1: Feature Structure & Render (F1-F14, 70 tests)"),
        2: (TestTier2Boundaries, "Tier 2: Boundary & Corner Conditions (F1-F14, 70 tests)"),
        3: (TestTier3Combinations, "Tier 3: Pairwise Cross-Feature Interactions (14 tests)"),
        4: (TestTier4Scenarios, "Tier 4: End-to-End Customer Journeys (7 scenarios)"),
    }

    selected_tiers = tiers or [1, 2, 3, 4]
    total_expected = 0
    for t in selected_tiers:
        if t in tier_map:
            cls, desc = tier_map[t]
            loader = unittest.TestLoader()
            s = loader.loadTestsFromTestCase(cls)
            suite.addTest(s)
            total_expected += s.countTestCases()
            print(f"  • {desc}: {ColoredText.ok(f'{s.countTestCases()} tests queued')}")

    print("-" * 78)
    print(f"Executing {total_expected} automated test cases...\n")

    runner = unittest.TextTestRunner(
        resultclass=CustomTestResult,
        verbosity=2 if verbose else 1,
        failfast=failfast,
    )
    result = runner.run(suite)

    # Clean shutdown
    print("\nClosing Chrome CDP session and terminating HTTP server...")
    cdp.close()
    server.stop()
    BaseE2ETest.cdp = None
    BaseE2ETest.server = None

    elapsed_total = time.time() - start_total

    passed = result.testsRun - len(result.failures) - len(result.errors)
    pass_rate = (passed / result.testsRun * 100) if result.testsRun > 0 else 0

    print("\n" + "=" * 78)
    print(ColoredText.bold("  TEST EXECUTION SUMMARY"))
    print("=" * 78)
    print(f"  Total Run : {result.testsRun}")
    print(f"  Passed    : {ColoredText.ok(str(passed))}")
    print(f"  Failed    : {ColoredText.fail(str(len(result.failures)))}")
    print(f"  Errors    : {ColoredText.warn(str(len(result.errors)))}")
    print(f"  Pass Rate : {pass_rate:.1f}%")
    print(f"  Duration  : {elapsed_total:.2f}s")
    print("=" * 78 + "\n")

    if result.wasSuccessful():
        print(ColoredText.ok("ALL TESTS PASSED SUCCESSFULLY!"))
        return 0
    else:
        print(ColoredText.fail(f"BASELINE RUN COMPLETED: {len(result.failures) + len(result.errors)} tests failed."))
        print(ColoredText.warn("These failures reflect baseline un-implemented features to be addressed in Milestones M1-M4."))
        return 1

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Gold Crochet E2E Test Suite")
    parser.add_argument("--tier", type=int, choices=[1, 2, 3, 4], action="append", help="Select tier(s) to run (can specify multiple)")
    parser.add_argument("--failfast", action="store_true", help="Stop on first failure")
    parser.add_argument("--quiet", action="store_true", help="Minimal output")
    args = parser.parse_args()

    exit_code = run_suite(tiers=args.tier, failfast=args.failfast, verbose=not args.quiet)
    sys.exit(exit_code)
