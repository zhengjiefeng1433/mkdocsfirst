$files = Get-ChildItem docs/pattern-library/*.md | Where-Object { $_.Name -notin @('index.md','detail-demo.md') }
foreach($file in $files){
  $lines = Get-Content $file.FullName -Encoding utf8
  $out = New-Object System.Collections.Generic.List[string]
  $i = 0
  $changed = $false
  while($i -lt $lines.Count){
    $line = $lines[$i]
    if($line -match '^###\s+(.+?)\s+\{:\s*\.pattern-seq-anchor\s*\}$'){
      $name = $matches[1].Trim()
      $j = $i + 1
      while($j -lt $lines.Count -and [string]::IsNullOrWhiteSpace($lines[$j])){ $j++ }
      if($j -lt $lines.Count -and $lines[$j] -match '^!\[(.*?)\]\((.*?)\)$'){
        $imgAlt = $matches[1].Trim()
        $img = $matches[2].Trim()
        $k = $j + 1
        while($k -lt $lines.Count -and [string]::IsNullOrWhiteSpace($lines[$k])){ $k++ }
        if($k -lt $lines.Count -and $lines[$k] -match '^朝代：(.+?)；类别：(.+?)。$'){
          $dynasty = $matches[1].Trim()
          $cat = $matches[2].Trim()
          $desc = "$name为$dynasty时期常见的$cat题材之一，常用于器物装饰、建筑彩绘或织绣图案。"
          $block = @"
### $name {: .pattern-seq-anchor }

<section class="pattern-detail pattern-detail--seq">
    <div class="pattern-detail__image">
        <img src="$img" alt="$imgAlt" />
    </div>
    <div class="pattern-detail__content">
        <div class="pattern-detail__top">
            <h2>$name</h2>
            <a class="pattern-detail__fav" href="#">收藏</a>
        </div>

        <div class="pattern-detail__tags">
            <span>$cat</span>
            <span>$dynasty</span>
            <span>$cat</span>
        </div>

        <article class="pattern-detail__info">
            <div class="pattern-detail__info-head">
                <h3>基本信息</h3>
                <p>素材等级：馆藏纹样</p>
            </div>
            <div class="pattern-detail__grid">
                <div><strong>朝代(时期)</strong><span>$dynasty</span></div>
                <div><strong>公元纪年</strong><span>年代未详</span></div>
                <div><strong>纹样类别</strong><span>$cat</span></div>
                <div><strong>所属器物</strong><span>陶瓷、织物或建筑构件</span></div>
                <div><strong>载体&工艺</strong><span>刻划、彩绘、印花或刺绣</span></div>
                <div><strong>材质</strong><span>土、石、金属、纺织品等</span></div>
            </div>
            <p class="pattern-detail__desc"><strong>图案介绍：</strong>$desc</p>
        </article>

        <div class="pattern-detail__actions">
            <a class="btn-solid" href="#">查看高清图</a>
            <a class="btn-outline" href="#">下载</a>
            <a class="btn-outline" href="#">加入清单</a>
        </div>
    </div>
</section>
"@
          foreach($b in ($block -split "`r?`n")){ $out.Add($b) }
          $out.Add('')
          $i = $k + 1
          $changed = $true
          continue
        }
      }
    }
    $out.Add($line)
    $i++
  }
  if($changed){
    Set-Content -Path $file.FullName -Value $out -Encoding utf8
    Write-Output ("UPDATED " + $file.Name)
  }
}
