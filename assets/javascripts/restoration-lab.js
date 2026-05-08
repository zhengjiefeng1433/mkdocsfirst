/* 修复实验室 — 交互逻辑
 *
 * 新增样本：
 *   1. 把"修复后"图片放到 docs/image/restoration/ 下
 *   2. 把"破损"图片以同名方式放到 docs/image/restoration-before/ 下
 *   3. 在下方 SAMPLES 数组里追加 { file, name, era } 即可
 *      （只有破损图与修复后图都存在的样本才会出现在画廊里）
 */

(function () {
  const IMAGE_DIR_AFTER  = '../image/restoration/';
  const IMAGE_DIR_BEFORE = '../image/restoration-before/';
  const SAMPLES = [
    { file: '1_restore.jpg',  name: '青花缠枝',  era: '明' },
    { file: '2-restore.jpg',  name: '釉里红折枝', era: '明' },
    { file: '3_restore.jpg',  name: '粉彩花鸟',  era: '清' },
    { file: '4_restore.jpg',  name: '青瓷莲瓣',  era: '宋' },
    { file: '5_restore.jpg',  name: '斗彩团花',  era: '明' },
    { file: '6_restore.jpg',  name: '五彩鱼藻',  era: '清' },
    { file: '7_restore.jpg',  name: '影青暗刻',  era: '宋' },
    { file: '8_restore.jpg',  name: '青花缠莲',  era: '元' },
    { file: '9_restore.jpg',  name: '霁蓝描金',  era: '清' },
    { file: '10_restore.jpg', name: '哥窑开片',  era: '宋' },
    { file: '11_restore.jpg', name: '钧窑釉变',  era: '宋' },
  ];

  const STEPS = [
    { label: '正在采集图像...',   ms: 600 },
    { label: '正在提取特征...',   ms: 900 },
    { label: '正在智能补全...',   ms: 1100 },
    { label: '正在结果验证...',   ms: 600 },
  ];

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // 8x8 average hash
  function aHash(img) {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 8;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 8, 8);
    const data = ctx.getImageData(0, 0, 8, 8).data;
    const gray = new Array(64);
    let sum = 0;
    for (let i = 0; i < 64; i++) {
      const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      sum += gray[i];
    }
    const avg = sum / 64;
    const hash = new Uint8Array(64);
    for (let i = 0; i < 64; i++) hash[i] = gray[i] > avg ? 1 : 0;
    return hash;
  }

  function hamming(a, b) {
    let d = 0;
    for (let i = 0; i < 64; i++) if (a[i] !== b[i]) d++;
    return d;
  }

  function init() {
    const root = document.getElementById('restoreCanvas');
    if (!root || root.dataset.inited === '1') return;
    root.dataset.inited = '1';

    const stage         = root.querySelector('.restore-stage');
    const idleView      = root.querySelector('[data-restore-view="idle"]');
    const workingView   = root.querySelector('[data-restore-view="working"]');
    const resultView    = root.querySelector('[data-restore-view="result"]');
    const fileInput     = document.getElementById('restoreUpload');
    const inputImg      = document.getElementById('restoreInputImg');
    const progressFill  = document.getElementById('restoreProgressFill');
    const progressText  = document.getElementById('restoreProgressText');
    const statusItems   = Array.from(document.querySelectorAll('#restoreStatusList li'));
    const afterImg      = document.getElementById('restoreAfter');
    const matchInfo     = document.getElementById('restoreMatchInfo');
    const footerSlots   = Array.from(root.querySelectorAll('.restore-footer-slot'));
    const resetBtn      = document.getElementById('restoreReset');
    const galleryGrid   = document.getElementById('restoreGalleryGrid');
    const sampleCount   = document.getElementById('restoreSampleCount');

    // 预加载样本：尝试同名加载 before 与 after 两张图
    const sampleData = SAMPLES.map(s => ({
      ...s, afterImg: null, beforeImg: null, hash: null,
    }));
    Promise.all(sampleData.map(s => Promise.all([
      loadImage(IMAGE_DIR_AFTER  + s.file).then(img => { s.afterImg  = img; s.hash = aHash(img); }).catch(() => {}),
      loadImage(IMAGE_DIR_BEFORE + s.file).then(img => { s.beforeImg = img; }).catch(() => {}),
    ]))).then(() => {
      if (sampleCount) sampleCount.textContent = sampleData.filter(s => s.afterImg).length + ' 件';
      if (galleryGrid) buildGallery();
    });

    function buildGallery() {
      if (!galleryGrid) return;
      galleryGrid.innerHTML = '';
      sampleData.forEach(s => {
        if (!s.afterImg || !s.beforeImg) return;
        const card = document.createElement('div');
        card.className = 'restore-card';
        const thumb = document.createElement('img');
        thumb.src = s.beforeImg.src;
        thumb.alt = s.name;
        thumb.loading = 'lazy';
        card.appendChild(thumb);
        const meta = document.createElement('div');
        meta.className = 'restore-card-meta';
        meta.innerHTML = `<span>${s.name}</span><span class="tag">${s.era}</span>`;
        card.appendChild(meta);
        card.addEventListener('click', () => runWithSample(s));
        galleryGrid.appendChild(card);
      });
    }

    // 显示视图（同步切换画布与底部 slot）
    function showView(name) {
      stage.dataset.state = name;
      idleView.hidden    = name !== 'idle';
      workingView.hidden = name !== 'working';
      resultView.hidden  = name !== 'result';
      footerSlots.forEach(slot => {
        slot.hidden = slot.dataset.restoreView !== name;
      });
    }

    // 状态面板高亮
    function setStep(idx) {
      statusItems.forEach((li, i) => {
        li.classList.toggle('is-active', i === idx);
        li.classList.toggle('is-done',   i < idx);
      });
    }
    function clearSteps() {
      statusItems.forEach(li => li.classList.remove('is-active', 'is-done'));
    }

    // 跑动画 + 阶段进度条
    function runAnimation() {
      return new Promise(resolve => {
        let i = 0;
        const totalMs = STEPS.reduce((a, s) => a + s.ms, 0);
        let elapsed = 0;
        progressFill.style.width = '0%';
        function next() {
          if (i >= STEPS.length) {
            setStep(STEPS.length); // 全部 is-done
            statusItems.forEach(li => { li.classList.remove('is-active'); li.classList.add('is-done'); });
            progressFill.style.width = '100%';
            resolve();
            return;
          }
          const step = STEPS[i];
          progressText.textContent = step.label;
          setStep(i);
          setTimeout(() => {
            elapsed += step.ms;
            progressFill.style.width = (elapsed / totalMs * 100).toFixed(1) + '%';
            i++;
            next();
          }, step.ms);
        }
        next();
      });
    }

    // 主流程：上传任意文件 → 匹配 → 展示
    async function runWithFile(file) {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      inputImg.src = url;
      showView('working');
      await runAnimation();

      // 匹配
      const userHash = aHash(img);
      let best = null, bestD = Infinity;
      sampleData.forEach(s => {
        if (!s.hash) return;
        const d = hamming(userHash, s.hash);
        if (d < bestD) { bestD = d; best = s; }
      });

      if (!best) {
        progressText.textContent = '样本库为空，无法匹配';
        return;
      }
      const similarity = ((64 - bestD) / 64 * 100).toFixed(1);
      revealResult(best.afterImg.src, `匹配：${best.name}（${best.era}）· 相似度 ${similarity}%`);
    }

    // 主流程：用户点样品 → 直接展示对应完整图
    async function runWithSample(sample) {
      inputImg.src = sample.beforeImg.src;
      showView('working');
      await runAnimation();
      revealResult(sample.afterImg.src, `匹配：${sample.name}（${sample.era}）· 相似度 100%`);
    }

    function revealResult(afterSrc, info) {
      afterImg.src = afterSrc;
      matchInfo.textContent = info;
      showView('result');
    }

    // 重置
    resetBtn.addEventListener('click', () => {
      clearSteps();
      progressFill.style.width = '0%';
      showView('idle');
    });

    // 上传
    fileInput.addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      if (f) runWithFile(f);
      fileInput.value = '';
    });

    // 拖拽
    ['dragenter', 'dragover'].forEach(evt => {
      root.addEventListener(evt, e => {
        e.preventDefault();
        root.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      root.addEventListener(evt, e => {
        e.preventDefault();
        root.classList.remove('is-dragover');
      });
    });
    root.addEventListener('drop', e => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) runWithFile(f);
    });
  }

  // 兼容 Material 的 instant navigation
  if (typeof window !== 'undefined' && typeof window.document$ !== 'undefined' && window.document$.subscribe) {
    window.document$.subscribe(init);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
