# 修复实验室

<section class="lab-area">
  <article class="lab-canvas" id="restoreCanvas">
    <div class="restore-stage" data-state="idle">
      <div class="restore-viewport">
        <div class="restore-idle" data-restore-view="idle">
          <img class="restore-mark" src="../assets/claude-icon.svg" alt="">
          <h2>准备就绪</h2>
        </div>

        <div class="restore-working" data-restore-view="working" hidden>
          <img alt="待修复图像" id="restoreInputImg">
          <div class="restore-scanline"></div>
        </div>

        <div class="restore-result" data-restore-view="result" hidden>
          <img id="restoreAfter" alt="修复后">
          <div class="restore-result-badge">修复完成</div>
        </div>
      </div>

      <div class="restore-stage-footer">
        <div class="restore-footer-slot" data-restore-view="idle">
          <label class="btn-solid restore-upload-btn">
            上传破碎瓷器
            <input type="file" id="restoreUpload" accept="image/*" hidden>
          </label>
          <p class="restore-hint">支持 JPG / PNG，建议主体清晰、背景简洁</p>
        </div>

        <div class="restore-footer-slot" data-restore-view="working" hidden>
          <div class="restore-progress-bar"><span id="restoreProgressFill"></span></div>
          <p id="restoreProgressText">正在采集图像...</p>
        </div>

        <div class="restore-footer-slot" data-restore-view="result" hidden>
          <button class="btn-solid" id="restoreReset">重新开始</button>
          <p class="restore-match-info" id="restoreMatchInfo"></p>
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
