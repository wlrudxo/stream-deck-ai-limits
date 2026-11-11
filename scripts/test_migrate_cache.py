import importlib.util
from pathlib import Path
import unittest
spec = importlib.util.spec_from_file_location('migration', Path(__file__).with_name('migrate-cache.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
class MigrationTests(unittest.TestCase):
    def test_preserves_settings_and_unrelated_actions(self):
        original = {'Actions':[{'UUID':'com.len.limits.progress','Settings':{'metric':'7d_fable_quota','layout':'ring'},'Plugin':{'UUID':'com.len.limits','Name':'old'}},{'UUID':'other.plugin','Settings':{'x':1}}]}
        result,count=m.convert(original)
        self.assertEqual(count,1)
        self.assertEqual(result['Actions'][0]['Settings'],original['Actions'][0]['Settings'])
        self.assertEqual(result['Actions'][1],original['Actions'][1])
        self.assertEqual(result['Actions'][0]['Plugin']['UUID'],m.NEW)
        self.assertEqual(original['Actions'][0]['UUID'],'com.len.limits.progress')
    def test_unknown_action_refused(self):
        with self.assertRaises(ValueError):m.convert({'UUID':'com.len.limits.future'})
    def test_idempotent(self):
        result,count=m.convert({'UUID':'com.len.limits.antigravity'})
        self.assertEqual(m.convert(result),(result,0))
if __name__=='__main__':unittest.main()
