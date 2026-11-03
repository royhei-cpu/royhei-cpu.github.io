"""Offline regression tests for the generated-output save helper."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("push-generated.sh").resolve()
GIT = shutil.which("git")


class PushGeneratedTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.remote = self.root / "remote.git"
        self.local = self.root / "local"
        self.other = self.root / "other"
        self.git(self.root, "init", "--bare", "--initial-branch=main", str(self.remote))
        self.git(self.root, "clone", str(self.remote), str(self.local))
        self.configure(self.local)
        self.commit(self.local, "catalog", "base")
        self.git(self.local, "push", "origin", "main")
        self.git(self.root, "clone", str(self.remote), str(self.other))
        self.configure(self.other)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        # Avoid delays; all remote operations remain local filesystem git operations.
        (self.bin / "sleep").write_text("#!/bin/sh\nexit 0\n")
        (self.bin / "sleep").chmod(0o755)
        self.env = dict(os.environ, PATH=str(self.bin) + os.pathsep + os.environ["PATH"])

    def git(self, cwd, *args):
        return subprocess.check_output([GIT, *args], cwd=cwd, stderr=subprocess.STDOUT, text=True).strip()

    def configure(self, cwd):
        self.git(cwd, "config", "user.name", "Test")
        self.git(cwd, "config", "user.email", "test@example.com")

    def commit(self, cwd, filename, content):
        (cwd / filename).write_text(content)
        self.git(cwd, "add", filename)
        self.git(cwd, "commit", "-m", content)

    def run_helper(self):
        return subprocess.run(["bash", "-e", str(SCRIPT)], cwd=self.local, env=self.env,
                              text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

    def wrap_git(self, body):
        wrapper = self.bin / "git"
        wrapper.write_text("#!/bin/bash\n" + body + '\nexec "' + GIT + '" "$@"\n')
        wrapper.chmod(0o755)

    def test_normal_push(self):
        self.commit(self.local, "catalog", "generated")
        self.assertEqual(self.run_helper().returncode, 0)
        self.assertEqual(self.git(self.local, "rev-parse", "HEAD"),
                         self.git(self.root, "--git-dir=" + str(self.remote), "rev-parse", "main"))

    def test_nonconflicting_remote_change_is_preserved(self):
        self.commit(self.local, "catalog", "generated")
        self.commit(self.other, "unrelated", "keep")
        self.git(self.other, "push", "origin", "main")
        self.assertEqual(self.run_helper().returncode, 0)
        self.assertEqual((self.local / "unrelated").read_text(), "keep")

    def test_conflict_aborts_without_changing_remote(self):
        self.commit(self.local, "catalog", "generated")
        head = self.git(self.local, "rev-parse", "HEAD")
        self.commit(self.other, "catalog", "remote")
        self.git(self.other, "push", "origin", "main")
        remote_head = self.git(self.other, "rev-parse", "HEAD")
        result = self.run_helper()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("No push attempted", result.stdout)
        self.assertEqual(self.git(self.local, "rev-parse", "HEAD"), head)
        self.assertFalse((self.local / ".git/rebase-merge").exists())
        self.assertEqual(self.git(self.root, "--git-dir=" + str(self.remote), "rev-parse", "main"), remote_head)

    def test_autostash_conflict_refuses_push(self):
        self.commit(self.local, "output", "generated")
        (self.local / "catalog").write_text("unstaged generated data")
        self.commit(self.other, "catalog", "remote data")
        self.git(self.other, "push", "origin", "main")
        remote_head = self.git(self.other, "rev-parse", "HEAD")
        result = self.run_helper()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("refusing to push", result.stdout)
        self.assertEqual(self.git(self.root, "--git-dir=" + str(self.remote), "rev-parse", "main"), remote_head)

    def test_transient_fetch_failure_retries_under_bash_e(self):
        self.commit(self.local, "catalog", "generated")
        flag = self.root / "fetch-failed"
        self.wrap_git(f'if [ "$1" = fetch ] && [ ! -f "{flag}" ]; then touch "{flag}"; exit 1; fi')
        self.assertEqual(self.run_helper().returncode, 0)
        self.assertTrue(flag.exists())

    def test_push_race_retries_and_preserves_other_change(self):
        self.commit(self.local, "catalog", "generated")
        self.commit(self.other, "unrelated", "race")
        flag = self.root / "raced"
        self.wrap_git(f'if [ "$1" = push ] && [ ! -f "{flag}" ]; then touch "{flag}"; "{GIT}" -C "{self.other}" push origin main; fi')
        self.assertEqual(self.run_helper().returncode, 0)
        self.assertEqual((self.local / "unrelated").read_text(), "race")

    def test_persistent_failure_stops_after_three_attempts(self):
        count = self.root / "attempts"
        self.wrap_git(f'if [ "$1" = fetch ]; then echo attempt >> "{count}"; exit 1; fi')
        result = self.run_helper()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(len(count.read_text().splitlines()), 3)
        self.assertIn("after three attempts", result.stdout)


if __name__ == "__main__":
    unittest.main()
