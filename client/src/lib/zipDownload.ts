/**
 * 將多個 dataUrl 打包成 ZIP 並下載
 * 使用純前端實作，無需後端
 */

export async function downloadAsZip(
  items: { dataUrl: string; filename: string }[],
  zipName = 'stickers.zip'
): Promise<void> {
  // 動態載入 JSZip
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  for (const item of items) {
    // 將 dataUrl 轉為 Blob
    const res = await fetch(item.dataUrl);
    const blob = await res.blob();
    zip.file(item.filename, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSingle(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
