"""Isolate temporary Git repositories from caller hooks and user config."""
import os
import unittest
from unittest.mock import patch


class IsolatedGitTestCase(unittest.TestCase):
    def setUp(self):
        # Hooks export repository-local Git variables. Fixture repositories must
        # also be independent of the developer's signing and hook configuration.
        environment = {key: value for key, value in os.environ.items()
                       if not key.startswith("GIT_")}
        environment.update(GIT_CONFIG_GLOBAL=os.devnull, GIT_CONFIG_NOSYSTEM="1")
        isolated = patch.dict(os.environ, environment, clear=True)
        isolated.start()
        self.addCleanup(isolated.stop)

