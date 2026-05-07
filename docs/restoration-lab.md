# 修复实验室

<section class="lab-area">
  <article class="lab-canvas" id="restoreCanvas">
    <div class="restore-stage" data-state="idle">
      <div class="restore-idle" data-restore-view="idle">
        <img class="restore-mark" src="../assets/claude-icon.svg" alt="">

        <h2>准备就绪</h2>
        <p>拖拽或点击上传破碎瓷器图片，或从下方样品库挑选</p>
        <label class="btn-solid restore-upload-btn">
          上传破碎瓷器
          <input type="file" id="restoreUpload" accept="image/*" hidden>
        </label>
        <p class="restore-hint">支持 JPG / PNG，建议主体清晰、背景简洁</p>
      </div>

      <div class="restore-working" data-restore-view="working" hidden>
        <div class="restore-working-img">
          <img alt="待修复图像" id="restoreInputImg">
          <div class="restore-scanline"></div>
        </div>
        <div class="restore-progress">
          <div class="restore-progress-bar"><span id="restoreProgressFill"></span></div>
          <p id="restoreProgressText">正在采集图像...</p>
        </div>
      </div>

      <div class="restore-result" data-restore-view="result" hidden>
        <div class="restore-slider" id="restoreSlider">
          <img class="restore-after" id="restoreAfter" alt="修复后">
          <div class="restore-before-wrap" id="restoreBeforeWrap">
            <img class="restore-before" id="restoreBefore" alt="破损">
          </div>
          <div class="restore-handle" id="restoreHandle"><span></span></div>
          <div class="restore-label restore-label--before">破损</div>
          <div class="restore-label restore-label--after">修复</div>
        </div>
        <div class="restore-result-actions">
          <button class="btn-solid" id="restoreReset">重新开始</button>
          <span class="restore-match-info" id="restoreMatchInfo"></span>
        </div>
      </div>
    </div>
  </article>

  <div class="lab-side">
    <article class="status-panel">
      <h3>系统状态</h3>
      <ul id="restoreStatusList">
        <li data-step="0">图像采集</li>
        <li data-step="1">特征提取</li>
        <li data-step="2">智能补全</li>
        <li data-step="3">结果验证</li>
      </ul>
    </article>
    <article class="tech-panel">
      <h3>技术说明</h3>
      <p>本系统基于历代瓷器完整图谱，对上传的残损照片提取色彩与轮廓特征，并以感知哈希在数据库中检索风格最接近的完整器物作为补全参考。</p>
      <div class="tech-meta">
        <span>样本规模</span><strong id="restoreSampleCount">—</strong>
      </div>
      <div class="tech-meta">
        <span>平均耗时</span><strong>3.2s</strong>
      </div>
    </article>
  </div>
</section>

<section class="restore-gallery">
  <header class="restore-gallery-head">
    <h2>样品库</h2>
    <p>点击任一样品，演示「破损 → 修复」全过程；破损蒙版由浏览器实时生成</p>
  </header>
  <div class="restore-gallery-grid" id="restoreGalleryGrid"></div>
</section>
