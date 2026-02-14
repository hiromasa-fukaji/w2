let system;

function setup() {
  // キャンバスのサイズ
  let c = createCanvas(210*3, 297*3);
  // キャンバスのIDを設定
  c.id('main-canvas');
  background(0);

  // デザインツール化ライブラリの読み込み
  system = new DesignSystem();
  // ファイルドロップのイベントハンドラを設定
  c.drop((file) => system.handleFileDrop(file, mouseX, mouseY));
}

function draw() {
  // --- 1. Outside: 全体の環境 ---
  // 色収差エフェクトが映えるように背景は黒
  background(0);

  // --- 2. logo2タグのオブジェクトを衛星のように360度移動させるアニメーション ---
  const logo2Elements = system.getGroup('logo2');
  if (logo2Elements.length > 0) {
    // 軌道の半径（ピクセル）
    const orbitRadius = 3;
    // 回転速度（1秒で1回転 = 60フレームで2πラジアン）
    const rotationSpeed = TWO_PI / 120; // 60フレームで1回転
    const currentAngle = (frameCount * rotationSpeed) % TWO_PI;
    
    // logo2タグの全要素を円軌道で移動
    logo2Elements.forEach((el, index) => {
      // 各要素の初期位置を中心として保存（初回のみ）
      if (typeof el._orbitCenterX === 'undefined') {
        el._orbitCenterX = el.x;
        el._orbitCenterY = el.y;
      }
      
      // 各要素ごとに角度をずらす（均等に配置）
      const angleOffset = (TWO_PI / logo2Elements.length) * index;
      const angle = currentAngle + angleOffset;
      
      // 円軌道の位置を計算
      el.x = el._orbitCenterX + cos(angle) * orbitRadius;
      el.y = el._orbitCenterY + sin(angle) * orbitRadius;
    });
  }

  // --- 3. System: 基本レンダリング（要素のレイアウト計算など）---
  system.render();

  // --- 3. Inside: 「logo」で指定された文字に色収差パーティクルを適用 ---
  system.drawInside('logo', (ctx) => {
    // A. 一度だけポイントをサンプリング（毎フレームの getPoints は禁止）
    if (!ctx.state.init || ctx.elementChanged()) {
      // サンプリングの粗さ（小さいほど粒子が増える）
      const samplingStep = 5;
      ctx.state.points = ctx.element.getPoints(samplingStep);
      ctx.state.samplingStep = samplingStep;
      ctx.state.init = true;
      ctx.markAsProcessed();
    }

    const points = ctx.state.points || [];
    const samplingStep = ctx.state.samplingStep || 6;

    // B. ベースとなるロゴ本体を通常描画（質感維持）
    ctx.drawAuto(0, 0);

    // C. 色収差パーティクル表現
    noStroke();

    // パーティクルをずらす量（ピクセル）
    const offset = 1.25;

    // 時間経過に応じて角度を回転させる
    const rotationSpeed = 0.04;
    const baseAngle = frameCount * rotationSpeed;

    // RGBそれぞれを120度ずつずらした方向に回転させる
    const colors = [
      { r: 11, g: 49,   b: 200,   angleOffset: 0 },            // 赤：0度
      { r: 255,   g: 222, b: 81,   angleOffset: TWO_PI / 3 },   // 緑：120度
      { r: 0,   g: 0,   b: 0, angleOffset: TWO_PI * 2 / 3 } // 青：240度
    ];

    // 描画モードを加算合成にする（色が重なるほど明るくなる）
    //blendMode(MULTIPLY);

    for (let c = 0; c < colors.length; c++) {
      const colorInfo = colors[c];

      // 各色の角度を計算（ベース角度 + 色ごとのオフセット）
      const angle = baseAngle + colorInfo.angleOffset;

      // 角度から X, Y オフセットを計算
      const offsetX = cos(angle) * offset;
      const offsetY = sin(angle) * offset;

      fill(colorInfo.r, colorInfo.g, colorInfo.b);

      // サンプリングしたポイントをパーティクルとして描画
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        ellipse(
          pt.x + offsetX,
          pt.y + offsetY,
          samplingStep * 0.5,
          samplingStep * 4
        );
      }
    }

    // ブレンドモードを元に戻す（他要素への影響を防ぐ）
    blendMode(BLEND);
  });
}
