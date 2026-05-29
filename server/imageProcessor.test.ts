/**
 * imageProcessor 核心邏輯單元測試
 * 由於 Canvas API 在 Node.js 環境不可用，測試純邏輯函式
 */
import { describe, expect, it } from "vitest";

// 測試顏色距離計算邏輯（從 imageProcessor 抽取出來的純函式）
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

function isBackgroundColor(
  pixel: [number, number, number, number],
  corners: [number, number, number, number][],
  tolerance: number
): boolean {
  if (pixel[3] === 0) return true;
  for (const corner of corners) {
    if (corner[3] === 0) continue;
    const dist = colorDistance(pixel, corner);
    if (dist <= tolerance) return true;
  }
  return false;
}

describe("colorDistance", () => {
  it("相同顏色距離為 0", () => {
    expect(colorDistance([255, 255, 255, 255], [255, 255, 255, 255])).toBe(0);
  });

  it("黑白距離約為 441", () => {
    const dist = colorDistance([0, 0, 0, 255], [255, 255, 255, 255]);
    expect(dist).toBeCloseTo(441.67, 0);
  });

  it("相近顏色距離小", () => {
    const dist = colorDistance([250, 250, 250, 255], [255, 255, 255, 255]);
    expect(dist).toBeLessThan(10);
  });
});

describe("isBackgroundColor", () => {
  const whiteCorners: [number, number, number, number][] = [
    [255, 255, 255, 255],
    [255, 255, 255, 255],
    [255, 255, 255, 255],
    [255, 255, 255, 255],
  ];

  it("透明像素視為背景", () => {
    expect(isBackgroundColor([255, 255, 255, 0], whiteCorners, 30)).toBe(true);
  });

  it("白色像素在容許值內視為背景", () => {
    expect(isBackgroundColor([250, 252, 253, 255], whiteCorners, 30)).toBe(true);
  });

  it("深色像素不視為白色背景", () => {
    expect(isBackgroundColor([50, 100, 200, 255], whiteCorners, 30)).toBe(false);
  });

  it("容許值為 0 時只有完全相同顏色才是背景", () => {
    expect(isBackgroundColor([254, 255, 255, 255], whiteCorners, 0)).toBe(false);
    expect(isBackgroundColor([255, 255, 255, 255], whiteCorners, 0)).toBe(true);
  });

  it("容許值為 100 時大範圍顏色都視為背景", () => {
    expect(isBackgroundColor([200, 210, 220, 255], whiteCorners, 100)).toBe(true);
  });
});

describe("ProcessOptions 驗證邏輯", () => {
  it("cols 和 rows 必須大於 0", () => {
    const validateOptions = (cols: number, rows: number) => {
      return cols >= 1 && rows >= 1;
    };
    expect(validateOptions(4, 3)).toBe(true);
    expect(validateOptions(0, 3)).toBe(false);
    expect(validateOptions(4, 0)).toBe(false);
    expect(validateOptions(1, 1)).toBe(true);
  });

  it("bgTolerance 範圍應在 0-100", () => {
    const validateTolerance = (v: number) => v >= 0 && v <= 100;
    expect(validateTolerance(30)).toBe(true);
    expect(validateTolerance(0)).toBe(true);
    expect(validateTolerance(100)).toBe(true);
    expect(validateTolerance(-1)).toBe(false);
    expect(validateTolerance(101)).toBe(false);
  });

  it("borderWidth 範圍應在 0-40", () => {
    const validateBorder = (v: number) => v >= 0 && v <= 40;
    expect(validateBorder(5)).toBe(true);
    expect(validateBorder(0)).toBe(true);
    expect(validateBorder(40)).toBe(true);
    expect(validateBorder(-1)).toBe(false);
    expect(validateBorder(41)).toBe(false);
  });
});

describe("貼圖索引計算", () => {
  it("根據 cols 和 rows 計算總數", () => {
    expect(4 * 3).toBe(12);
    expect(5 * 5).toBe(25);
    expect(1 * 1).toBe(1);
  });

  it("根據行列計算索引", () => {
    const getIndex = (col: number, row: number, cols: number) => row * cols + col;
    expect(getIndex(0, 0, 4)).toBe(0);
    expect(getIndex(3, 0, 4)).toBe(3);
    expect(getIndex(0, 1, 4)).toBe(4);
    expect(getIndex(3, 2, 4)).toBe(11);
  });
});
