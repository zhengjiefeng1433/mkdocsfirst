$ErrorActionPreference = 'Stop'
$root = Get-Location
$xlsx = Join-Path $root 'photo/纹样数据.xlsx'
$patternDir = Join-Path $root 'docs/image/pattern'
$pagesDir = Join-Path $root 'docs/pattern-library'

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($xlsx)

function Get-EntryText([string]$entryName){
  $e = $zip.Entries | Where-Object FullName -eq $entryName
  if(-not $e){ return $null }
  $r = New-Object IO.StreamReader($e.Open())
  $t = $r.ReadToEnd(); $r.Close(); return $t
}
function Get-Xml([string]$entryName){ $txt = Get-EntryText $entryName; if($null -eq $txt){ return $null }; [xml]$txt }

$ssXml = Get-Xml 'xl/sharedStrings.xml'
$wsXml = Get-Xml 'xl/worksheets/sheet1.xml'
$metaXml = Get-Xml 'xl/metadata.xml'
$rdrXml = Get-Xml 'xl/richData/rdrichvalue.xml'
$rvRelXml = Get-Xml 'xl/richData/richValueRel.xml'
$rvRelsXml = Get-Xml 'xl/richData/_rels/richValueRel.xml.rels'
$drawXml = Get-Xml 'xl/drawings/drawing1.xml'
$drawRelsXml = Get-Xml 'xl/drawings/_rels/drawing1.xml.rels'

$strings = @(); foreach($si in $ssXml.sst.si){ if($si.t){$strings += [string]$si.t} elseif($si.r){$strings += (($si.r | ForEach-Object { $_.t }) -join '')} else {$strings += ''} }

function Get-CellText([int]$row,[string]$col){
  $ref = "$col$row"
  $cell = $wsXml.worksheet.sheetData.row | Where-Object { [int]$_.r -eq $row } | ForEach-Object { $_.c | Where-Object { $_.r -eq $ref } } | Select-Object -First 1
  if(-not $cell){ return '' }
  if($cell.t -eq 's'){ return $strings[[int]$cell.v] }
  return [string]$cell.v
}

$vmToMedia = @{}
if($metaXml -and $rdrXml -and $rvRelXml -and $rvRelsXml){
  $metaNs = New-Object System.Xml.XmlNamespaceManager($metaXml.NameTable); $metaNs.AddNamespace('x','http://schemas.openxmlformats.org/spreadsheetml/2006/main')
  $rdrNs = New-Object System.Xml.XmlNamespaceManager($rdrXml.NameTable); $rdrNs.AddNamespace('rv','http://schemas.microsoft.com/office/spreadsheetml/2017/richdata')
  $rvRelNs = New-Object System.Xml.XmlNamespaceManager($rvRelXml.NameTable); $rvRelNs.AddNamespace('rvr','http://schemas.microsoft.com/office/spreadsheetml/2022/richvaluerel')
  $relsNs = New-Object System.Xml.XmlNamespaceManager($rvRelsXml.NameTable); $relsNs.AddNamespace('p','http://schemas.openxmlformats.org/package/2006/relationships')

  $rvNodes = @($rdrXml.SelectNodes('//rv:rv',$rdrNs))
  $relNodes = @($rvRelXml.SelectNodes('//rvr:rel',$rvRelNs))
  $allB = $wsXml.worksheet.sheetData.row | ForEach-Object { $_.c | Where-Object { $_.r -match '^B\d+$' -and $_.vm } }
  foreach($c in $allB){
    $vm = [int]$c.vm
    if($vmToMedia.ContainsKey($vm)){ continue }
    $rc = $metaXml.SelectSingleNode("//x:bk/x:rc[@t='$vm']",$metaNs)
    if(-not $rc){ continue }
    $valueIdx = [int]$rc.GetAttribute('v')
    if($valueIdx -lt 0 -or $valueIdx -ge $rvNodes.Count){ continue }
    $vals = @($rvNodes[$valueIdx].SelectNodes('./rv:v',$rdrNs)); if($vals.Count -lt 1){ continue }
    $localImageIdentifier = [int]$vals[0].InnerText
    if($localImageIdentifier -lt 0 -or $localImageIdentifier -ge $relNodes.Count){ continue }
    $rid = $relNodes[$localImageIdentifier].GetAttribute('id','http://schemas.openxmlformats.org/officeDocument/2006/relationships')
    if([string]::IsNullOrWhiteSpace($rid)){ $rid = $relNodes[$localImageIdentifier].GetAttribute('r:id') }
    if([string]::IsNullOrWhiteSpace($rid)){ continue }
    $rel = $rvRelsXml.SelectSingleNode("//p:Relationship[@Id='$rid']",$relsNs); if(-not $rel){ continue }
    $target = [string]$rel.Target; if($target.StartsWith('../')){ $target = $target.Substring(3) }
    $vmToMedia[$vm] = ('xl/richData/' + $target)
  }
}

