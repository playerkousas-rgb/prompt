import Link from 'next/link';
import { ArrowRight, Gem, Layers, MousePointerClick, KeyRound, Sparkles, Wrench, Gift } from 'lucide-react';

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-14">
      <header className="mb-12">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">Prompt Studio</p>
        <h1 className="text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">提示站</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
          把「填一堆欄位 → 吐出一坨文字」變成<strong className="text-slate-200">看得見因果</strong>的工作台。
          欄位、卡面位置、提示詞片段三向連動；想自己出圖就接上你的 API Key，不想接就把提示詞複製走。
        </p>
      </header>

      <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/card"
          className="group panel relative overflow-hidden p-6 transition hover:border-cyan-400/60"
        >
          <div className="mb-3 inline-flex rounded-xl bg-cyan-400/10 p-2.5 text-cyan-400">
            <Layers size={22} />
          </div>
          <h2 className="mb-1 text-xl font-bold text-slate-100">做卡</h2>
          <p className="mb-4 text-xs leading-relaxed text-slate-400">
            Pokémon、One Piece、Yu-Gi-Oh! 三套卡牌系統。每套都有自己的卡面解剖圖、專屬欄位與美術風格庫。
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
            開始 <ArrowRight size={13} className="transition group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          href="/badge"
          className="group panel relative overflow-hidden p-6 transition hover:border-amber-400/60"
        >
          <div className="mb-3 inline-flex rounded-xl bg-amber-400/10 p-2.5 text-amber-400">
            <Gem size={22} />
          </div>
          <h2 className="mb-1 text-xl font-bold text-slate-100">做章</h2>
          <p className="mb-4 text-xs leading-relaxed text-slate-400">
            童軍紀念章與巾圈。先問平面設計（構圖、符號、文字弧、配色），工藝放最後；
            紀念章還會多給一份<strong className="text-slate-300">可以直接寄給工廠的中文規格單</strong>。
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            開始 <ArrowRight size={13} className="transition group-hover:translate-x-1" />
          </span>
        </Link>
        <Link
          href="/gift"
          className="group panel relative overflow-hidden p-6 transition hover:border-sky-400/60"
        >
          <div className="mb-3 inline-flex rounded-xl bg-sky-400/10 p-2.5 text-sky-400">
            <Gift size={22} />
          </div>
          <h2 className="mb-1 text-xl font-bold text-slate-100">紀念品</h2>
          <p className="mb-4 text-xs leading-relaxed text-slate-400">
            重點是<strong className="text-slate-300">先把平面圖設計完</strong>，之後只是放到哪一種東西上：
            T 恤、帆布袋、馬克杯、鑰匙圈、毛巾、旗子…… 主視覺一張，套用提示詞一樣一段。
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400">
            開始 <ArrowRight size={13} className="transition group-hover:translate-x-1" />
          </span>
        </Link>
      </div>

      <section className="mb-12">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">設計原則</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Principle
            icon={<MousePointerClick size={18} />}
            title="看得見因果"
            body="滑過任何一個欄位，卡面上對應的位置與提示詞裡對應的那段話會同時亮起來。不用猜哪格有用。"
          />
          <Principle
            icon={<Sparkles size={18} />}
            title="鎖定 or 交給 AI"
            body="每個欄位都能切換：角色名自己填死，招式名與風味文字就讓生圖 AI 自由發揮。"
          />
          <Principle
            icon={<KeyRound size={18} />}
            title="你的 Key，你的圖"
            body="OpenAI、Gemini、Stability 自備金鑰直接出圖；或用免金鑰的 Pollinations 先試構圖。"
          />
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-3 flex items-center gap-2 text-slate-300">
          <Wrench size={15} />
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em]">為什麼不直接用 CSS 把卡畫出來</h3>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          因為實測下來，用 HTML/CSS 模擬印刷卡面的成果，<strong className="text-slate-200">比不上把一段好的提示詞丟給生圖模型</strong>。
          所以這裡的卡面圖只擔任「對照用的解剖圖」—— 它的工作是讓你知道每個欄位落在哪，而不是假裝自己是成品。
          真正的成品，交給 AI。
        </p>
      </section>

      <footer className="mt-12 text-center text-[11px] text-slate-600">
        所有輸入與 API Key 只存在你的瀏覽器 · 不經過任何資料庫
      </footer>
    </div>
  );
}

function Principle({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="panel p-4">
      <div className="mb-2 inline-flex rounded-lg bg-slate-800/70 p-2 text-cyan-400">{icon}</div>
      <h4 className="mb-1 text-sm font-semibold text-slate-100">{title}</h4>
      <p className="text-[11.5px] leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}
