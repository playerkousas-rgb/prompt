import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '提示站 Prompt Studio — 做卡 · 做章',
  description:
    '把填表變成看得見因果的提示詞工作台：欄位、卡面位置、prompt 片段三向連動，支援自備 API Key 直接生圖。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
