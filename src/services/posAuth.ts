import { PosUser } from '../types/pos';
import { logPosActivity } from './posFirestore';

export interface PosAccount {
  id: string;
  username: string;
  pin: string; // password (4-digit number)
  name: string;
  role: 'admin' | 'staff';
}

// Student operator accounts extracted from table (Total 27 students)
export const POS_ACCOUNTS: PosAccount[] = [
  { id: 'pos-1204', username: '백남준', pin: '1204', name: '백남준', role: 'staff' },
  { id: 'pos-1301', username: '강민기', pin: '1301', name: '강민기', role: 'staff' },
  { id: 'pos-1307', username: '김준영', pin: '1307', name: '김준영', role: 'staff' },
  { id: 'pos-1308', username: '김태훈', pin: '1308', name: '김태훈', role: 'staff' },
  { id: 'pos-1309', username: '남재호', pin: '1309', name: '남재호', role: 'staff' },
  { id: 'pos-1312', username: '박준상', pin: '1312', name: '박준상', role: 'staff' },
  { id: 'pos-1313', username: '서지환', pin: '1313', name: '서지환', role: 'staff' },
  { id: 'pos-1315', username: '신수종', pin: '1315', name: '신수종', role: 'staff' },
  { id: 'pos-1316', username: '신준영', pin: '1316', name: '신준영', role: 'staff' },
  { id: 'pos-1318', username: '안형진', pin: '1318', name: '안형진', role: 'staff' },
  { id: 'pos-1319', username: '이상현', pin: '1319', name: '이상현', role: 'staff' },
  { id: 'pos-1401', username: '김상현', pin: '1401', name: '김상현', role: 'staff' },
  { id: 'pos-1403', username: '김재원', pin: '1403', name: '김재원', role: 'staff' },
  { id: 'pos-2106', username: '양희우', pin: '2106', name: '양희우', role: 'staff' },
  { id: 'pos-2108', username: '이다현', pin: '2108', name: '이다현', role: 'staff' },
  { id: 'pos-2109', username: '이수민', pin: '2109', name: '이수민', role: 'staff' },
  { id: 'pos-2113', username: '정서진', pin: '2113', name: '정서진', role: 'staff' },
  { id: 'pos-2311', username: '손재빈', pin: '2311', name: '손재빈', role: 'staff' },
  { id: 'pos-2314', username: '이병규', pin: '2314', name: '이병규', role: 'staff' },
  { id: 'pos-2317', username: '정규헌', pin: '2317', name: '정규헌', role: 'staff' },
  { id: 'pos-2319', username: '진수환', pin: '2319', name: '진수환', role: 'staff' },
  { id: 'pos-2321', username: '하성호', pin: '2321', name: '하성호', role: 'staff' },
  { id: 'pos-2410', username: '신성웅', pin: '2410', name: '신성웅', role: 'staff' },
  { id: 'pos-3212', username: '이소정', pin: '3212', name: '이소정', role: 'staff' },
  { id: 'pos-3303', username: '김명준', pin: '3303', name: '김명준', role: 'staff' },
  { id: 'pos-3114', username: '정민제', pin: '3114', name: '정민제', role: 'staff' },
  { id: 'pos-3318', username: '주우현', pin: '3318', name: '주우현', role: 'staff' },
];

const STORAGE_KEY = 'krhs_pos_user_session';

export const ADMIN_EMAILS = ['jhs34.kr@gmail.com', 'hoya100304@gmail.com'];

export function isGoogleAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(clean);
}

export function getStoredPosUser(): PosUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as PosUser;
    // If Admin user (e.g. Google Admin), valid
    if (user.role === 'admin') {
      return user;
    }
    // Check if user still exists in student operator accounts
    const exists = POS_ACCOUNTS.some(
      acc => acc.id === user.id || acc.username === user.username || acc.name === user.name
    );
    if (!exists) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function createGoogleAdminPosUser(
  email: string,
  displayName?: string | null,
  uid?: string
): PosUser {
  const cleanEmail = email.toLowerCase().trim();
  const name =
    displayName ||
    (cleanEmail === 'jhs34.kr@gmail.com' ? '관리자 (jhs34)' : cleanEmail.split('@')[0]);

  const adminUser: PosUser = {
    id: uid || `google-${cleanEmail}`,
    username: cleanEmail,
    name: name,
    role: 'admin',
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
  } catch (e) {
    console.error('Failed to save pos admin session', e);
  }

  logPosActivity({
    action: 'USER_LOGIN',
    actionTitle: '구글 관리자 로그인',
    category: 'AUTH',
    actorName: `${adminUser.name} (관리자)`,
    actorUid: adminUser.id,
    details: `구글 계정(${cleanEmail})으로 POS 관리자 로그인`,
    metadata: { email: cleanEmail, name: adminUser.name, uid: adminUser.id, role: 'admin' },
  }).catch(() => {});

  return adminUser;
}

export function loginPosUser(usernameInput: string, pinInput: string): { success: boolean; user?: PosUser; error?: string } {
  const cleanInput = usernameInput.trim();
  const cleanPin = pinInput.trim();

  if (!cleanInput) {
    return { success: false, error: '아이디를 입력해 주세요.' };
  }
  if (!cleanPin) {
    return { success: false, error: '비밀번호(4자리 번호)를 입력해 주세요.' };
  }

  // ID must match Korean Name (username/name) only, PIN must match the 4-digit number
  const matched = POS_ACCOUNTS.find(
    acc =>
      (acc.name === cleanInput || acc.username === cleanInput) &&
      acc.pin === cleanPin
  );

  if (!matched) {
    return { success: false, error: '이름 또는 비밀번호가 올바르지 않습니다.' };
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
    actorName: `${user.name}`,
    actorUid: user.id,
    details: `[${user.name} / ${matched.pin}] 계정으로 POS 로그인 성공`,
    metadata: { username: user.username, name: user.name, pin: matched.pin, role: user.role },
  }).catch(() => {});

  return { success: true, user };
}

export function logoutPosUser(currentUser?: PosUser | null): void {
  const user = currentUser || getStoredPosUser();
  if (user) {
    logPosActivity({
      action: 'USER_LOGOUT',
      actionTitle: user.role === 'admin' ? '관리자 로그아웃' : '담당자 로그아웃',
      category: 'AUTH',
      actorName: `${user.name}${user.role === 'admin' ? ' (관리자)' : ''}`,
      actorUid: user.id,
      details: `[${user.username || user.name}] 계정 POS 로그아웃`,
      metadata: { username: user.username, role: user.role },
    }).catch(() => {});
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear pos session', e);
  }
}
