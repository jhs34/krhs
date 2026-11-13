import { Link } from 'react-router-dom';
import { Store, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { PORTAL_CARD_TRANSITION, PORTAL_HEADER_TRANSITION } from '../utils/motion';

export function ToolHubPage() {
  const tools = [
    {
      id: 'pos',
      title: '매점 POS 터미널',
      subtitle: '상품 결제 · 재고 관리 · 일일 마감 정산',
      description:
        '태블릿 및 데스크톱 터치 기반 상품 결제(현금·계좌이체), 실시간 재고 연동, 직접 할인 적용 및 마감 정산을 지원합니다.',
      icon: Store,
      path: '/tool/pos',
    },
  ];

  return (
    <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col space-y-10 sm:space-y-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={PORTAL_HEADER_TRANSITION}
        className="border-b border-white/[0.08] pb-8 sm:pb-10"
      >
        <h1 className="font-sans font-semibold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight mb-2.5 leading-[1.2]">
          교내 실무 도구
        </h1>
        <p className="text-surface-dim font-normal text-sm sm:text-base max-w-2xl leading-relaxed break-keep">
          한국철도고등학교 학생자치 및 매점 운영에 사용하는 전용 실무 터미널입니다.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {tools.map((tool, idx) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...PORTAL_CARD_TRANSITION, delay: 0.04 + idx * 0.05 }}
              className="lg:col-span-8"
            >
              <Link
                to={tool.path}
                className="group block p-6 sm:p-8 rounded-2xl bg-[#0a1120] border border-white/[0.08] hover:border-white/[0.18] hover:bg-[#0f182b] active:scale-[0.995] transition-[background-color,border-color,transform] duration-150 flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                  </div>

                  <h2 className="font-sans font-semibold text-xl sm:text-2xl text-white tracking-tight group-hover:text-secondary-container transition-colors mb-1.5">
                    {tool.title}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-surface-dim mb-3">
                    {tool.subtitle}
                  </p>
                  <p className="text-sm text-surface-dim/85 leading-relaxed max-w-xl break-keep">
                    {tool.description}
                  </p>
                </div>

                <div className="pt-5 mt-7 border-t border-white/[0.08] flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-surface-dim text-xs">담당자 PIN 또는 관리자 인증 후 접속</span>
                  <div className="flex items-center space-x-1.5 text-white font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>터미널 열기</span>
                    <ArrowRight className="w-4 h-4 text-secondary-container" strokeWidth={1.75} />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
