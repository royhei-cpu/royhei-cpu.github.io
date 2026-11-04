"""Evidence and refresh invariants for the retailer stories directory."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from build_retailer_stories import build,parse_feed,refresh_feed

class RetailerStoryTests(unittest.TestCase):
 def test_feed_uses_publication_date_and_filters_other_products(self):
  xml=b'''<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Squishy blind box release</title><published>2026-10-01T12:00:00Z</published><updated>2026-11-04T12:00:00Z</updated><link href="https://example.com/story"/><summary>New squishy series</summary></entry><entry><title>LEGO building blocks blind box</title><published>2026-10-02T00:00:00Z</published><link href="https://example.com/blocks"/></entry><entry><title>Blind box without a date</title><link href="https://example.com/undated"/></entry></feed>'''
  items=parse_feed(xml,dict(retailer_id='a',publisher='Shop A'),'2026-11-04')
  self.assertEqual(len(items),1);self.assertEqual(items[0]['published'],'2026-10-01');self.assertEqual(items[0]['date_kind'],'Published')
 def test_failed_check_keeps_dated_items_and_last_success(self):
  prior=dict(last_success='2026-10-30',items=[dict(title='Prior squishy post',checked='2026-10-30')])
  with patch('build_retailer_stories.urlopen',side_effect=TimeoutError):r=refresh_feed(dict(url='https://example.com/feed',retailer_id='a'),prior,'2026-11-04')
  self.assertEqual(r['items'],prior['items']);self.assertEqual(r['last_success'],'2026-10-30');self.assertIn('unavailable',r['status'])
 def test_build_excludes_future_posts_and_deduplicates_article_tags(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);profile=lambda id:dict(id=id,name=id,source_ids=[id],chain_ids=[],background='A sourced shop profile.',background_sources=[dict(url='https://example.com/about')])
   article=lambda id,retailers,published,url:dict(id=id,retailer_ids=retailers,published=published,title='Squishy update',url=url)
   seed=dict(reviewed='2026-10-30',scope='Test',retailers=[profile('a'),profile('b')],feeds=[],curated_updates=[article('one',['a'],'2026-11-01','https://example.com/shared'),article('two',['b'],'2026-11-01','https://example.com/shared'),article('future',['a'],'2026-11-05','https://example.com/future')])
   for name,data in [('retailer-stories.json',seed),('catalog.json',dict(sources=[dict(id='a'),dict(id='b')],updated='2026-11-04')),('chain-assortments.json',dict(chains=[],products=[],sources=[])),('retailer-news-cache.json',dict(feeds=[dict(url='https://example.com/feed',retailer_id='a',status='read',checked='2026-10-31',last_success='2026-10-31',items=[])]))]:
    (root/name).write_text(json.dumps(data))
   result=build(root=root,as_of='2026-11-04')
   self.assertEqual(len(result['updates']),1);self.assertEqual(result['updates'][0]['retailer_ids'],['a','b']);self.assertEqual(result['feeds_checked'],'2026-10-31')
 def test_every_configured_source_chain_and_workshop_reference_is_covered(self):
  root=Path(__file__).parent;seed=json.loads((root/'retailer-stories.json').read_text());profiles=seed['retailers'];catalog=json.loads((root/'catalog.json').read_text());chains=json.loads((root/'chain-assortments.json').read_text())
  self.assertEqual(len({r['id'] for r in profiles}),len(profiles));self.assertTrue({r['id'] for r in catalog['sources']}<={x for r in profiles for x in r['source_ids']});self.assertTrue({r['id'] for r in chains['chains']}<={x for r in profiles for x in r['chain_ids']});self.assertTrue(any('shop:target' in r['retailer_keys'] for r in profiles))

if __name__=='__main__':unittest.main()
