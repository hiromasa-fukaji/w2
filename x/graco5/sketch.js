let system;

// 刺繍エフェクト用パラメータ
let samplingStep = 5;         // ドットの粗さ（getPointsのstep）※小さいほど密
let maxConnectionDistance = 9; // 接続する最大距離
let threadColors = [];          // 糸の色配列
let knotColor;                  // 結び目の色

function setup() {
  let c = createCanvas(210 * 3, 297 * 3);
  c.id('main-canvas');
  background(0);

  system = new DesignSystem();
  c.drop((file) => system.handleFileDrop(file, mouseX, mouseY));

  // 刺繍らしい色のパレットを初期化
  initializeThreadColors();
}

function initializeThreadColors() {
  // 糸の色のカラーピッカーから初期色を取得
  const threadColorPicker = document.getElementById('thread-color');
  if (threadColorPicker) {
    // LocalStorageから保存された色を復元
    const savedThreadColor = localStorage.getItem('threadColor');
    if (savedThreadColor) {
      threadColorPicker.value = savedThreadColor;
    }

    threadColors = [color(threadColorPicker.value)];

    // カラーピッカーの変更を監視
    threadColorPicker.addEventListener('input', (e) => {
      threadColors = [color(e.target.value)];
      // LocalStorageに保存
      localStorage.setItem('threadColor', e.target.value);
    });
  } else {
    // フォールバック（カラーピッカーがない場合）
    threadColors = [color(90, 150, 122)];
  }

  // 結び目の色のカラーピッカーから初期色を取得
  const knotColorPicker = document.getElementById('knot-color');
  if (knotColorPicker) {
    // LocalStorageから保存された色を復元
    const savedKnotColor = localStorage.getItem('knotColor');
    if (savedKnotColor) {
      knotColorPicker.value = savedKnotColor;
    }

    knotColor = color(knotColorPicker.value);

    // カラーピッカーの変更を監視
    knotColorPicker.addEventListener('input', (e) => {
      knotColor = color(e.target.value);
      // LocalStorageに保存
      localStorage.setItem('knotColor', e.target.value);
    });
  } else {
    // フォールバック（カラーピッカーがない場合）
    knotColor = color(255);
  }
}

// 固定グリッドを生成（中心原点）
function generateFixedGrid(maxWidth, maxHeight, step) {
  let grid = [];
  let halfW = maxWidth / 2;
  let halfH = maxHeight / 2;
  for (let y = -halfH; y <= halfH; y += step) {
    for (let x = -halfW; x <= halfW; x += step) {
      grid.push({ x: x, y: y });
    }
  }
  return grid;
}

