"""Ensure every workflow that writes main participates in the same lock."""
from pathlib import Path
import re
import unittest

WORKFLOWS = Path(__file__).resolve().parents[1] / "workflows"


class WriterWorkflowTests(unittest.TestCase):
    def test_writers_use_shared_lock_fresh_main_and_safe_push(self):
        writers = []
        for path in WORKFLOWS.glob("*.yml"):
            text = path.read_text()
            if not re.search(r"git push|bash \.github/scripts/push-generated\.sh", text):
                continue
            writers.append(path.name)
            with self.subTest(workflow=path.name):
                self.assertIn("concurrency:\n  group: china-toys-generated-writers\n  cancel-in-progress: false", text)
                self.assertIn("uses: actions/checkout@v4\n        with:\n          ref: main\n          fetch-depth: 0", text)
                self.assertIn("bash .github/scripts/push-generated.sh", text)
                self.assertNotIn("git push", text)
                self.assertNotIn("git pull", text)
                self.assertNotIn("pull_request:", text)
        self.assertEqual(len(writers), 9)

    def test_schedules_are_preserved(self):
        self.assertIn("cron: '30 0 * * 1'", (WORKFLOWS / "china-toys-refresh.yml").read_text())
        self.assertIn('cron: "15 1 * * *"', (WORKFLOWS / "publish.yml").read_text())


if __name__ == "__main__":
    unittest.main()
