from zipfile import ZipFile
from pathlib import Path
xlsx = Path(r'c:\GitHub\mkdocsfirst\photo\纹样数据.xlsx')
out = Path(r'c:\GitHub\mkdocsfirst\docs\image\pattern')
out.mkdir(parents=True, exist_ok=True)
with ZipFile(xlsx) as z:
    media = sorted([n for n in z.namelist() if n.startswith('xl/media/') and n.split('/')[-1]])
    print('media_count', len(media))
    print('first_media', media[0] if media else None)
    if media:
        data = z.read(media[0])
        suffix = Path(media[0]).suffix or '.bin'
        target = out / f'first-pattern{suffix}'
        target.write_bytes(data)
        print('saved_to', target)