// オフスクリーンバッファにテキストを描画し、グリッド上の各点が文字内かを判定
function sampleActivePoints(grid, text, fontSize, font, bufferW, bufferH) {
  // Canvas APIで直接バッファを生成（p5のcreateGraphicsより軽量）
  let cvs = document.createElement('canvas');
  cvs.width = bufferW;
  cvs.height = bufferH;
  let c = cvs.getContext('2d');

  // 背景を黒で塗る
  c.fillStyle = 'black';
  c.fillRect(0, 0, bufferW, bufferH);

  // 回転アニメーション（360度ループ、ステップ状）
  let t = millis() * 0.1; // 時間
  let continuousAngle = t * 0.009; // 連続的な回転角度

  // ステップ数（360度を何分割するか）
  const rotationSteps = 85; // 36ステップ = 10度ずつ
  let angle = floor(continuousAngle / (TWO_PI / rotationSteps)) * (TWO_PI / rotationSteps);

  // 中央に移動して回転
  c.save();
  c.translate(bufferW / 2, bufferH / 2);
  c.rotate(angle);

  // 文字を白で中央に描画（回転後の原点が中心）
  c.fillStyle = 'white';
  c.font = `${fontSize}px ${font}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 0, 0);

  c.restore();

  // ピクセルデータ取得
  let imageData = c.getImageData(0, 0, bufferW, bufferH);
  let pixels = imageData.data;

  // 各グリッド点を判定
  let activePoints = [];
  let centerX = bufferW / 2;
  let centerY = bufferH / 2;

  for (let i = 0; i < grid.length; i++) {
    let gp = grid[i];
    // グリッド座標(中心原点) → バッファ座標(左上原点)
    let px = Math.round(gp.x + centerX);
    let py = Math.round(gp.y + centerY);

    if (px >= 0 && px < bufferW && py >= 0 && py < bufferH) {
      let idx = (py * bufferW + px) * 4;
      if (pixels[idx] > 200) { // 閾値50（アンチエイリアス部分も含む）
        activePoints.push(gp);
      }
    }
  }

  return activePoints;
}

// パーティクル間の接続を計算
function calculateConnections(pts) {
  let conns = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      let d = dist(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
      if (d < maxConnectionDistance) {
        conns.push({ from: i, to: j, distance: d });
      }
    }
  }
  return conns;
}

// 刺繍の糸を描画（まっすぐな線）
function drawEmbroideryThread(x1, y1, x2, y2, col) {
  push();
  stroke(col);
  strokeWeight(0.25);
  line(x1, y1, x2, y2);
  pop();
}

function draw() {
  // --- 1. Outside: 全体の環境 ---
  //background(220); // 刺繍布のような背景色

  // --- 2. System: 基本レンダリング ---
  system.render();

  // // --- 2.5. Outside: logoタグの要素のfontSizeをアニメーション ---
  // const logoElements = system.elements.filter(el => el.tag === 'logo');
  // for (let el of logoElements) {
  //   // 初期フォントサイズを保存
  //   if (el._baseFontSize === undefined) {
  //     el._baseFontSize = el.fontSize;
  //   }

  //   // sin波でfontSizeをアニメーション（ステップ状に変化）
  //   let t = millis() * 0.001;
  //   let osc = (sin(t * 2.0) + 1) / 2; // 0〜1 を往復
  //   let continuousScale = 1 + osc * 0.5; // 0.5〜1.0 倍

  //   // ステップ数を定義（例: 5段階）
  //   const steps = 15;
  //   let steppedScale = floor(continuousScale * steps) / steps;

  //   el.fontSize = el._baseFontSize * steppedScale;
  //   el.version++; // プロパティ変更を通知
  // }

  // // --- 2.6. Outside: logo2タグの要素のfontSizeをアニメーション（cos波） ---
  // const logo2Elements = system.elements.filter(el => el.tag === 'logo2');
  // for (let el of logo2Elements) {
  //   // 初期フォントサイズを保存
  //   if (el._baseFontSize === undefined) {
  //     el._baseFontSize = el.fontSize;
  //   }

  //   // cos波でfontSizeをアニメーション（ステップ状に変化）
  //   let t = millis() * 0.001;
  //   let osc = (cos(t * 2.0) + 1) / 2; // 0〜1 を往復
  //   let continuousScale = 1 + osc * 0.5; // 0.5〜1.0 倍

  //   // ステップ数を定義（例: 5段階）
  //   const steps = 15;
  //   let steppedScale = floor(continuousScale * steps) / steps;

  //   el.fontSize = el._baseFontSize * steppedScale;
  //   el.version++; // プロパティ変更を通知
  // }

  // --- 3. Inside: logoタグの刺繍エフェクト ---
  system.drawInside('logo', (ctx) => {
    const el = ctx.element;

    // A. 初回のみ: 固定グリッドを生成（最大フォントサイズに合わせた領域）
    if (!ctx.state.init) {
      if (el._baseFontSize === undefined) {
        el._baseFontSize = el.fontSize;
      }
      let maxFontSize = el._baseFontSize * 1.4; // アニメーション最大値
      // テキスト幅を推定（Canvas APIで計測）
      let tmpCvs = document.createElement('canvas');
      let tmpCtx = tmpCvs.getContext('2d');
      tmpCtx.font = `${maxFontSize}px ${el.font}`;
      let metrics = tmpCtx.measureText(el.text);
      let maxW = metrics.width + maxFontSize; // パディング付き
      let maxH = maxFontSize * 1.5;

      ctx.state.grid = generateFixedGrid(maxW, maxH, samplingStep);
      ctx.state.bufferW = Math.ceil(maxW);
      ctx.state.bufferH = Math.ceil(maxH);
      ctx.state.init = true;
    }

    // B. 毎フレーム: 現在のfontSizeでバッファにテキストを描画し、アクティブポイントを判定
    let activePoints = sampleActivePoints(
      ctx.state.grid,
      el.text,
      el.fontSize,
      el.font,
      ctx.state.bufferW,
      ctx.state.bufferH
    );

    // ポイントが無い場合はスキップ
    if (activePoints.length === 0) return;

    // 接続を計算
    let conns = calculateConnections(activePoints);

    // C. 刺繍風の糸で接続を描画
    for (let i = 0; i < conns.length; i++) {
      let conn = conns[i];
      let p1 = activePoints[conn.from];
      let p2 = activePoints[conn.to];

      let colorIndex = floor(
        (conn.distance / maxConnectionDistance +
          (p1.x + p1.y) * 0.001) * threadColors.length
      ) % threadColors.length;
      let threadColor = threadColors[colorIndex];

      drawEmbroideryThread(p1.x, p1.y, p2.x, p2.y, threadColor);
    }

    // D. パーティクル（刺繍の結び目）を描画
    fill(knotColor);
    noStroke();
    for (let i = 0; i < activePoints.length; i++) {
      let pt = activePoints[i];
      ellipse(pt.x, pt.y, samplingStep * 0.3, samplingStep * 0.3);
    }
  });

  // --- 4. Inside: logo2タグの刺繍エフェクト ---
  system.drawInside('logo2', (ctx) => {
    const el = ctx.element;

    // A. 初回のみ: 固定グリッドを生成（最大フォントサイズに合わせた領域）
    if (!ctx.state.init) {
      if (el._baseFontSize === undefined) {
        el._baseFontSize = el.fontSize;
      }
      let maxFontSize = el._baseFontSize * 1.4; // アニメーション最大値
      // テキスト幅を推定（Canvas APIで計測）
      let tmpCvs = document.createElement('canvas');
      let tmpCtx = tmpCvs.getContext('2d');
      tmpCtx.font = `${maxFontSize}px ${el.font}`;
      let metrics = tmpCtx.measureText(el.text);
      let maxW = metrics.width + maxFontSize; // パディング付き
      let maxH = maxFontSize * 1.5;

      ctx.state.grid = generateFixedGrid(maxW, maxH, samplingStep);
      ctx.state.bufferW = Math.ceil(maxW);
      ctx.state.bufferH = Math.ceil(maxH);
      ctx.state.init = true;
    }

    // B. 毎フレーム: 現在のfontSizeでバッファにテキストを描画し、アクティブポイントを判定
    let activePoints = sampleActivePoints(
      ctx.state.grid,
      el.text,
      el.fontSize,
      el.font,
      ctx.state.bufferW,
      ctx.state.bufferH
    );

    // ポイントが無い場合はスキップ
    if (activePoints.length === 0) return;

    // 接続を計算
    let conns = calculateConnections(activePoints);

    // C. 刺繍風の糸で接続を描画
    for (let i = 0; i < conns.length; i++) {
      let conn = conns[i];
      let p1 = activePoints[conn.from];
      let p2 = activePoints[conn.to];

      let colorIndex = floor(
        (conn.distance / maxConnectionDistance +
          (p1.x + p1.y) * 0.001) * threadColors.length
      ) % threadColors.length;
      let threadColor = threadColors[colorIndex];

      drawEmbroideryThread(p1.x, p1.y, p2.x, p2.y, threadColor);
    }

    // D. パーティクル（刺繍の結び目）を描画
    fill(knotColor);
    noStroke();
    for (let i = 0; i < activePoints.length; i++) {
      let pt = activePoints[i];
      ellipse(pt.x, pt.y, samplingStep * 0.25, samplingStep * 0.25);
    }
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
