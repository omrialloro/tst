// sketch.js
new p5((p) => {
  const SAMPLE_SEC = 10;

  let vid = null;

  // sizes
  let vW = 1280,
    vH = 720;
  let dispW = 900,
    dispH = 506;
  let lowW = 260,
    lowH = 146;

  let srcG = null;
  let mapG = null;
  let outImg = null;

  let frames = [];
  let filled = 0;
  let targetLen = 0;

  let phases = null;

  let mode = "PAINT"; // PAINT | BUILDING | PLAY
  let lastCapMs = 0;

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function setMode(m) {
    mode = m;
    UI_EL.modeText.textContent = `MODE: ${m}`;
    UI_EL.modeDot.className =
      "dot " + (m === "BUILDING" ? "building" : m === "PAINT" ? "paint" : "");
  }

  function updateStats() {
    UI_EL.stLoop.textContent = `${SAMPLE_SEC.toFixed(2)}s`;
    UI_EL.stFrames.textContent = `${filled}/${targetLen}`;
    UI_EL.stRes.textContent = srcG ? `${lowW}x${lowH}` : "-";
    UI_EL.stMap.textContent = UI.showMap ? "ON" : "OFF";
  }

  function grayToSpeed(g) {
    return clamp((g - 128) / 127, -1, 1);
  }

  function computeSizes() {
    const aspect = vW / vH;
    dispW = Math.min(UI.maxDisplayW, vW);
    dispH = Math.round(dispW / aspect);

    lowW = Math.round(clamp(dispW / 3.5, 180, 360));
    lowH = Math.round(lowW / aspect);
  }

  function rebuildBuffers(keepMap) {
    computeSizes();

    p.resizeCanvas(dispW, dispH);

    srcG = p.createGraphics(lowW, lowH);
    srcG.pixelDensity(1);
    srcG.noSmooth();

    const oldMap = keepMap ? mapG : null;
    mapG = p.createGraphics(lowW, lowH);
    mapG.pixelDensity(1);
    mapG.noSmooth();
    if (oldMap) {
      mapG.image(oldMap, 0, 0, lowW, lowH);
    } else {
      mapG.background(128);
    }

    outImg = p.createImage(lowW, lowH);
    outImg.pixelDensity(1);

    phases = new Float32Array(lowW * lowH);
    phases.fill(0);

    targetLen = Math.max(2, Math.floor(SAMPLE_SEC * UI.capFPS));
    frames = new Array(targetLen);
    filled = 0;

    lastCapMs = 0;
    updateStats();
  }

  function maybeResize() {
    if (!srcG) return;

    const wantLen = Math.max(2, Math.floor(SAMPLE_SEC * UI.capFPS));
    if (targetLen !== wantLen) {
      rebuildBuffers(true);
    }

    if (mode !== "BUILDING") {
      const prevDispW = dispW;
      computeSizes();
      if (dispW !== prevDispW) {
        rebuildBuffers(true);
      }
    }
  }

  // --- MAP TEMPLATES ---
  function applyTemplate(kind) {
    if (!mapG) return;
    mapG.loadPixels();
    const w = mapG.width,
      h = mapG.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let g = 128;

        if (kind === "LR") {
          const t = x / (w - 1);
          g = Math.round(255 * (1 - t));
        } else if (kind === "RL") {
          const t = x / (w - 1);
          g = Math.round(255 * t);
        } else if (kind === "CENTER") {
          const cx = (w - 1) * 0.5;
          const d = Math.abs(x - cx) / cx;
          g = Math.round(255 * (1 - d));
        }

        const i = (y * w + x) * 4;
        mapG.pixels[i] = mapG.pixels[i + 1] = mapG.pixels[i + 2] = g;
        mapG.pixels[i + 3] = 255;
      }
    }
    mapG.updatePixels();
  }

  function paintMap() {
    if (mode !== "PAINT") return;
    if (!mapG || !p.mouseIsPressed) return;

    const mx = p.mouseX,
      my = p.mouseY;
    if (mx < 0 || my < 0 || mx > p.width || my > p.height) return;

    const x = Math.floor((mx / p.width) * lowW);
    const y = Math.floor((my / p.height) * lowH);

    mapG.noStroke();
    mapG.fill(UI.gray);
    const r = UI.brushSize * (lowW / dispW);
    mapG.circle(x, y, r);
  }

  function drawBrushCursor() {
    if (mode !== "PAINT") return;
    if (
      p.mouseX < 0 ||
      p.mouseY < 0 ||
      p.mouseX > p.width ||
      p.mouseY > p.height
    )
      return;
    p.push();
    p.noFill();
    p.stroke(255, 220);
    p.strokeWeight(2);
    p.circle(p.mouseX, p.mouseY, UI.brushSize);
    p.pop();
  }

  function captureSlot(slot) {
    srcG.background(0);
    srcG.image(vid, 0, 0, lowW, lowH);
    srcG.loadPixels();
    frames[slot] = new Uint8ClampedArray(srcG.pixels);
  }

  function drawPreviewFrame() {
    srcG.background(0);
    srcG.image(vid, 0, 0, lowW, lowH);
    p.image(srcG, 0, 0, dispW, dispH);
  }

  function drawMapFullOpaque() {
    p.image(mapG, 0, 0, dispW, dispH);
  }

  function drawMapOverlay(alpha = 120) {
    if (!UI.showMap) return;
    p.push();
    p.tint(255, alpha);
    p.image(mapG, 0, 0, dispW, dispH);
    p.pop();
  }

  // ---------- controls exposed ----------
  window.__clearMap = () => {
    if (mapG) mapG.background(128);
  };
  window.__template = (kind) => {
    applyTemplate(kind);
  };

  window.__stop = () => {
    setMode("PAINT");
    if (vid) vid.pause();
  };

  window.__play = () => {
    if (!vid) return;

    phases.fill(0);
    targetLen = Math.max(2, Math.floor(SAMPLE_SEC * UI.capFPS));
    frames = new Array(targetLen);
    filled = 0;
    updateStats();

    setMode("BUILDING");
    lastCapMs = 0;

    vid.time(0);
    vid.play();
  };

  window.__loadVideo = (url) => {
    if (vid) {
      vid.pause();
      vid.remove();
      vid = null;
    }
    setMode("PAINT");

    vid = p.createVideo(url, () => {
      vid.hide();
      vid.volume(0);

      const elt = vid.elt;
      vW = elt.videoWidth || 1280;
      vH = elt.videoHeight || 720;

      rebuildBuffers(false);

      // load first frame
      vid.time(0);
      vid.play();
      setTimeout(() => vid.pause(), 120);
    });
  };

  // ---------- p5 ----------
  p.setup = () => {
    const cnv = p.createCanvas(900, 506);
    cnv.parent("wrap");
    p.pixelDensity(1);
    p.noSmooth();
    setMode("PAINT");
    updateStats();
  };

  p.draw = () => {
    p.background(0);

    if (!vid || !srcG || !mapG) {
      p.fill(240);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(16);
      p.text("Upload a video to start 🎞️", p.width / 2, p.height / 2);
      return;
    }

    maybeResize();

    paintMap();

    if (mode === "PAINT") {
      drawMapFullOpaque();
      drawBrushCursor();
      updateStats();
      return;
    }

    if (mode === "BUILDING") {
      drawPreviewFrame();
      drawMapOverlay(120);

      const interval = 1000 / UI.capFPS;
      const now = p.millis();

      if (lastCapMs === 0 || now - lastCapMs >= interval) {
        if (filled < targetLen) {
          captureSlot(filled);
          filled++;
          lastCapMs = now;
          updateStats();
        }
        if (filled >= targetLen) {
          vid.pause();
          setMode("PLAY");
          updateStats();
        }
      }
      return;
    }

    if (mode === "PLAY") {
      if (filled < 2) {
        setMode("PAINT");
        return;
      }

      mapG.loadPixels();
      outImg.loadPixels();

      const scale = UI.speedScale;

      for (let i = 0; i < lowW * lowH; i++) {
        const pi = i * 4;

        const g = mapG.pixels[pi];
        const sp = grayToSpeed(g) * scale;

        let ph = phases[i] + sp;
        ph = mod(ph, filled);
        phases[i] = ph;

        // frame interpolation
        const base = Math.floor(ph);
        const f0 = base % filled;
        const f1 = (f0 + 1) % filled;
        const t = ph - base;

        const A = frames[f0];
        const B = frames[f1];

        outImg.pixels[pi] = A[pi] + (B[pi] - A[pi]) * t;
        outImg.pixels[pi + 1] = A[pi + 1] + (B[pi + 1] - A[pi + 1]) * t;
        outImg.pixels[pi + 2] = A[pi + 2] + (B[pi + 2] - A[pi + 2]) * t;
        outImg.pixels[pi + 3] = 255;
      }

      outImg.updatePixels();
      p.image(outImg, 0, 0, dispW, dispH);

      drawMapOverlay(90);
      updateStats();
    }
  };
});
