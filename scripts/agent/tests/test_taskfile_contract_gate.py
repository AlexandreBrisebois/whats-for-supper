import unittest
from pathlib import Path

import yaml


class TaskfileContractGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(__file__).resolve().parents[3]
        cls.taskfile = yaml.safe_load((root / "Taskfile.yml").read_text())

    def test_review_contracts_reconciles_spec_mock_and_api_routes(self):
        commands = self.taskfile["tasks"]["review:contracts"]["cmds"]

        self.assertIn({"task": "agent:reconcile"}, commands)


if __name__ == "__main__":
    unittest.main()
