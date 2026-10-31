#!/usr/bin/env python3
"""Exercise research boundaries, exports, persistence and catalog navigation."""
import csv, io, json, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
R=Path(__file__).resolve().parent
O=Path('/tmp/china-toys-china-desk-qa');O.mkdir(exist_ok=True)
server=subprocess.Popen([sys.executable,'-m','http.server','8797','--directory',str(R.parent)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
checks=[];errors=[]
try:
    time.sleep(.4)
    with sync_playwright() as pw:
        b=pw.chromium.launch()
        p=b.new_page(viewport={'width':1440,'height':1000})
        p.on('pageerror',lambda e:errors.append(str(e)))
        p.clock.install(time=__import__('datetime').datetime(2026,10,31,12,tzinfo=__import__('datetime').timezone.utc))
        p.goto('http://127.0.0.1:8797/china-toys/',wait_until='networkidle')
        expect(p.locator('#chinaDeskTitle')).to_have_text('What deserves a closer look?')
        assert p.evaluate("document.getElementById('weeklyOverview').nextElementSibling.id")=='chinaIntelligence'
        assert p.locator('#chinaIntelligence .cm-card').count()==3
        p.locator('[data-cm-filter="days"]').select_option('7')
        expect(p.locator('#chinaIntelligence .cm-empty')).to_contain_text('No verified evidence')
        p.locator('[data-cm-filter="market"]').select_option('International reference')
        assert p.locator('#chinaIntelligence .cm-card').count()==1
        assert p.evaluate("ATLAS_CHINA_HELPERS.inWindow('2026-10-25','7','2026-10-31')")
        assert not p.evaluate("ATLAS_CHINA_HELPERS.inWindow('2026-10-24','7','2026-10-31')")
        assert not p.evaluate("ATLAS_CHINA_HELPERS.inWindow('2026-11-01','all','2026-10-31')")
        with p.expect_download() as d:p.locator('[data-cm-export]').click()
        rows=list(csv.DictReader(io.StringIO(Path(d.value.path()).read_text(encoding='utf-8-sig'))))
        assert len(rows)==1 and rows[0]['Market']=='International reference'
        checks.append('China default; market and date filters; future-date exclusion; filtered evidence CSV')
        assert p.locator('#filters #ipSelect').count()==1
        for pid,label in [('a6352811fd423b78','CRYBABY'),('25883b4f5b30a725','Twinkle Twinkle'),('5496b7c05a7bcbb0','DIMOO')]:
            card=p.locator('[data-product-id="'+pid+'"]')
            expect(card.locator('.character-name strong')).to_contain_text(label)
            assert 'Named in a Q3' not in card.locator('.review-reason').inner_text()
            assert card.locator('.review-reason').inner_text().count('100,000+')==1
            assert not card.locator('.review-appeal').evaluate('(e)=>e.open')
        assert p.locator('#trendEvidenceNote').count()==1
        p.locator('#sort').select_option('character')
        assert p.evaluate("(()=>{const names=[...document.querySelectorAll('.product-card .character-name strong')].map(e=>e.textContent);return names.every((v,i)=>!i||names[i-1].localeCompare(v)<=0)})()")
        p.locator('#resetFilters').click()
        checks.append('Prominent character names, accessible character filter and sort; concise distinct trend labels with one shared explanation')

        p.locator('[data-cm-tab="rank"]').click()
        assert p.locator('#chinaIntelligence tbody tr').count()==3
        expect(p.locator('[data-cm-content]')).to_contain_text('H1 2026')
        with p.expect_download() as d:p.locator('[data-cm-export]').click()
        rows=list(csv.DictReader(io.StringIO(Path(d.value.path()).read_text(encoding='utf-8-sig'))))
        assert [r['Chart appearances'] for r in rows]==['75','58','30']
        assert all(r['Market']=='Mainland China' for r in rows)
        checks.append('Historical China ranking and scoped ranking CSV')
        p.locator('[data-cm-tab="releases"]').click()
        p.locator('[data-cm-filter="days"]').select_option('all')
        count=p.locator('#chinaIntelligence .cm-release').count()
        assert count>0
        with p.expect_download() as d:p.locator('[data-cm-export]').click()
        rows=list(csv.DictReader(io.StringIO(Path(d.value.path()).read_text(encoding='utf-8-sig'))))
        assert len(rows)==count and len({(r['Source'],r['China date']) for r in rows})==count
        assert all(r['Image URL'].startswith('http') for r in rows)
        checks.append('China release deduplication and photo/source CSV')
        p.locator('#retailer').select_option('toptoy')
        p.locator('#search').fill('impossible-no-match')
        p.locator('[data-cm-preset="Squishy blind boxes"]').click()
        expect(p.locator('#category')).to_have_value('Squishy blind boxes')
        expect(p.locator('#retailer')).to_have_value('')
        expect(p.locator('#search')).to_have_value('')
        assert p.locator('.product-card').count()>0
        p.locator('.card-footer [data-open]').first.click()
        p.locator('[data-note-status]').select_option('Sample')
        p.locator('[data-note-text]').fill('=Test formula protection; sample request')
        p.locator('[data-note-save]').click()
        expect(p.locator('[data-note-message]')).to_contain_text('Saved')
        p.locator('#closeProduct').click()
        p.reload(wait_until='networkidle')
        p.locator('[data-cm-tab="notes"]').click()
        expect(p.locator('[data-cm-content]')).to_contain_text('sample request')
        with p.expect_download() as d:p.locator('[data-cm-export]').click()
        rows=list(csv.DictReader(io.StringIO(Path(d.value.path()).read_text(encoding='utf-8-sig'))))
        assert len(rows)==1 and rows[0]['Note'].startswith("'=Test") and rows[0]['Status']=='Sample'
        assert rows[0]['Image URL'] and json.loads(rows[0]['Source listings JSON'])
        p.locator('#chinaIntelligence [data-open]').click()
        p.locator('[data-note-delete]').click()
        p.locator('#closeProduct').click()
        expect(p.locator('#chinaIntelligence .cm-empty')).to_contain_text('No research notes')
        checks.append('Preset clears conflicting filters; notebook saves across reload, exports safely and deletes')
        p.locator('[data-cm-preset="china"]').click()
        expect(p.locator('#evidence')).to_have_value('china-any')
        assert p.locator('.product-card').count()>0
        p.locator('[data-cm-preset="stock"]').click()
        expect(p.locator('#evidence')).to_have_value('in-stock')
        assert p.locator('.product-card').count()>0
        for width in [390,768,1440]:
            p.set_viewport_size({'width':width,'height':900})
            p.locator('[data-cm-tab="watch"]').click()
            assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
            p.locator('#chinaIntelligence').screenshot(path=str(O/f'desk-{width}.png'))
        checks.append('390px, 768px and desktop layouts without overflow')
        p.goto('http://127.0.0.1:8797/china-toys/research.html#rankings',wait_until='networkidle')
        assert p.locator('#auditArchive').evaluate('(e)=>e.open')
        expect(p.locator('#rankings')).to_be_visible()
        expect(p.locator('#chinaDeskTitle')).to_have_text('What deserves a closer look?')
        checks.append('Detailed research page keeps deep audit links accessible')
        assert not errors,errors
        b.close()
finally:
    server.terminate()
    (O/'results.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
    print(json.dumps({'checks':checks,'errors':errors},indent=2))
