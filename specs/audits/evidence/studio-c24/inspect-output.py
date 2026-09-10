"""Independently decode the native PDF output; compare all pages to real PNGs."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageChops, ImageStat, ImageDraw
from pypdf import PdfReader
import pypdfium2 as pdfium

folder = Path(__file__).resolve().parent
source = json.loads((folder / 'render-evidence.json').read_text())
reader = PdfReader(folder / 'quotemax-carousel.pdf')
rendered = pdfium.PdfDocument(str(folder / 'quotemax-carousel.pdf'))
assert len(reader.pages) == len(rendered) == 5
report = []
contact = Image.new('RGB', (5 * 270, 375), '#16120f')
draw = ImageDraw.Draw(contact)
for index, item in enumerate(source['pages']):
    page = reader.pages[index]
    assert [float(page.mediabox.width), float(page.mediabox.height)] == [1080, 1350]
    expected = Image.open(folder / item['file']).convert('RGB')
    assert len(page.images) == 1
    embedded = page.images[0].image.convert('RGB')
    assert embedded.size == expected.size == (1080, 1350)
    assert ImageChops.difference(embedded, expected).getbbox() is None
    bitmap = rendered[index].render(scale=1).to_pil().convert('RGB')
    assert bitmap.size == expected.size
    difference = ImageChops.difference(bitmap, expected)
    rms = ImageStat.Stat(difference).rms
    # PDFium raster pixels must match the actual PNG; no blank/substituted page.
    assert difference.getbbox() is None, (index, rms)
    assert max(ImageStat.Stat(bitmap).stddev) > 10
    bitmap.save(folder / f'pdf-page-{index + 1}.png')
    contact.paste(bitmap.resize((270, 338)), (270 * index, 24))
    draw.text((270 * index + 8, 5), f"{index + 1}. {item['kind']}", fill='#ffc400')
    report.append({'page': index + 1, 'kind': item['kind'], 'dimensions': list(bitmap.size),
        'embeddedPixelsEqualSource': True, 'pdfRasterPixelsEqualSource': True,
        'rasterRmsDifference': rms, 'rgbSha256': hashlib.sha256(bitmap.tobytes()).hexdigest()})
contact.save(folder / 'contact-sheet.png')
(folder / 'pixel-inspection.json').write_text(json.dumps({'decoder': 'pypdf 6.10.0 and PDFium via pypdfium2 5.13.0',
    'pageCount': 5, 'orderedPages': report, 'signedDeviceProof': False}, indent=2))
print(json.dumps({'pages': len(report), 'allEmbeddedAndRenderedPixelsMatch': True}))
