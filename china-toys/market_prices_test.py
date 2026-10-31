"""Guard against misleading price ranges during publishing and weekly refreshes."""
import unittest
from market_prices import enrich

class MarketPricesTest(unittest.TestCase):
    def listing(self, url, price, variant='1 Box', **extra):
        return dict(url=url, source=url, source_id=url, price=price, variant=variant,
                    checked='2026-10-30', currency='USD', market='International', **extra)

    def test_like_for_like_and_exclusions(self):
        offers = [self.listing('a', 10), self.listing('b', 14, 'Single Box', available=False),
                  self.listing('c', 120, 'Whole Set (12 boxes)'),
                  self.listing('d', 8, '1 pc - no box'),
                  self.listing('e', 9, 'No Box - 1 PCS'),
                  self.listing('f', 999, link_status=404),
                  self.listing('maintenance', 2), self.listing('old', 1),
                  self.listing('hk', 80), self.listing('us', 25),
                  self.listing('unknown-a', 3, 'Default Title'),
                  self.listing('unknown-b', 100, 'Default Title')]
        offers[7]['checked']='2026-09-01'
        offers[8]['currency']='HKD'
        offers[9]['market']='United States'
        p={'id':'one','listings':offers,'china_price':{'price':1}}
        data={'sources':[{'id':'maintenance','status':'unavailable'}], 'products':[p]}
        enrich(data, '2026-10-31')
        gs=p['market_prices']['groups']
        single=next(g for g in gs if g['basis']=='Single blind box' and g['market']=='International' and g['currency']=='USD')
        self.assertEqual((single['low'],single['high'],single['shop_count'],single['available_count']),(10,14,2,0))
        unboxed=next(g for g in gs if g['basis']=='One item without box')
        self.assertEqual((unboxed['low'],unboxed['high']),(8,9))
        self.assertEqual(p['market_prices']['excluded_listings'],3)
        self.assertEqual(len([g for g in gs if g['basis']=='Option not specified']),2)
        self.assertEqual(len(gs),7)

    def test_options_dates_missing_and_product_identity(self):
        l=self.listing('a',99)
        l['options_checked']='2026-10-31'
        l['options']=[{'name':'1 Box','price':12,'available':True}, {'name':'Secret','price':90}, {'name':'Whole Set','price':None}]
        p={'id':'one','listings':[l]}
        q={'id':'two','listings':[self.listing('b', 3)]}
        r={'id':'three','listings':[dict(self.listing('c',9),checked=None)]}
        data={'products':[p,q,r]}
        enrich(data,'2026-10-31')
        self.assertEqual([g['low'] for g in p['market_prices']['groups']],[12,90])
        self.assertEqual(p['market_prices']['groups'][0]['checked_to'],'2026-10-31')
        self.assertEqual(q['market_prices']['groups'][0]['low'],3)
        self.assertEqual(r['market_prices']['groups'],[])

if __name__=='__main__':
    unittest.main()
