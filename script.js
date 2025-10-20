document.addEventListener("DOMContentLoaded", function () {
  const introBtn = document.getElementById("intro-btn");
  const body = document.body;
  const page2 = document.querySelector(".page-2");
  const page3 = document.querySelector(".page-3");
  const nextBtn = document.getElementById("next-to-page-3");
  const randomBtn = document.getElementById("random-positive-btn");
  const floatingLayer = document.querySelector(".page-3 .floating-text-layer");
  const heartImg = document.getElementById("give-heart-img");
  const compliments = [
    "Xinh đẹp",
    "Học giỏi",
    "Hồn nhiên",
    "Vui tươi",
    "Hạnh phúc",
    "Giàu (Tình cảm)",
    "Rực rỡ"
  ];
  const wordColors = [
    "#d517dbff",
    "#000000",
    "#ffd166",
    "#80ed99",
    "#00bbf9",
    "#a29bfe",
  ];
  const audio = new Audio("asset/song.mp3");
  audio.loop = true;
  audio.volume = 0.2;
  const quadrantCounts = [0, 0, 0, 0];

  introBtn.addEventListener("click", function () {
    // Đổi background
    body.style.backgroundImage = "url('asset/heart_rain.gif')";
    body.style.backgroundSize = "cover";
    body.style.backgroundPosition = "center";
    body.style.backgroundRepeat = "repeat";

    // Ẩn nút
    introBtn.style.display = "none";

    audio.currentTime = 0;
    audio.play().catch(() => {
      // ignore autoplay issues silently
    });

    // Hiện ảnh GIF và dòng chữ
    setTimeout(() => {
      if (page2) {
        page2.style.display = "flex";
      }
    }, 500);
  });

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (page2) {
        page2.style.display = "none";
      }
      if (page3) {
        page3.style.display = "flex";
      }
    });
  }

  if (randomBtn) {
    randomBtn.addEventListener("click", () => {
      if (!compliments.length) {
        return;
      }

      const randomIndex = Math.floor(Math.random() * compliments.length);
      const word = compliments.splice(randomIndex, 1)[0];
      spawnFloatingWord(word);

      if (!compliments.length) {
        randomBtn.style.display = "none";
        if (heartImg) {
          heartImg.style.display = "block";
        }
      }
    });
  }

  function spawnFloatingWord(text) {
    if (!floatingLayer || !page3) return;

    const wordEl = document.createElement("span");
    wordEl.className = "floating-word";
    wordEl.textContent = text;
    wordEl.style.color = wordColors[Math.floor(Math.random() * wordColors.length)];
    wordEl.style.left = "0px";
    wordEl.style.top = "0px";
    floatingLayer.appendChild(wordEl);

    const layerRect = floatingLayer.getBoundingClientRect();
    const wordRect = wordEl.getBoundingClientRect();
    const maxLeft = Math.max(layerRect.width - wordRect.width, 0);
    const maxTop = Math.max(layerRect.height - wordRect.height, 0);

    const wordPadding = 10;
    const blockedRects = Array.from(page3.children)
      .filter((el) => el !== floatingLayer)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          return null;
        }
        let padding = 16;
        if (el.classList && el.classList.contains("page-message")) {
          padding = heartImg && heartImg.style.display === "block" ? 44 : 28;
        } else if (el === heartImg) {
          padding = 24;
        }
        return expandRect(rect, padding);
      })
      .filter(Boolean);

    const existingRects = Array.from(floatingLayer.children)
      .filter((child) => child !== wordEl)
      .map((child) => expandRect(child.getBoundingClientRect(), wordPadding));

    const quadrants = [0, 1, 2, 3].sort((a, b) => {
      const diff = quadrantCounts[a] - quadrantCounts[b];
      return diff === 0 ? Math.random() - 0.5 : diff;
    });

    const maxAttempts = 80;
    let attempt = 0;
    let placed = false;

    while (attempt < maxAttempts && !placed) {
      const quadrantIndex = quadrants[attempt % quadrants.length];
      const { leftRange, topRange } = getQuadrantRanges(quadrantIndex, layerRect, wordRect, maxLeft, maxTop);
      if (!leftRange || !topRange) {
        attempt += 1;
        continue;
      }

      const randomLeft = leftRange.size === 0
        ? leftRange.min
        : leftRange.min + Math.random() * leftRange.size;
      const randomTop = topRange.size === 0
        ? topRange.min
        : topRange.min + Math.random() * topRange.size;
      const candidateRect = {
        left: layerRect.left + randomLeft,
        right: layerRect.left + randomLeft + wordRect.width,
        top: layerRect.top + randomTop,
        bottom: layerRect.top + randomTop + wordRect.height
      };
      const expandedCandidate = expandRect(candidateRect, wordPadding);

      const overlapsFixed = blockedRects.some((rect) => isOverlapping(expandedCandidate, rect));
      const overlapsExisting = existingRects.some((rect) => isOverlapping(expandedCandidate, rect));

      if (!overlapsFixed && !overlapsExisting) {
        wordEl.style.left = `${randomLeft}px`;
        wordEl.style.top = `${randomTop}px`;
        quadrantCounts[quadrantIndex] += 1;
        placed = true;
        break;
      }

      attempt += 1;
    }

    if (!placed) {
      floatingLayer.removeChild(wordEl);
    }
  }

  function getQuadrantRanges(index, layerRect, wordRect, maxLeft, maxTop) {
    const halfWidth = layerRect.width / 2;
    const halfHeight = layerRect.height / 2;

    const startX = index % 2 === 0 ? 0 : halfWidth;
    const startY = index < 2 ? 0 : halfHeight;

    let leftMin = clamp(startX, 0, maxLeft);
    let leftMax = clamp(startX + halfWidth - wordRect.width, 0, maxLeft);
    if (leftMax < leftMin) {
      leftMin = 0;
      leftMax = maxLeft;
    }

    let topMin = clamp(startY, 0, maxTop);
    let topMax = clamp(startY + halfHeight - wordRect.height, 0, maxTop);
    if (topMax < topMin) {
      topMin = 0;
      topMax = maxTop;
    }

    if (leftMax < leftMin || topMax < topMin) {
      return { leftRange: null, topRange: null };
    }

    const leftSize = Math.max(leftMax - leftMin, 0);
    const topSize = Math.max(topMax - topMin, 0);

    return {
      leftRange: { min: leftMin, size: leftSize },
      topRange: { min: topMin, size: topSize }
    };
  }

  function isOverlapping(a, b) {
    return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  }

  function expandRect(rect, padding) {
    return {
      left: rect.left - padding,
      right: rect.right + padding,
      top: rect.top - padding,
      bottom: rect.bottom + padding
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
});
