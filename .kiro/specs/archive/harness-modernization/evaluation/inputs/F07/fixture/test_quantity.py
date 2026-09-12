import unittest
from quantity import quantity
class Quantity(unittest.TestCase):
    def test_triples(self): self.assertEqual(quantity(2),6)
