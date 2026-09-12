import unittest
from report_api import submit
class Reports(unittest.TestCase):
    def test_content(self):
        self.assertEqual(submit('content'), {'reason':'content','retry':True})
    def test_unknown(self):
        with self.assertRaises(ValueError): submit('unknown')
