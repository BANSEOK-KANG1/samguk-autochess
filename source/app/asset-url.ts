/** Capacitor/Vite에서 CSS var(url)이 스타일시트 기준으로 깨지지 않게 루트 절대경로로 통일 */
export const assetUrl = (path: string) => {
  const trimmed = path.trim();
  if (!trimmed) return trimmed;
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  return `/${trimmed.replace(/^\.?\//, "")}`;
};

export const assetCssUrl = (path: string) => `url('${assetUrl(path)}')`;
