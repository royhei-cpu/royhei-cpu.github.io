"""Product scope used by generated directories and source-ingestion checks."""
import re

CATEGORIES = {'Blind-box figures', 'Blind-box plush', 'Blind-box dolls',
              'Squishy toys', 'Squishy blind boxes'}
ALIASES = {'Blind-box articulated dolls': 'Blind-box dolls',
           'Squishy blind-box lights': 'Squishy blind boxes'}
EXCLUDED = re.compile(r'\blego\b|building[ -]blocks?|construction[ -]sets?|model[ -]kits?|\bbuildable\b|积木|拼装', re.I)


def eligible(product):
    category = ALIASES.get(product.get('category'), product.get('category'))
    return category in CATEGORIES and not EXCLUDED.search(' '.join(
        str(product.get(k, '')) for k in ('name', 'name_cn', 'brand', 'category')))
