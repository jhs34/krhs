import { Link } from 'react-router-dom';
import { Store, ArrowRight, Sparkles, Wrench, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export function ToolHubPage() {
  const tools = [
    {
      id: 'pos',
      title: '학생회 매점 POS 시스템',
      subtitle: 'KRHS 학생회 수요매점 결제·재고 관리·정산 시스템',
      description: '태블릿 터치 기반 상품 결제(현금/계좌이체), 실시간 재고 차감, 품목 관리 및 당일 마감 정산 도구입니다.',
      icon: Store,
      path: '/tool/pos',
      badge: '수요매점',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      status: '운영 중',
      category: '학생회 자치 도구',
    },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col justify-start py-10 md:py-16 px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 max-w-7xl mx-auto w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8 md:mb-12"
      >
        <div className="flex items-center space-x-2 text-xs font-bold text-secondary uppercase tracking-widest mb-2">
          <Wrench className="w-4 h-4" />
          <span>KRHS Tools & Utilities</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
          포털 도구함 (Tool)
        </h1>
        <p className="text-sm md:text-base text-surface-dim mt-2 max-w-2xl leading-relaxed">
          한국철도고등학교 학생회 및 교내 활동을 지원하는 실무 도구 모음입니다. 사용할 도구를 선택하세요.
        </p>
      </motion.div>

      {/* Tool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tools.map((tool, idx) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            >
              <Link
                to={tool.path}
                className="group relative block p-6 rounded-3xl bg-[#0e1628]/80 hover:bg-[#131f38] border border-white/10 hover:border-secondary/50 shadow-xl transition-all duration-300 flex flex-col justify-between h-full overflow-hidden"
              >
                {/* Background ambient glow */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-secondary/10 group-hover:bg-secondary/20 rounded-full blur-2xl transition-all duration-300 pointer-events-none" />

                <div>
                  {/* Top line badges */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-semibold text-surface-dim">
                      {tool.category}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${tool.badgeColor}`}>
                      {tool.badge}
                    </span>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-start space-x-3.5 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-secondary/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-lg font-bold text-white group-hover:text-secondary-fixed transition-colors">
                        {tool.title}
                      </h2>
                      <p className="text-xs text-surface-dim mt-0.5 line-clamp-1">
                        {tool.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-surface-dim/80 leading-relaxed mb-6">
                    {tool.description}
                  </p>
                </div>

                {/* Footer launch button */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center space-x-1.5 text-secondary">
                    <ShieldCheck className="w-4 h-4" />
                    <span>전용 계정 인증 필요</span>
                  </span>
                  <div className="flex items-center space-x-1 text-surface-dim group-hover:text-white transition-colors">
                    <span>실행하기</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}

        {/* Coming soon placeholder card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-full border-dashed"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-surface-dim/40 mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-surface-dim">새로운 학생회 도구 준비 중</h3>
            <p className="text-xs text-surface-dim/60 mt-1 leading-relaxed">
              교내 대여 관리, 분실물 등록 등 추가적인 편의 도구가 업데이트될 예정입니다.
            </p>
          </div>
          <span className="text-[11px] text-surface-dim/40 font-mono mt-6">COMING SOON</span>
        </motion.div>
      </div>
    </div>
  );
}
