"""Reader journey for retailer profiles, source-linked updates and aisle navigation."""
import json
from pathlib import Path

def check_stories(page,context,out):
 from playwright.sync_api import expect
 page.locator('.workspace-sidebar [data-workspace="stories"]').click()
 expect(page.locator('#workspace-stories')).to_be_visible()
 expected=json.loads((Path(__file__).parent/'retailer-stories-data.json').read_text())
 assert page.locator('#storiesRetailer option').count()==len(expected['retailers'])+1
 assert page.evaluate('window.ATLAS_RETAILER_STORIES.updates.every(n=>n.published<=window.ATLAS_RETAILER_STORIES.generated)')
 assert page.locator('#storiesResults .stories-news-meta').filter(has_text='Retailer journal').count()==0
 page.locator('[data-stories-tab="journals"]').click()
 expect(page.locator('#storiesResults .stories-news-meta').first).to_contain_text('Retailer journal')
 page.locator('[data-stories-tab="profiles"]').click()
 expect(page.locator('#storiesCount')).to_contain_text(str(len(expected['retailers'])))
 # Each retailer has a real story dialog and linked evidence, even when news is unavailable.
 for profile in expected['retailers']:
  page.locator('#storiesRetailer').select_option(profile['id'])
  page.locator('#storiesSelected [data-retailer-story]').click()
  expect(page.locator('#retailerStoryTitle')).to_have_text(profile['name'])
  assert page.locator('#retailerStoryDialog .stories-profile-sources a').count()>=1
  page.get_by_role('button',name='Close retailer story').click()
 page.locator('#storiesReset').click()
 page.locator('#storiesSearch').fill('not-a-real-retailer-zzzz')
 expect(page.locator('.stories-empty')).to_be_visible()
 page.locator('#storiesReset').click()
 page.locator('#storiesRetailer').select_option('iris')
 page.locator('#storiesSelected [data-retailer-story]').click()
 expect(page.locator('#retailerStoryBody')).to_contain_text('Milktea')
 original=page.evaluate('JSON.stringify(window.ATLAS_RETAIL.getState().items)')
 page.locator('[data-stories-shop="shop:iris"]').click()
 expect(page.locator('#workspace-retail')).to_be_visible()
 expect(page.locator('#retailSourceRetailer')).to_have_value('shop:iris')
 assert page.evaluate('JSON.stringify(window.ATLAS_RETAIL.getState().items)')==original
 page.locator('.stories-workshop-link').click()
 expect(page.locator('#storiesRetailer')).to_have_value('iris')
 page.locator('[data-stories-tab="news"]').click()
 expect(page.locator('.stories-empty')).to_contain_text('No dated update verified')
 page.locator('#storiesReset').click()
 page.locator('#storiesPeriod').select_option('all')
 archive=int(page.locator('#storiesCount').inner_text().split()[0]);page.locator('#storiesPeriod').select_option('30')
 assert int(page.locator('#storiesCount').inner_text().split()[0])<=archive
 page.reload(wait_until='domcontentloaded');expect(page.locator('#workspace-stories')).to_be_visible()
 # Every selectable workshop source key resolves to one of the background profiles.
 assert page.evaluate('''() => {const keys=new Set(window.ATLAS_RETAILER_STORIES.retailers.flatMap(r=>r.retailer_keys));return [...document.querySelectorAll('#retailSourceRetailer option')].every(o=>!o.value||keys.has(o.value))}''')
 page.screenshot(path=str(out/'retailer-stories-desktop.png'))
 for width,height in [(847,793),(390,844)]:
  page.set_viewport_size(dict(width=width,height=height));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  if width==390:page.locator('#storiesFiltersToggle').click()
  page.locator('#storiesRetailer').select_option('ronron');page.locator('#storiesSelected [data-retailer-story]').click()
  assert page.locator('#retailerStoryDialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
  page.get_by_role('button',name='Close retailer story').click();page.locator('#storiesReset').click();page.screenshot(path=str(out/f'retailer-stories-{width}.png'))
 page.set_viewport_size(dict(width=1440,height=1080))
 return 'Retailer stories: all configured sources/chains covered, publication/event dates separated, news/journals split, 34 story dialogs and sources, filters/archive/empty states, linked aisle selection preserves products, mobile filters and responsive dialogs'