$rowToMedia = @{}
if($drawXml -and $drawRelsXml){
  $drawNs = New-Object System.Xml.XmlNamespaceManager($drawXml.NameTable)
  $drawNs.AddNamespace('xdr','http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing')
  $drawNs.AddNamespace('a','http://schemas.openxmlformats.org/drawingml/2006/main')
  $relsNs2 = New-Object System.Xml.XmlNamespaceManager($drawRelsXml.NameTable); $relsNs2.AddNamespace('p','http://schemas.openxmlformats.org/package/2006/relationships')
  $anchors = @($drawXml.SelectNodes('//xdr:twoCellAnchor',$drawNs))
  foreach($a in $anchors){
    $colNode = $a.SelectSingleNode('./xdr:from/xdr:col',$drawNs)
    $rowNode = $a.SelectSingleNode('./xdr:from/xdr:row',$drawNs)
    $blip = $a.SelectSingleNode('.//a:blip',$drawNs)
    if(-not $colNode -or -not $rowNode -or -not $blip){ continue }
    $col = [int]$colNode.InnerText; if($col -ne 1){ continue }
    $rid = $blip.GetAttribute('embed','http://schemas.openxmlformats.org/officeDocument/2006/relationships'); if([string]::IsNullOrWhiteSpace($rid)){ continue }
    $rel = $drawRelsXml.SelectSingleNode("//p:Relationship[@Id='$rid']",$relsNs2); if(-not $rel){ continue }
    $target = [string]$rel.Target; if($target.StartsWith('../')){ $target = $target.Substring(3) }
    $rowNum = [int]$rowNode.InnerText + 1
    $rowToMedia[$rowNum] = ('xl/' + $target)
  }
}

$dynastyMap = @{
  '旧石器时代'='paleolithic.md'; '新石器时代'='neolithic.md'; '夏'='xia.md'; '商'='shang.md'; '周'='zhou.md'; '秦'='qin.md'; '汉'='han.md';
  '三国'='three-kingdoms.md'; '晋'='jin.md'; '南北朝'='northern-southern-dynasties.md'; '隋'='sui.md'; '隋代'='sui.md'; '唐'='tang.md'; '唐代'='tang.md';
  '五代十国'='five-dynasties-ten-kingdoms.md'; '宋'='song.md'; '宋代'='song.md'; '辽'='liao.md'; '西夏'='xixia.md'; '金'='jin.md'; '元'='yuan.md'; '元代'='yuan.md';
  '明'='ming.md'; '明代'='ming.md'; '清'='qing.md'; '清代'='qing.md'; '中华民国'='republic-of-china.md'; '民国'='republic-of-china.md';
  '中华人民共和国'='peoples-republic-of-china.md'; '共和国'='peoples-republic-of-china.md'; '现代'='peoples-republic-of-china.md'
}
$eraMap = @{
  'ming.md'='1368年 - 1644年'; 'qing.md'='1644年 - 1912年'; 'song.md'='960年 - 1279年'; 'tang.md'='618年 - 907年'; 'sui.md'='581年 - 618年'; 'yuan.md'='1271年 - 1368年';
  'jin.md'='1115年 - 1234年'; 'liao.md'='907年 - 1125年'; 'xixia.md'='1038年 - 1227年'; 'han.md'='前202年 - 220年'; 'qin.md'='前221年 - 前207年'; 'zhou.md'='前1046年 - 前256年';
  'shang.md'='前1600年 - 前1046年'; 'xia.md'='约前2070年 - 前1600年'; 'three-kingdoms.md'='220年 - 280年'; 'northern-southern-dynasties.md'='420年 - 589年';
  'five-dynasties-ten-kingdoms.md'='907年 - 979年'; 'republic-of-china.md'='1912年 - 1949年'; 'peoples-republic-of-china.md'='1949年 - 至今'; 'paleolithic.md'='约300万年前 - 约1万年前';
  'neolithic.md'='约1万年前 - 约4000年前'; 'unknown.md'='年代未详'
}
$titleMap = @{
  'paleolithic.md'='旧石器时代'; 'neolithic.md'='新石器时代'; 'xia.md'='夏'; 'shang.md'='商'; 'zhou.md'='周'; 'qin.md'='秦'; 'han.md'='汉'; 'three-kingdoms.md'='三国';
  'jin.md'='晋'; 'northern-southern-dynasties.md'='南北朝'; 'sui.md'='隋'; 'tang.md'='唐'; 'five-dynasties-ten-kingdoms.md'='五代十国'; 'song.md'='宋'; 'liao.md'='辽';
  'xixia.md'='西夏'; 'yuan.md'='元'; 'ming.md'='明'; 'qing.md'='清'; 'republic-of-china.md'='中华民国'; 'peoples-republic-of-china.md'='中华人民共和国'; 'unknown.md'='不详'
}

