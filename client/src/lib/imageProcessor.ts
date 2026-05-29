/**
 * LINE 貼圖裁切去背核心處理邏輯
 * 所有處理均在前端 Canvas API 完成，無需後端
 */

export interface ProcessOptions {
  cols: number;
  rows: number;
  autoCenter: boolean;
  forceSquare: boolean;
  removeHoles: boolean;
  bgTolerance: number;
  borderWidth: number;
  /** Custom column split positions as fractions 0-1 (length = cols-1). If undefined, use equal split. */
  customColPositions?: number[];
  /** Custom row split positions as fractions 0-1 (length = rows-1). If undefined, use equal split. */
  customRowPositions?: number[];
}

export interface ProcessResult {
  dataUrl: string;
  index: number;
  col: number;
  row: number;
}

/**
 * 主入口：裁切並處理圖片，回傳所有貼圖的 dataUrl 陣列
 */
export async function processImage(
  imageFile: File,
  options: ProcessOptions,
  onProgress?: (current: number, total: number) => void
): Promise<ProcessResult[]> {
  const img = await loadImage(imageFile);
  const { cols, rows, autoCenter, forceSquare, removeHoles, bgTolerance, borderWidth } = options;

  const total = cols * rows;
  const results: ProcessResult[] = [];

  // Build pixel boundaries from custom positions or equal split
  const colBoundaries: number[] = [0];
  if (options.customColPositions && options.customColPositions.length === cols - 1) {
    for (const p of options.customColPositions) colBoundaries.push(Math.round(p * img.width));
  } else {
    const cellW = img.width / cols;
    for (let i = 1; i < cols; i++) colBoundaries.push(Math.round(i * cellW));
  }
  colBoundaries.push(img.width);

  const rowBoundaries: number[] = [0];
  if (options.customRowPositions && options.customRowPositions.length === rows - 1) {
    for (const p of options.customRowPositions) rowBoundaries.push(Math.round(p * img.height));
  } else {
    const cellH = img.height / rows;
    for (let i = 1; i < rows; i++) rowBoundaries.push(Math.round(i * cellH));
  }
  rowBoundaries.push(img.height);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      onProgress?.(idx + 1, total);

      const x = colBoundaries[c];
      const y = rowBoundaries[r];
      const w = colBoundaries[c + 1] - x;
      const h = rowBoundaries[r + 1] - y;

      // 1. 裁切單格
      const cellCanvas = cropCell(img, x, y, w, h);

      // 2. 去背
      const removedBg = removeBackground(cellCanvas, bgTolerance, removeHoles);

      // 3. 自動置中（裁掉透明邊緣）
      const centered = autoCenter ? trimTransparent(removedBg) : removedBg;

      // 4. 強制正方形 + 加白邊
      const final = forceSquare
        ? makeSquareWithBorder(centered, borderWidth)
        : addBorder(centered, borderWidth);

      results.push({
        dataUrl: final.toDataURL('image/png'),
        index: idx,
        col: c,
        row: r,
      });
    }
  }

  return results;
}

/** 載入圖片為 HTMLImageElement */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** 裁切指定區域到新 Canvas */
function cropCell(
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
  return canvas;
}

/**
 * 去背：以四個角落的顏色為基準色，使用容許值比對並設為透明
 * 使用 flood fill 從四個角落開始
 */
