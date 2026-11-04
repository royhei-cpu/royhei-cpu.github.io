"""First-visit navigation, brand selection and the physical fit assistant."""
def check_workshop_flow(page,context,out):
 from playwright.sync_api import expect
 # A fresh device starts with fixture setup, not an overflowing editor.
 fresh=context.browser.new_context(viewport={'width':1440,'height':1080})
 p=fresh.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(page.url.split('#')[0]+'#retail',wait_until='domcontentloaded')
 p.wait_for_function('window.ATLAS_RETAIL?.getState()')
 expect(p.locator('#workspace-retail')).to_have_attribute('data-workflow-step','1')
 expect(p.locator('#retailFixtureSetup')).to_be_visible()
 expect(p.locator('.retail-workbench')).not_to_be_visible()
 assert p.locator('.workspace-primary [data-workspace]').count()==5
 assert p.locator('#workspaceResearch').get_attribute('open') is None
 p.locator('#retailClear').click()
 p.locator('#workshopNext').click()
 expect(p.locator('#workspace-retail')).to_have_attribute('data-workflow-step','2')
 p.locator('#retailBrand').select_option('popmart')
 assert p.locator('#retailProducts .retail-product').count()>0
 assert all(x.lower()=='pop mart' for x in p.locator('#retailProducts article>div>small:first-child').all_text_contents())
 # Intersecting source and brand filters must honestly show an empty result.
 p.locator('#retailSourceRetailer').select_option('shop:target')
 expect(p.locator('#retailProducts')).to_contain_text('No products match')
 p.locator('#workshopResetLibrary').click()
 p.locator('#retailSourceRetailer').select_option('shop:target')
 expect(p.locator('#retailProducts .retail-product')).to_have_count(2)
 p.locator('[data-retail-add="target-rms-dumpling"]').click()
 expect(p.locator('#workspace-retail')).to_have_attribute('data-workflow-step','2')
 assert not p.evaluate('window.ATLAS_RETAIL.getPlanogram().issues')
 # Deliberately overfill, then recover without removing the line or neighbors.
 p.locator('#retailPackWidth').fill('12');p.locator('#retailPackWidth').press('Tab')
 p.locator('#retailFacings').fill('12');p.locator('#retailFacings').press('Tab')
 expect(p.locator('.workshop-fit-warning')).to_contain_text('Over shelf width')
 p.locator('#workshopFitItem').click()
 assert not p.evaluate('window.ATLAS_RETAIL.getPlanogram().issues')
 assert p.evaluate('window.ATLAS_RETAIL.getState().items[0].facings')==3
 p.locator('[data-workshop-step="4"]').click()
 expect(p.locator('#workshopReviewChecks')).to_contain_text('Geometry fits')
 expect(p.locator('.retail-picker')).not_to_be_visible()
 # Missing national-brand products can be entered with actual packaged SKU sizes.
 p.locator('[data-workshop-step="2"]').click()
 p.locator('#retailOwnProduct').click()
 p.locator('[name="name"]').fill('Measured squishy blind box')
 p.locator('[name="brand"]').fill('My national brand')
 for name,value in [('packWidth','4'),('packHeight','6'),('packDepth','4')]:p.locator(f'[name="{name}"]').fill(value)
 p.locator('[name="packBasis"]').select_option('measured');p.locator('[name="sku"]').fill('081-00-0001')
 p.locator('#retailCustomForm button[type="submit"]').click()
 expect(p.locator('#retailCustomDialog')).not_to_be_visible()
 assert p.evaluate('window.ATLAS_RETAIL.getState().items.length')==2, p.evaluate('window.ATLAS_RETAIL.getState()')
 item=p.evaluate('window.ATLAS_RETAIL.getState().items.at(-1)')
 assert abs(item['width']-10.16)<.001 and item['sku']=='081-00-0001' and item['dimensionBasis']=='measured'
 p.reload(wait_until='domcontentloaded');p.wait_for_function('window.ATLAS_RETAIL?.getState().items.length===2')
 assert p.evaluate('window.ATLAS_RETAIL.getState().customs[0].planBasis')=='measured'
 for width,height in [(1440,1080),(847,793),(390,844)]:
  p.set_viewport_size({'width':width,'height':height})
  for n in [1,2,3,4]:
   p.locator(f'[data-workshop-step="{n}"]').click()
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,n)
  p.screenshot(path=str(out/f'workshop-flow-{width}.png'))
 assert not errors,errors
 fresh.close()
 return 'Guided first visit, five-item navigation, intersecting brand/retailer filters, honest empty state, three-axis fitting, measured custom national-brand SKU, persistence and four steps at three widths'
