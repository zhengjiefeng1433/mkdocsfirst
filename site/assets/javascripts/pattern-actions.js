(function () {
  "use strict";

  var WISHLIST_KEY = "patternWishlist";

  function safeParseArray(raw) {
    if (!raw) return [];
    try {
      var value = JSON.parse(raw);
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function getStore(key) {
    return safeParseArray(localStorage.getItem(key));
  }

  function setStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getPatternSection(el) {
    return el ? el.closest(".pattern-detail") : null;
  }

  function getPatternData(section) {
    var titleEl = section.querySelector(".pattern-detail__top h2");
    var imgEl = section.querySelector(".pattern-detail__image img");
    var dynastyTag = section.querySelector(".pattern-detail__tags span:nth-child(2)");

    var title = titleEl ? titleEl.textContent.trim() : "未命名纹样";
    var imageUrl = imgEl ? imgEl.getAttribute("src") : "";
    var imageAbs = imgEl ? imgEl.src : "";
    var dynasty = dynastyTag ? dynastyTag.textContent.trim() : "";
    var id = title + "|" + imageUrl;

    return {
      id: id,
      title: title,
      dynasty: dynasty,
      imageUrl: imageUrl,
      imageAbs: imageAbs
    };
  }

  function getImageExtension(url) {
    var clean = (url || "").split("?")[0].split("#")[0];
    var i = clean.lastIndexOf(".");
    if (i === -1) return "jpg";
    return clean.slice(i + 1).toLowerCase();
  }

  function makeFilename(data) {
    var ext = getImageExtension(data.imageUrl || data.imageAbs);
    return data.title + "." + ext;
  }

  function showToast(message) {
    var toast = document.getElementById("pattern-action-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "pattern-action-toast";
      toast.style.position = "fixed";
      toast.style.left = "50%";
      toast.style.bottom = "20px";
      toast.style.transform = "translateX(-50%)";
      toast.style.padding = "8px 12px";
      toast.style.background = "rgba(20, 22, 28, 0.92)";
      toast.style.color = "#fff";
      toast.style.borderRadius = "8px";
      toast.style.fontSize = "14px";
      toast.style.zIndex = "9999";
      toast.style.opacity = "0";
      toast.style.transition = "opacity 180ms ease";
      toast.style.pointerEvents = "none";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = "1";

    window.clearTimeout(window.__patternToastTimer);
    window.__patternToastTimer = window.setTimeout(function () {
      toast.style.opacity = "0";
    }, 1400);
  }

  function updateWishlistUI(section) {
    var actionButtons = section.querySelectorAll(".pattern-detail__actions .btn-outline");
    if (!actionButtons || actionButtons.length < 2) return;

    var addButton = actionButtons[1];
    var data = getPatternData(section);
    var wishlist = getStore(WISHLIST_KEY);
    var exists = wishlist.some(function (item) { return item.id === data.id; });

    addButton.textContent = exists ? "已加入清单" : "加入清单";
    addButton.classList.toggle("is-active", exists);
  }

  function updateAllButtonsState() {
    if (!document.body.querySelector(".pattern-library-page")) return;

    var sections = document.querySelectorAll(".pattern-detail");
    sections.forEach(function (section) {
      updateWishlistUI(section);
    });
  }

  function openImage(section) {
    var data = getPatternData(section);
    if (!data.imageAbs) {
      showToast("未找到可查看的大图");
      return;
    }
    window.open(data.imageAbs, "_blank", "noopener,noreferrer");
  }

  function downloadImage(section) {
    var data = getPatternData(section);
    if (!data.imageAbs) {
      showToast("未找到可下载的图片");
      return;
    }

    var a = document.createElement("a");
    a.href = data.imageAbs;
    a.download = makeFilename(data);
    document.body.appendChild(a);
    a.click();
    a.remove();

    showToast("开始下载：" + data.title);
  }

  function toggleWishlist(section) {
    var data = getPatternData(section);
    var wishlist = getStore(WISHLIST_KEY);
    var index = wishlist.findIndex(function (item) { return item.id === data.id; });
    var added = index === -1;

    if (added) {
      wishlist.push({
        id: data.id,
        title: data.title,
        dynasty: data.dynasty,
        imageUrl: data.imageUrl,
        savedAt: new Date().toISOString()
      });
    } else {
      wishlist.splice(index, 1);
    }

    setStore(WISHLIST_KEY, wishlist);
    updateWishlistUI(section);
    showToast(added ? "已加入清单" : "已移出清单");
  }

  function onClick(event) {
    if (!document.body.querySelector(".pattern-library-page")) return;

    var solid = event.target.closest(".pattern-detail__actions .btn-solid");
    if (solid) {
      event.preventDefault();
      var viewSection = getPatternSection(solid);
      if (viewSection) openImage(viewSection);
      return;
    }

    var outline = event.target.closest(".pattern-detail__actions .btn-outline");
    if (!outline) return;

    event.preventDefault();
    var actionText = outline.textContent.trim();
    var actionSection = getPatternSection(outline);
    if (!actionSection) return;

    if (actionText.indexOf("下载") !== -1) {
      downloadImage(actionSection);
      return;
    }

    toggleWishlist(actionSection);
  }

  function setupListeners() {
    if (window.__patternActionsBound) return;
    window.__patternActionsBound = true;
    document.addEventListener("click", onClick);
  }

  function initialize() {
    setupListeners();
    updateAllButtonsState();
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(function () {
      initialize();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();

/* ============================================================
   COMMUNITY PAGE — Tab switching
   ============================================================ */
(function () {
  "use strict";

  function initCommunityTabs() {
    var tabs = document.querySelectorAll(".community-tab");
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("is-active"); });
        tab.classList.add("is-active");

        var panelId = tab.getAttribute("data-panel");
        document.querySelectorAll(".community-panel").forEach(function (p) {
          p.classList.toggle("is-hidden", p.id !== panelId);
        });
      });
    });
  }

  function initialize() {
    initCommunityTabs();
    initDialogue();
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(initialize);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();

/* ============================================================
   SPIRIT DIALOGUE PAGE — Artifact switching & demo chat
   ============================================================ */
function initDialogue() {
  var items = document.querySelectorAll(".dialogue-artifact-item");
  if (!items.length) return;

  var headerImg = document.getElementById("dialogue-header-img");
  var headerName = document.getElementById("dialogue-header-name");
  var statusEl = document.getElementById("dialogue-ai-status");
  var messagesEl = document.getElementById("dialogue-messages");
  var inputEl = document.getElementById("dialogue-input");
  var sendBtn = document.getElementById("dialogue-send");
  var BACKEND_LOCAL_ENDPOINT = "http://localhost:8787/api/chat";
  var DEFAULT_MODEL = "gpt-4o-mini";
  var DEFAULT_TEMPERATURE = 0.7;
  var currentArtifact = "yuan";
  var currentMeta = null;
  var conversationByArtifact = {};
  var isSending = false;

  function updateAIStatus() {
    if (!statusEl) return;
    statusEl.textContent = "✦ AI 对话中 · Backend Proxy Mode";
  }

  function getBackendEndpoint() {
    if (typeof window !== "undefined" && window.__SPIRIT_CHAT_API__) {
      return window.__SPIRIT_CHAT_API__;
    }
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return BACKEND_LOCAL_ENDPOINT;
    }
    return window.location.origin + "/api/chat";
  }

  function buildSystemPrompt(meta) {
    return [
      "你正在扮演一件中国古代文物，与用户进行中文对话。",
      "请始终使用第一人称（我）叙述，语气温和、具体、富有历史感。",
      "回答要围绕文物史实、工艺、纹饰、美学和流传背景，避免编造明显虚假细节。",
      "当信息不确定时，明确说明“史料未详”并给出合理范围。",
      "文物名称：" + meta.name,
      "文物身份：" + meta.sub
    ].join("\n");
  }

  function buildMetaFromItem(item) {
    return {
      artifact: item.getAttribute("data-artifact") || "yuan",
      name: item.getAttribute("data-name") || "未命名文物",
      sub: item.getAttribute("data-sub") || "",
      img: item.getAttribute("data-img") || "",
      greeting: item.getAttribute("data-greeting") || "你好，我在这里。"
    };
  }

  function resetConversation(meta) {
    conversationByArtifact[meta.artifact] = [
      { role: "system", content: buildSystemPrompt(meta) },
      { role: "assistant", content: meta.greeting }
    ];
  }

  function addMessage(text, isUser, avatarSrc) {
    var msg = document.createElement("div");
    msg.className = "dialogue-msg " + (isUser ? "dialogue-msg--user" : "dialogue-msg--artifact");

    if (!isUser) {
      var av = document.createElement("img");
      av.className = "dialogue-avatar";
      av.src = avatarSrc || headerImg.src;
      av.alt = "文物头像";
      msg.appendChild(av);
    }

    var bubble = document.createElement("div");
    bubble.className = "dialogue-bubble";
    bubble.textContent = text;
    msg.appendChild(bubble);

    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addTyping(avatarSrc) {
    var msg = document.createElement("div");
    msg.className = "dialogue-msg dialogue-msg--artifact dialogue-msg--typing";
    msg.id = "dialogue-typing";

    var av = document.createElement("img");
    av.className = "dialogue-avatar";
    av.src = avatarSrc;
    av.alt = "文物头像";
    msg.appendChild(av);

    var bubble = document.createElement("div");
    bubble.className = "dialogue-bubble";
    bubble.textContent = "…";
    msg.appendChild(bubble);

    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return msg;
  }

  function activateArtifact(item) {
    items.forEach(function (i) { i.classList.remove("is-active"); });
    item.classList.add("is-active");

    var meta = buildMetaFromItem(item);
    currentArtifact = meta.artifact;
    currentMeta = meta;
    if (headerImg) headerImg.src = meta.img;
    if (headerName) headerName.textContent = meta.name;

    resetConversation(meta);
    while (messagesEl.firstChild) messagesEl.removeChild(messagesEl.firstChild);
    addMessage(meta.greeting, false, meta.img);
  }

  async function requestAIReply(userText) {
    var conversation = conversationByArtifact[currentArtifact];
    if (!conversation) {
      resetConversation(currentMeta || buildMetaFromItem(items[0]));
      conversation = conversationByArtifact[currentArtifact];
    }

    conversation.push({ role: "user", content: userText });

    var response = await fetch(getBackendEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        artifact: {
          id: currentMeta ? currentMeta.artifact : currentArtifact,
          name: currentMeta ? currentMeta.name : "",
          sub: currentMeta ? currentMeta.sub : ""
        },
        model: DEFAULT_MODEL,
        messages: conversation,
        temperature: DEFAULT_TEMPERATURE
      })
    });

    var payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      conversation.pop();
      throw new Error("模型返回内容不是有效 JSON");
    }

    if (!response.ok) {
      conversation.pop();
      var detail = payload && payload.error && payload.error.message
        ? payload.error.message
        : ("HTTP " + response.status);
      throw new Error(detail);
    }

    var reply = payload && payload.reply;

    if (!reply) {
      conversation.pop();
      throw new Error("模型未返回可用回复");
    }

    conversation.push({ role: "assistant", content: reply });
    return reply;
  }

  async function handleSend() {
    if (isSending) return;
    var text = (inputEl.value || "").trim();
    if (!text) return;

    inputEl.value = "";
    addMessage(text, true);

    var avatarSrc = headerImg ? headerImg.src : "";
    var typing = addTyping(avatarSrc);
    isSending = true;
    if (sendBtn) sendBtn.disabled = true;

    try {
      var reply = await requestAIReply(text);
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      addMessage(reply, false, avatarSrc);
    } catch (error) {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      addMessage("调用 AI 失败：" + error.message + "。请检查后端服务后重试。", false, avatarSrc);
    } finally {
      isSending = false;
      if (sendBtn) sendBtn.disabled = false;
      if (inputEl) inputEl.focus();
    }
  }

  items.forEach(function (item) {
    item.addEventListener("click", function () {
      activateArtifact(item);
    });
  });

  updateAIStatus();

  var activeItem = document.querySelector(".dialogue-artifact-item.is-active") || items[0];
  if (activeItem) {
    activateArtifact(activeItem);
  }

  var params = new URLSearchParams(window.location.search);
  var initialArtifact = params.get("artifact");
  if (initialArtifact) {
    var initialItem = Array.prototype.find.call(items, function (item) {
      return item.getAttribute("data-artifact") === initialArtifact;
    });
    if (initialItem) {
      initialItem.click();
    }
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", handleSend);
  }

  if (inputEl) {
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleSend();
    });
  }
}
