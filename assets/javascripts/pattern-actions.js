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
