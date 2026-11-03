"""Offline regression coverage for the final supplemental catalog export."""
from collections import Counter
import csv
import json
from pathlib import Path
import tempfile
import unittest

import apply_chain_coverage as coverage


class FinalReportTests(unittest.TestCase):
    def test_supplement_exports_consistent_counts_and_preserves_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            product = {'id': 'original', 'brand': 'MINISO', 'name': 'Original',
                       'category': 'Squishy', 'image': 'images/original.jpg',
                       'listings': [{'url': 'https://example.test/original', 'price': 0}]}
            data = {'updated': '2026-11-02', 'last_full_collection': '2026-11-02',
                    'detail_reviewed': '2026-11-01', 'products': [product],
                    'brands': {'MINISO': 1}, 'sources': [],
                    'brand_checklist': [{'brand': 'MINISO', 'records': 1}],
                    'stats': {'products': 1, 'image_research_queue': 3}}
            (root/'catalog.json').write_text(json.dumps(data))
            (root/'report.json').write_text(json.dumps({'custom_audit': 'preserve'}))
            (root/'review-report.json').write_text(json.dumps({'visual_sample_ids': ['original'], 'visual_scope': 'limited'}))
            (root/'index.html').write_text('<script src="catalog.js?v=old"></script>')
            with (root/'catalog.csv').open('w', newline='') as stream:
                writer = csv.DictWriter(stream, fieldnames=['id', 'name', 'product_url'])
                writer.writeheader()
                writer.writerow({'id': product['id'], 'name': product['name'], 'product_url': product['listings'][0]['url']})
            result = coverage.write(root)
            supplement = json.loads((coverage.ROOT/'chain-coverage.json').read_text())
            expected = [product] + supplement['products']
            total = len(expected)
            self.assertEqual(result['stats']['products'], total)
            self.assertEqual(result['brands'], dict(Counter(p['brand'] for p in expected)))
            self.assertEqual(result['stats']['with_source_prices'], sum(any(l.get('price') is not None for l in p.get('listings', [])) for p in expected))
            self.assertEqual(result['stats']['with_shop_descriptions'], sum(bool(p.get('details', {}).get('description')) for p in expected))
            self.assertEqual(result['stats']['source_linked_images'], sum(bool(p.get('image_review', {}).get('source_match')) for p in expected))
            self.assertEqual(result['stats']['image_research_queue'], 3)
            self.assertEqual(result['products'][0], product)
            self.assertEqual(result['products'][1:], supplement['products'])
            report = json.loads((root/'report.json').read_text())
            review = json.loads((root/'review-report.json').read_text())
            for key in ('updated', 'last_full_collection', 'detail_reviewed', 'stats', 'brands', 'sources'):
                self.assertEqual(report[key], result[key])
            self.assertEqual(report['custom_audit'], 'preserve')
            self.assertEqual(review['stats'], result['stats'])
            self.assertEqual(review['checklist'], result['brand_checklist'])
            self.assertEqual(review['checklist'][0]['records'], sum(p['brand']=='MINISO' for p in expected))
            self.assertEqual(review['visual_sample_ids'], ['original'])
            self.assertEqual(review['visual_scope'], 'limited')
            js = (root/'catalog.js').read_text()
            self.assertEqual(json.loads(js.removeprefix('window.TOY_ATLAS=').rstrip(';\n')), result)
            with (root/'catalog.csv').open(encoding='utf-8-sig') as stream:
                self.assertEqual(len(list(csv.DictReader(stream))), total)
            before = {p.name: p.read_bytes() for p in root.iterdir()}
            coverage.write(root)
            self.assertEqual(before, {p.name: p.read_bytes() for p in root.iterdir()})

    def test_existing_supplement_is_not_duplicated(self):
        supplement = json.loads((coverage.ROOT/'chain-coverage.json').read_text())
        data = {'products': supplement['products'], 'sources': supplement['sources'], 'brands': []}
        result = coverage.apply(data)
        self.assertEqual(result['stats']['products'], len(supplement['products']))
        self.assertEqual(result['brands'], dict(Counter(p['brand'] for p in supplement['products'])))
        self.assertEqual(len(result['sources']), len(supplement['sources']))


if __name__ == '__main__':
    unittest.main()
