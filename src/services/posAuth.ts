import { PosUser } from '../types/pos';
import { logPosActivity } from './posFirestore';

export interface PosAccount {
  id: string;
  username: string;
  pin: string; // password
  name: string;
  role: 'admin' | 'staff';
}

// User-specified account list (can be easily extended)
export const POS_ACCOUNTS: PosAccount[] = [
  {
    id: 'staff-1',
    username: 'admin',
    pin: '1234',
    name: '김철도',
    role: 'admin',
  },
  {
    id: 'staff-2',
    username: 'staff',
    pin: '1234',
    name: '이영업',
    role: 'staff',
  },
  {
    id: 'staff-3',
    username: 'pos2',
    pin: '1234',
    name: '박학생',
    role: 'staff',
  },
];

const STORAGE_KEY = 'krhs_pos_user_session';

export function getStoredPosUser(): PosUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PosUser;
  } catch {
    return null;
  }
}

export function loginPosUser(username: string, pin: string): { success: boolean; user?: PosUser; error?: string } {
  const matched = POS_ACCOUNTS.find(
    acc => acc.username.trim() === username.trim() && acc.pin.trim() === pin.trim()
  );

  if (!matched) {
    return { success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' };
  }

  const user: PosUser = {
    id: matched.id,
    username: matched.username,
    name: matched.name,
    role: matched.role,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save pos session', e);
  }

  logPosActivity({
    action: 'USER_LOGIN',
    actionTitle: '담당자 로그인',
    category: 'AUTH',
    actorName: `${user.name} (${user.role === 'admin' ? '관리자' : '판매원'})`,
    actorUid: user.id,
    details: `[${user.username}] 계정으로 POS 로그인 성공`,
    metadata: { username: user.username, role: user.role },
  }).catch(() => {});

  return { success: true, user };
}

export function logoutPosUser(currentUser?: PosUser | null): void {
  const user = currentUser || getStoredPosUser();
  if (user) {
    logPosActivity({
      action: 'USER_LOGOUT',
      actionTitle: '담당자 로그아웃',
      category: 'AUTH',
      actorName: `${user.name} (${user.role === 'admin' ? '관리자' : '판매원'})`,
      actorUid: user.id,
      details: `[${user.username}] 계정 POS 로그아웃`,
      metadata: { username: user.username, role: user.role },
    }).catch(() => {});
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear pos session', e);
  }
}
