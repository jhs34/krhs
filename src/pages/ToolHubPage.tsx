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
      description: '태블릿 및 데스크톱 터치 기반 상품 결제(현금·계좌이체), 실시간 재고 연동, 직접 할인 적용 및 마감 정산 통합 시스템입니다.',
      icon: Store,
      path: '/tool/pos',
    },
  ];

  return (
    <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col space-y-12 sm:space-y-16">
      {/* Section 1: Editorial Header matching Dashboard.tsx */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={PORTAL_HEADER_TRANSITION}
        className="flex flex-col md:flex-row md:items-end justify-between border-b border-surface/10 pb-10 sm:pb-12 gap-6"
      >
        <div>
          <h1 className="font-sans font-bold text-2xl sm:text-3xl md:text-5xl text-white tracking-tighter mb-3 leading-[1.2] md:leading-[1.15]">
            교내 실무의 표준,<br />
            <span className="text-surface-dim">포털 도구함</span>
          </h1>
          <p className="text-surface-dim font-medium text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed break-keep">
            한국철도고등학교 교내 자치 및 매점 운영을 지원하는 통합 실무 터미널입니다.
          </p>
        </div>
      </motion.div>

      {/* Section 2: Tool List (Clean Editorial Surface) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {tools.map((tool, idx) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...PORTAL_CARD_TRANSITION, delay: 0.04 + idx * 0.05 }}
              className="lg:col-span-8"
            >
              <Link
                to={tool.path}
                className="group block p-6 sm:p-8 md:p-10 rounded-3xl bg-[#0a1120] border border-white/5 hover:border-white/15 active:scale-[0.995] transition-all duration-200 flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-11 h-11 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-white">
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                  </div>

                  <h2 className="font-sans font-bold text-xl sm:text-2xl md:text-3xl text-white tracking-tight group-hover:text-secondary-container transition-colors mb-2">
                    {tool.title}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-surface-dim mb-4">
                    {tool.subtitle}
                  </p>
                  <p className="text-xs sm:text-sm text-surface-dim/80 leading-relaxed max-w-xl">
                    {tool.description}
                  </p>
                </div>

                <div className="pt-6 mt-8 border-t border-white/5 flex items-center justify-between text-xs sm:text-sm font-medium text-white">
                  <span className="text-surface-dim text-xs">담당자 또는 관리자 인증 후 접속</span>
                  <div className="flex items-center space-x-1.5 text-white group-hover:translate-x-1 transition-transform">
                    <span className="font-bold">터미널 접속하기</span>
                    <ArrowRight className="w-4 h-4 text-secondary-container" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...PORTAL_CARD_TRANSITION, delay: 0.08 }}
          className="lg:col-span-4 flex flex-col justify-between p-6 sm:p-8 rounded-3xl border border-white/5 bg-white/[0.01]"
        >
          <div>
            <h3 className="text-lg font-bold text-white/80 tracking-tight mb-2">
              추가 실무 도구 준비 중
            </h3>
            <p className="text-xs sm:text-sm text-surface-dim/70 leading-relaxed">
              교내 물품 대여 및 분실물 통합 안내 모듈이 순차적으로 연결될 예정입니다.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
