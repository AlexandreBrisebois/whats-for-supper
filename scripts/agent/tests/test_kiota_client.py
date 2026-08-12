import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock


SCRIPT_PATH = Path(__file__).parents[1] / "kiota_client.py"


def load_module():
    spec = importlib.util.spec_from_file_location("kiota_client", SCRIPT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class KiotaClientTests(unittest.TestCase):
    def test_build_generate_command_uses_manifest_version_and_clean_output(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            manifest = root / ".config" / "dotnet-tools.json"
            manifest.parent.mkdir(parents=True)
            manifest.write_text(
                json.dumps(
                    {
                        "tools": {
                            "microsoft.openapi.kiota": {
                                "version": "1.34.1",
                            }
                        }
                    }
                )
            )
            nuget_root = root / "packages"
            dll = (
                nuget_root
                / "microsoft.openapi.kiota"
                / "1.34.1"
                / "tools"
                / "net10.0"
                / "any"
                / "kiota.dll"
            )
            dll.parent.mkdir(parents=True)
            dll.touch()

            command = module.build_generate_command(
                root=root,
                output_dir=root / "generated",
                nuget_root=nuget_root,
                dotnet_path="/usr/local/share/dotnet/dotnet",
            )

            self.assertEqual(command[0], "/usr/local/share/dotnet/dotnet")
            self.assertEqual(Path(command[1]), dll)
            self.assertIn("--clean-output", command)

    def test_run_command_removes_global_roll_forward_and_times_out_once(self):
        module = load_module()
        timeout = subprocess.TimeoutExpired(["dotnet", "kiota"], 45)

        with mock.patch.object(module.subprocess, "run", side_effect=timeout) as run:
            with self.assertRaises(module.HarnessTimeoutError):
                module.run_command(
                    ["dotnet", "kiota"],
                    cwd=Path("/tmp"),
                    timeout_seconds=45,
                    env={"DOTNET_ROLL_FORWARD": "Major", "PATH": "/bin"},
                    stage="Kiota generation",
                )

        self.assertEqual(run.call_count, 1)
        called_env = run.call_args.kwargs["env"]
        self.assertNotIn("DOTNET_ROLL_FORWARD", called_env)
        self.assertEqual(called_env["Update__Disabled"], "true")
        self.assertEqual(called_env["Telemetry__OptOut"], "true")

    def test_compare_generated_trees_ignores_kiota_metadata(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as left_dir, tempfile.TemporaryDirectory() as right_dir:
            left = Path(left_dir)
            right = Path(right_dir)
            (left / "api").mkdir()
            (right / "api").mkdir()
            (left / "api" / "index.ts").write_text("same")
            (right / "api" / "index.ts").write_text("same")
            (left / "kiota-lock.json").write_text("left")
            (right / "kiota-lock.json").write_text("right")

            self.assertEqual(module.compare_generated_trees(left, right), [])


if __name__ == "__main__":
    unittest.main()