$rows = @(); $maxRow = ($wsXml.worksheet.sheetData.row | Measure-Object -Property r -Maximum).Maximum
for($i=1; $i -le [int]$maxRow; $i++){
  $name = (Get-CellText $i 'A').Trim(); $dyn = (Get-CellText $i 'C').Trim(); $cat = (Get-CellText $i 'D').Trim()
  if([string]::IsNullOrWhiteSpace($name)){ continue }
  if($name -in @('纹样','纹样名称','名称')){ continue }
  $file = if($dynastyMap.ContainsKey($dyn)){ $dynastyMap[$dyn] } else { 'unknown.md' }

  $imgPathRel = ''
  $bCell = $wsXml.worksheet.sheetData.row | Where-Object { [int]$_.r -eq $i } | ForEach-Object { $_.c | Where-Object { $_.r -eq "B$i" } } | Select-Object -First 1
  $sourceMedia = $null
  if($bCell -and $bCell.vm -and $vmToMedia.ContainsKey([int]$bCell.vm)){ $sourceMedia = $vmToMedia[[int]$bCell.vm] }
  elseif($rowToMedia.ContainsKey($i)){ $sourceMedia = $rowToMedia[$i] }

  if($sourceMedia){
    $entry = $zip.Entries | Where-Object FullName -eq $sourceMedia
    if($entry){
      $ext = [IO.Path]::GetExtension($sourceMedia); if([string]::IsNullOrWhiteSpace($ext)){ $ext = '.png' }
      $safeName = ($name -replace '[\\/:*?"<>|\s]+','-')
      $outName = ('excel-row{0:000}-{1}{2}' -f $i, $safeName, $ext)
      $outPath = Join-Path $patternDir $outName
      $in = $entry.Open(); $fs = [IO.File]::Open($outPath,[IO.FileMode]::Create,[IO.FileAccess]::Write); $in.CopyTo($fs); $fs.Close(); $in.Close()
      $imgPathRel = '../../image/pattern/' + $outName
    }
  }
  if([string]::IsNullOrWhiteSpace($imgPathRel)){ $imgPathRel = '../../image/pattern/first-pattern.jpeg' }

  $rows += [PSCustomObject]@{ Row=$i; Name=$name; Dynasty=$dyn; Category=$cat; File=$file; Image=$imgPathRel }
}

