"""Offline regressions for the daily refresh / simplified directory boundary."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

R = Path(__file__).resolve().parent

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module

gate = load('refresh_contract', R/'validate_refresh_contract.py')
builder = load('simple_builder', R.parent/'.github/scripts/pages/build-directories.py')


class RefreshContractTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name); self.toys = self.root/'china-toys'; self.toys.mkdir()
        for name in ('build_ip_directory.py', 'navigation_fix.py', 'app.js', 'index.html', 'ip-directory.js', 'ip-market.json'):
            shutil.copy2(R/name, self.toys/name)
        cfg = json.loads((self.toys/'ip-market.json').read_text())
        ps = []
        for i, ip in enumerate(cfg['ips']):
            ps.append({'id': 'ip-'+str(i), 'brand': (ip.get('allowed_brands') or [cfg['requested_brands'][0]])[0],
                       'name': ip['terms'][0], 'ip': ip['name'], 'listings': []})
        for i, brand in enumerate(cfg['requested_brands']):
            ps.append({'id': 'brand-'+str(i), 'brand': brand, 'name': brand+' sample', 'listings': []})
        ps[0].update(image='images/a.png', history=[{'date': '2026-11-12', 'type': 'price', 'from': 10, 'to': 12, 'source': 'https://example.test/a'}],
                     listings=[{'source': 'Test retailer', 'source_id': 'test', 'url': 'https://example.test/a', 'variant': 'Single', 'currency': 'CNY', 'price': 12, 'checked': '2026-11-12',
                                'options': [{'name': 'Box', 'price': 60, 'currency': 'CNY', 'image': 'images/b.png'}]}])
        self.data = {'updated': '2026-11-12', 'products': ps, 'source_leads': [],
                     'sources': [{'status': 'complete', 'checked': '2026-11-12'}]}
        self.write_catalog()
        (self.toys/'images').mkdir()
        for name in ('a.png','b.png'):
            (self.toys/'images'/name).write_bytes(b'preserved test image')
        (self.toys/'chain-assortments.json').write_text('{"products":[]}')
        (self.toys/'retailer-stories-data.json').write_text('{"updates":[]}')

    def write_catalog(self):
        (self.toys/'catalog.json').write_text(json.dumps(self.data))

    def generate(self):
        return subprocess.run([sys.executable, str(self.toys/'build_ip_directory.py')], capture_output=True, text=True)

    def stage(self):
        result = self.generate(); self.assertEqual(result.returncode, 0, result.stderr)
        dest = self.root/'_site'; shutil.copytree(self.toys, dest/'china-toys')
        old_root = builder.ROOT; old_home = builder.home; old_luggage = builder.luggage
        def unused(site):
            return {'id': site.name, 'title': site.name, 'items': [{'id':'fixture','name':'fixture'}], 'news': []}
        try:
            builder.ROOT = self.root; builder.home = unused; builder.luggage = unused
            builder.build(dest)
        finally:
            builder.ROOT = old_root; builder.home = old_home; builder.luggage = old_luggage
        return dest/'china-toys'

    def test_generator_needs_no_workflow_files_and_preserves_canonical_bytes(self):
        before = (self.toys/'catalog.json').read_bytes()
        result = self.generate(); self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(before, (self.toys/'catalog.json').read_bytes())
        coverage = json.loads((self.toys/'ip-coverage.json').read_text())
        self.assertFalse(coverage['completeness_verified'])
        self.assertTrue(all(ip['records'] for ip in coverage['requested_ips']))

    def test_generator_is_idempotent(self):
        self.assertEqual(self.generate().returncode, 0)
        before = {p.name:p.read_bytes() for p in self.toys.iterdir() if p.is_file()}
        self.assertEqual(self.generate().returncode, 0)
        self.assertEqual(before, {p.name:p.read_bytes() for p in self.toys.iterdir() if p.is_file()})

    def test_invalid_ranking_still_fails(self):
        path = self.toys/'ip-market.json'; d = json.loads(path.read_text()); d['ranking']['rows'][0]['revenue'] = 0
        path.write_text(json.dumps(d)); self.assertNotEqual(self.generate().returncode, 0)

    def test_missing_requested_ip_still_fails(self):
        self.data['products'] = []; self.write_catalog()
        self.assertNotEqual(self.generate().returncode, 0)

    def test_real_directory_build_preserves_characters_offers_photos_and_raw_history(self):
        site = self.stage(); d = gate.validate_site(site, self.toys)
        self.assertEqual(json.loads((site/'catalog.json').read_text()), self.data)
        self.assertTrue(any(r.get('variant') == 'Box' and r['amount'] == 60 and r['image'] == 'images/b.png' for r in d['items']))
        self.assertFalse((site/'ip-directory.js').exists())
        self.assertIn('directory-guide.mp4', (site/'index.html').read_text())

    def test_cached_primary_photo_keeps_its_exact_source_mapping(self):
        p = self.data['products'][0]
        p['image_source'] = 'https://example.test/primary.png'
        p['listings'][0]['options'].append({'name':'Single','price':12,'currency':'CNY','image':p['image_source']})
        self.write_catalog()
        gate.validate_site(self.stage(), self.toys)

    def test_series_thumbnail_can_retain_exact_variant_photo_in_gallery(self):
        p = self.data['products'][0]
        p['image_source'] = 'https://example.test/series.png'
        p['gallery'] = ['https://example.test/primary.png']
        p['listings'][0]['options'].append({'name':'Single','price':12,'currency':'CNY','image':p['gallery'][0]})
        self.write_catalog()
        gate.validate_site(self.stage(), self.toys)

    def test_exact_variant_photo_beyond_twelfth_gallery_image_is_retained(self):
        p = self.data['products'][0]
        p['gallery'] = [f'https://example.test/gallery-{i}.png' for i in range(15)]
        p['listings'][0]['options'].append({'name':'Single','price':12,'currency':'CNY','image':p['gallery'][14]})
        self.write_catalog()
        site = self.stage()
        d = gate.validate_site(site, self.toys)
        row = next(r for r in d['items'] if r['id'] == p['id'])
        self.assertEqual([x['url'] for x in row['gallery'][:len(p['gallery'])]], p['gallery'])
        self.assertIn('images/b.png', [x['url'] for x in row['gallery']])

    def test_primary_option_photo_absent_from_series_gallery_is_retained(self):
        p = self.data['products'][0]
        p['image_source'] = 'https://example.test/series.png'
        p['listings'][0]['options'].append({'name':'Single','price':12,'currency':'CNY','image':'https://example.test/option.png'})
        self.write_catalog()
        gate.validate_site(self.stage(), self.toys)

    def test_wrong_primary_photo_source_still_fails(self):
        p = self.data['products'][0]
        p['image_source'] = 'https://example.test/wrong.png'
        p['listings'][0]['options'].append({'name':'Single','price':12,'currency':'CNY','image':'https://example.test/primary.png'})
        self.write_catalog()
        site = self.stage()
        d = gate.unpack(site); d.pop('packed')
        for row in d['items']:
            row['gallery'] = []
        (site/'directory-data.js').write_text('window.DIRECTORY='+json.dumps(d)+';\n')
        with self.assertRaisesRegex(ValueError, 'Variant photo lost'):
            gate.validate_site(site, self.toys)

    def test_stale_character_index_fails(self):
        site = self.stage(); p = self.toys/'ip-coverage.json'; d = json.loads(p.read_text()); d['catalog_date'] = '2020-01-01'; p.write_text(json.dumps(d))
        with self.assertRaisesRegex(ValueError, 'Stale IP'):
            gate.validate_site(site, self.toys)

    def test_missing_or_changed_public_variant_fails(self):
        site = self.stage(); d = gate.unpack(site)
        d.pop('packed'); d['items'] = [r for r in d['items'] if r.get('variant') != 'Box']
        (site/'directory-data.js').write_text('window.DIRECTORY='+json.dumps(d)+';\n')
        with self.assertRaisesRegex(ValueError, 'Exact offer'):
            gate.validate_site(site, self.toys)

    def test_previous_exact_price_cannot_disappear(self):
        baseline = gate.snapshot(self.toys)
        self.data['products'][0]['listings'][0]['options'][0]['price'] = 65
        self.write_catalog()
        with self.assertRaisesRegex(ValueError, 'exact-variant price'):
            gate.preservation(baseline, self.toys)
        self.data['products'][0]['history'].append({'type':'price', 'source':'https://example.test/a', 'variant':'Box', 'currency':'CNY', 'from':60, 'to':65})
        self.write_catalog()
        gate.preservation(baseline, self.toys)

    def test_multiple_losses_are_reported_without_bypassing_failure(self):
        baseline = gate.snapshot(self.toys)
        self.data['products'][0]['history'] = []
        self.data['products'][0]['listings'][0]['options'] = []
        self.write_catalog()
        with self.assertRaises(ValueError) as error:
            gate.preservation(baseline, self.toys)
        self.assertIn('historical events', str(error.exception))
        self.assertIn('variant identity', str(error.exception))
        report = json.loads(Path('/tmp/china-toys-directory-qa/preservation.json').read_text())
        self.assertFalse(report['passed'])
        self.assertGreaterEqual(len(report['issues']), 2)

    def test_unchanged_research_passes(self):
        gate.preservation(gate.snapshot(self.toys), self.toys)

    def test_history_truncation_fails(self):
        baseline = gate.snapshot(self.toys); self.data['products'][0]['history'] = []; self.write_catalog()
        with self.assertRaisesRegex(ValueError, 'historical events'):
            gate.preservation(baseline, self.toys)

    def test_disappeared_variant_fails(self):
        baseline = gate.snapshot(self.toys); self.data['products'][0]['listings'][0]['options'] = []; self.write_catalog()
        with self.assertRaisesRegex(ValueError, 'variant identity'):
            gate.preservation(baseline, self.toys)

    def test_removed_source_evidence_fails(self):
        self.data['products'][0]['details'] = {'source': 'https://example.test/spec'}; self.write_catalog()
        baseline = gate.snapshot(self.toys); del self.data['products'][0]['details']; self.write_catalog()
        with self.assertRaisesRegex(ValueError, 'source or photograph URL'):
            gate.preservation(baseline, self.toys)

    def test_overwritten_photograph_fails(self):
        baseline = gate.snapshot(self.toys); (self.toys/'images/a.png').write_bytes(b'replaced')
        with self.assertRaisesRegex(ValueError, 'media'):
            gate.preservation(baseline, self.toys)

    def test_no_completed_source_fails(self):
        baseline = gate.snapshot(self.toys); self.data['sources'][0]['status'] = 'unavailable'; self.write_catalog()
        with self.assertRaisesRegex(ValueError, 'No source completed'):
            gate.preservation(baseline, self.toys)

    def test_disappeared_record_fails_but_retained_lead_is_allowed(self):
        baseline = gate.snapshot(self.toys); p = self.data['products'].pop(); self.write_catalog()
        with self.assertRaisesRegex(ValueError, 'records'):
            gate.preservation(baseline, self.toys)
        self.data['source_leads'].append(p); self.write_catalog()
        gate.preservation(baseline, self.toys)


if __name__ == '__main__':
    unittest.main()