function removeBackground(
  canvas: HTMLCanvasElement,
  tolerance: number,
  removeHoles: boolean
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const w = canvas.width;
  const h = canvas.height;

  // 取四個角落的顏色作為背景色樣本
  const corners = [
    getPixel(data, w, 0, 0),
    getPixel(data, w, w - 1, 0),
    getPixel(data, w, 0, h - 1),
    getPixel(data, w, w - 1, h - 1),
  ];

  // 從四個角落做 flood fill 去背
  const visited = new Uint8Array(w * h);
  const queue: number[] = [];

  const seedPoints = [
    [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
  ];

  for (const [sx, sy] of seedPoints) {
    const idx = sy * w + sx;
    if (!visited[idx]) {
      queue.push(idx);
      visited[idx] = 1;
    }
  }

  // 也從邊緣掃描，找出與角落顏色相近的邊緣像素
  for (let x = 0; x < w; x++) {
    floodFillSeed(data, w, h, x, 0, corners, tolerance, visited, queue);
    floodFillSeed(data, w, h, x, h - 1, corners, tolerance, visited, queue);
  }
  for (let y = 1; y < h - 1; y++) {
    floodFillSeed(data, w, h, 0, y, corners, tolerance, visited, queue);
    floodFillSeed(data, w, h, w - 1, y, corners, tolerance, visited, queue);
  }

  // BFS flood fill
  while (queue.length > 0) {
    const pos = queue.shift()!;
    const px = pos % w;
    const py = Math.floor(pos / w);

    // 設為透明
    data[pos * 4 + 3] = 0;

    // 檢查四個方向
    const neighbors = [
      [px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const nIdx = ny * w + nx;
      if (visited[nIdx]) continue;
      const pixel = getPixel(data, w, nx, ny);
      if (isBackgroundColor(pixel, corners, tolerance)) {
        visited[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }

  // 去除內部孔洞：對非透明區域內的透明像素做反轉（填充）
  if (removeHoles) {
    fillInternalHoles(data, w, h, visited);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function floodFillSeed(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  corners: [number, number, number, number][],
  tolerance: number,
  visited: Uint8Array,
  queue: number[]
) {
  const idx = y * w + x;
  if (visited[idx]) return;
  const pixel = getPixel(data, w, x, y);
  if (isBackgroundColor(pixel, corners, tolerance)) {
    visited[idx] = 1;
    queue.push(idx);
  }
}

/** 填充內部孔洞：從外部標記可達的透明像素，剩餘透明像素即為孔洞 */
function fillInternalHoles(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  bgVisited: Uint8Array
) {
  // 找出所有「已被去除的背景」像素，其餘透明像素為孔洞
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] === 0 && !bgVisited[i]) {
      // 這是內部孔洞，填充為白色（不透明）
      data[i * 4] = 255;
      data[i * 4 + 1] = 255;
      data[i * 4 + 2] = 255;
      data[i * 4 + 3] = 255;
    }
  }
}

/** 取得指定位置的 RGBA */
function getPixel(
  data: Uint8ClampedArray,
  w: number,
  x: number,
  y: number
): [number, number, number, number] {
  const i = (y * w + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

/** 判斷像素是否接近背景色（任一角落顏色） */
function isBackgroundColor(
  pixel: [number, number, number, number],
  corners: [number, number, number, number][],
  tolerance: number
): boolean {
  if (pixel[3] === 0) return true; // 已透明
  for (const corner of corners) {
    if (corner[3] === 0) continue;
    const dist = colorDistance(pixel, corner);
    if (dist <= tolerance) return true;
  }
  return false;
}

/** 計算兩個顏色的歐氏距離 */
function colorDistance(
  a: [number, number, number, number],
  b: [number, number, number, number]
): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 +
    (a[1] - b[1]) ** 2 +
    (a[2] - b[2]) ** 2
  );
}

/** 裁切透明邊緣（自動置中） */
function trimTransparent(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const w = canvas.width;
  const h = canvas.height;

  let minX = w, maxX = 0, minY = h, maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // 若完全透明，回傳原始
  if (minX > maxX || minY > maxY) return canvas;

  const newW = maxX - minX + 1;
  const newH = maxY - minY + 1;
  const newCanvas = document.createElement('canvas');
  newCanvas.width = newW;
  newCanvas.height = newH;
  const newCtx = newCanvas.getContext('2d')!;
  newCtx.drawImage(canvas, minX, minY, newW, newH, 0, 0, newW, newH);
  return newCanvas;
}

/** 補白邊（不強制正方形） */
function addBorder(canvas: HTMLCanvasElement, borderWidth: number): HTMLCanvasElement {
  if (borderWidth <= 0) return canvas;
  const newW = canvas.width + borderWidth * 2;
  const newH = canvas.height + borderWidth * 2;
  const newCanvas = document.createElement('canvas');
  newCanvas.width = newW;
  newCanvas.height = newH;
  const ctx = newCanvas.getContext('2d')!;
  ctx.drawImage(canvas, borderWidth, borderWidth);
  return newCanvas;
}

/** 強制正方形並加白邊 */
function makeSquareWithBorder(canvas: HTMLCanvasElement, borderWidth: number): HTMLCanvasElement {
  const size = Math.max(canvas.width, canvas.height) + borderWidth * 2;
  const newCanvas = document.createElement('canvas');
  newCanvas.width = size;
  newCanvas.height = size;
  const ctx = newCanvas.getContext('2d')!;
  const offsetX = Math.floor((size - canvas.width) / 2);
  const offsetY = Math.floor((size - canvas.height) / 2);
  ctx.drawImage(canvas, offsetX, offsetY);
  return newCanvas;
}