$grouped = $rows | Group-Object File
foreach($g in $grouped){
  $file = $g.Name; $title = if($titleMap.ContainsKey($file)){$titleMap[$file]}else{'不详'}; $era = if($eraMap.ContainsKey($file)){$eraMap[$file]}else{'年代未详'}; $items = $g.Group
  $first = $items | Select-Object -First 1
  $keyword = if([string]::IsNullOrWhiteSpace($first.Category)){'纹样'}else{$first.Category}
  $desc = '{0}为{1}时期常见的{2}题材之一，常用于器物装饰、建筑彩绘或织绣图案，具有较强的装饰性与时代审美特征。' -f $first.Name,$title,$keyword

  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add('<div class="pattern-library-page"></div>')
  $lines.Add('')
  $lines.Add('# ' + $title)
  $lines.Add('')
  $lines.Add('<section class="pattern-detail">')
  $lines.Add('    <div class="pattern-detail__image">')
  $lines.Add(('        <img src="{0}" alt="{1}示意图" />' -f $first.Image,$first.Name))
  $lines.Add('    </div>')
  $lines.Add('    <div class="pattern-detail__content">')
  $lines.Add('        <div class="pattern-detail__top">')
  $lines.Add(('            <h2>{0}</h2>' -f $first.Name))
  $lines.Add('            <a class="pattern-detail__fav" href="#">收藏</a>')
  $lines.Add('        </div>')
  $lines.Add('')
  $lines.Add('        <div class="pattern-detail__tags">')
  $lines.Add(('            <span>{0}</span>' -f $keyword))
  $lines.Add(('            <span>{0}</span>' -f $first.Dynasty))
  $lines.Add(('            <span>{0}</span>' -f $first.Category))
  $lines.Add('        </div>')
  $lines.Add('')
  $lines.Add('        <article class="pattern-detail__info">')
  $lines.Add('            <div class="pattern-detail__info-head">')
  $lines.Add('                <h3>基本信息</h3>')
  $lines.Add('                <p>素材等级：馆藏纹样</p>')
  $lines.Add('            </div>')
  $lines.Add('            <div class="pattern-detail__grid">')
  $lines.Add(('                <div><strong>朝代(时期)</strong><span>{0}</span></div>' -f $first.Dynasty))
  $lines.Add(('                <div><strong>公元纪年</strong><span>{0}</span></div>' -f $era))
  $lines.Add(('                <div><strong>纹样类别</strong><span>{0}</span></div>' -f $first.Category))
  $lines.Add('                <div><strong>所属器物</strong><span>陶瓷、织物或建筑构件</span></div>')
  $lines.Add('                <div><strong>载体&工艺</strong><span>刻划、彩绘、印花或刺绣</span></div>')
  $lines.Add('                <div><strong>材质</strong><span>土、石、金属、纺织品等</span></div>')
  $lines.Add('            </div>')
  $lines.Add(('            <p class="pattern-detail__desc"><strong>图案介绍：</strong>{0}</p>' -f $desc))
  $lines.Add('        </article>')
  $lines.Add('')
  $lines.Add('        <div class="pattern-detail__actions">')
  $lines.Add('            <a class="btn-solid" href="#">查看高清图</a>')
  $lines.Add('            <a class="btn-outline" href="#">下载</a>')
  $lines.Add('            <a class="btn-outline" href="#">加入清单</a>')
  $lines.Add('        </div>')
  $lines.Add('    </div>')
  $lines.Add('</section>')
  $lines.Add('')
  $lines.Add('## 纹样次序')
  $lines.Add('')

  $idx = 1
  foreach($it in $items){
    $lines.Add(('### 纹样 {0:000} · {1}' -f $idx,$it.Name))
    $lines.Add('')
    $lines.Add(('![{0}]({1})' -f $it.Name,$it.Image))
    $lines.Add('')
    $lines.Add(('朝代：{0}；类别：{1}。' -f $it.Dynasty,$it.Category))
    $lines.Add('')
    $idx++
  }

  $outFile = Join-Path $pagesDir $file
  [IO.File]::WriteAllLines($outFile, $lines, [Text.UTF8Encoding]::new($false))
}

$docsRoot = Join-Path $root 'docs'
Get-ChildItem $docsRoot -Recurse -File -Include *.md,*.css,*.yml | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  if($content -match '待核'){ [IO.File]::WriteAllText($_.FullName,($content -replace '待核','未详'),[Text.UTF8Encoding]::new($false)) }
}

$zip.Dispose()
[PSCustomObject]@{
  TotalRows = $rows.Count
  DynastyPagesUpdated = $grouped.Count
  ImagesWritten = ($rows | Where-Object { $_.Image -notlike '*first-pattern.jpeg' }).Count
  PlaceholderUsed = ($rows | Where-Object { $_.Image -like '*first-pattern.jpeg' }).Count
} | ConvertTo-Json -Compress
