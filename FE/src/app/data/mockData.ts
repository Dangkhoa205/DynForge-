// Single source of truth for DynForge mock data.
// Currency is ALWAYS Vietnamese Dong (₫). Use formatCurrency everywhere.

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export type MentorRole =
  | 'Senior Student'
  | 'Alumni Mentor'
  | 'Lecturer'
  | 'Research Advisor';

export interface Mentor {
  id: string;
  name: string;
  avatar: string;
  role: MentorRole;
  verified: boolean;
  university: string;
  major: string;
  headline: string;
  about: string;
  rating: number;
  reviewsCount: number;
  sessionsCompleted: number;
  hourlyRate: number;   // 1-on-1 rate (VND/hr) — used for sorting/filtering
  groupRate: number;    // group session rate (VND/hr)
  responseTime: string;
  formats: ('Online' | 'Offline')[];
  languages: string[];
  level: 'Undergraduate' | 'Graduate' | 'Postgraduate';
  expertise: string[];
  courses: { code: string; name: string; ratePrivate?: number; rateGroup?: number }[];
  strengths: string[];
  nextAvailable: string;
}

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  course: string;
  text: string;
}

export interface Session {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorAvatar: string;
  course: string;
  dateTime: string;
  durationMinutes: number;
  format: 'Online' | 'Offline';
  status: 'Upcoming' | 'In Escrow' | 'Completed' | 'Cancelled';
  amount: number;
}

export interface Resource {
  id: string;
  type: 'Article' | 'PDF Guide' | 'Video' | 'Template';
  title: string;
  description: string;
  source: string;
  university: string;
  subject: string;
  level: string;
  url?: string;
}

export interface Transaction {
  id: string;
  student: string;
  mentor: string;
  date: string;
  amount: number;
  commission: number;
  status: 'Released' | 'In Escrow' | 'Refunded' | 'Pending Payout';
}

const A = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=320&q=80`;

export const mentors: Mentor[] = [
  {
    id: 'm1',
    name: 'Nguyễn Thị Linh',
    avatar: A('1531427888099-b3ecff6e1a6f'),
    role: 'Senior Student',
    verified: true,
    university: 'FPT University HCM Campus',
    major: 'Ngành Công nghệ thông tin',
    headline: 'Final-year IT student specialising in algorithms & competitive programming.',
    about:
      'I am a final-year Software Engineering student at FPT University HCM who has helped over 100 juniors master algorithms, data structures, and competitive programming. I focus on building intuition rather than memorisation.',
    rating: 4.9,
    reviewsCount: 128,
    sessionsCompleted: 214,
    hourlyRate: 110000,
    groupRate: 65000,
    responseTime: 'Under 1 hour',
    formats: ['Online', 'Offline'],
    languages: ['Vietnamese', 'English'],
    level: 'Undergraduate',
    expertise: ['Algorithms', 'Data Structures', 'Python', 'C++'],
    courses: [
      { code: 'PRF192', name: 'Programming Fundamentals' },
      { code: 'DSA201', name: 'Data Structures & Algorithms' },
      { code: 'PRO192', name: 'OOP with Java' },
    ],
    strengths: ['Problem solving', 'Exam preparation', 'Clear explanations'],
    nextAvailable: '2026-06-22T09:00:00',
  },
  {
    id: 'm2',
    name: 'Trần Minh Khoa',
    avatar: A('1554151228-14d9def656e4'),
    role: 'Lecturer',
    verified: true,
    university: 'FPT University HCM Campus',
    major: 'Ngành Khoa học máy tính',
    headline: 'AI & Machine Learning lecturer with 8 years of industry and teaching experience.',
    about:
      'I lecture AI and Machine Learning at FPT University HCM. I help students understand deep learning, computer vision, and NLP with real project examples from industry.',
    rating: 4.8,
    reviewsCount: 96,
    sessionsCompleted: 180,
    hourlyRate: 120000,
    groupRate: 70000,
    responseTime: 'Under 3 hours',
    formats: ['Online'],
    languages: ['Vietnamese', 'English'],
    level: 'Postgraduate',
    expertise: ['Machine Learning', 'Deep Learning', 'Python', 'Computer Vision'],
    courses: [
      { code: 'MAL301', name: 'Machine Learning' },
      { code: 'DLP401', name: 'Deep Learning Practices' },
      { code: 'NLP302', name: 'Natural Language Processing' },
    ],
    strengths: ['Deep theory', 'Project guidance', 'Research methods'],
    nextAvailable: '2026-06-23T14:00:00',
  },
  {
    id: 'm3',
    name: 'Phạm Thị Hoa',
    avatar: A('1580489944761-15a19d654956'),
    role: 'Alumni Mentor',
    verified: true,
    university: 'FPT University HCM Campus',
    major: 'Ngành Quản trị kinh doanh',
    headline: 'FPT Alumni now in product management — career & startup coaching.',
    about:
      'After graduating Business Administration at FPT HCM, I joined a tech startup as a PM. I coach students on career planning, startup ideas, case interviews, and academic writing.',
    rating: 4.9,
    reviewsCount: 154,
    sessionsCompleted: 240,
    hourlyRate: 105000,
    groupRate: 65000,
    responseTime: 'Under 2 hours',
    formats: ['Online', 'Offline'],
    languages: ['Vietnamese', 'English'],
    level: 'Graduate',
    expertise: ['Career Coaching', 'Product Management', 'Business Strategy', 'Academic Writing'],
    courses: [
      { code: 'MKT301', name: 'Marketing Management' },
      { code: 'ENT401', name: 'Entrepreneurship' },
      { code: 'MGT302', name: 'Strategic Management' },
    ],
    strengths: ['Career guidance', 'Mock interviews', 'CV review'],
    nextAvailable: '2026-06-21T16:00:00',
  },
  {
    id: 'm4',
    name: 'Lê Đức Khang',
    avatar: A('1506794778202-cad84cf45f1d'),
    role: 'Research Advisor',
    verified: true,
    university: 'FPT University HCM Campus',
    major: 'Ngành Công nghệ thông tin',
    headline: 'Master\'s student guiding capstone, thesis & research methodology.',
    about:
      'As a Master\'s student in Information Systems at FPT University, I support undergraduates with thesis planning, research design, statistical analysis, and academic publishing.',
    rating: 4.7,
    reviewsCount: 72,
    sessionsCompleted: 119,
    hourlyRate: 105000,
    groupRate: 60000,
    responseTime: 'Under 4 hours',
    formats: ['Online'],
    languages: ['Vietnamese', 'English'],
    level: 'Postgraduate',
    expertise: ['Thesis Support', 'Research Methods', 'Statistics', 'System Analysis'],
    courses: [
      { code: 'SWR302', name: 'Research Writing' },
      { code: 'ISM401', name: 'Information Systems Management' },
      { code: 'STA301', name: 'Applied Statistics' },
    ],
    strengths: ['Thesis structuring', 'Data analysis', 'Publishing'],
    nextAvailable: '2026-06-24T10:00:00',
  },
  {
    id: 'm5',
    name: 'Võ Thị Mai',
    avatar: A('1551632436-cbf9b30d8b03'),
    role: 'Senior Student',
    verified: true,
    university: 'FPT University HCM Campus',
    major: 'Ngành Quản trị kinh doanh',
    headline: 'Top-ranked Business student — SEO, content & analytics coaching.',
    about:
      'I am a top-ranked Digital Marketing student at FPT HCM who coaches peers on SEO, content strategy, Google Analytics, and exam preparation with consistent grade improvements.',
    rating: 4.8,
    reviewsCount: 88,
    sessionsCompleted: 142,
    hourlyRate: 100000,
    groupRate: 55000,
    responseTime: 'Under 1 hour',
    formats: ['Online', 'Offline'],
    languages: ['Vietnamese'],
    level: 'Undergraduate',
    expertise: ['SEO', 'Content Marketing', 'Google Analytics', 'Social Media'],
    courses: [
      { code: 'DMK301', name: 'Digital Marketing Fundamentals' },
      { code: 'SEO201', name: 'Search Engine Optimisation' },
      { code: 'ANA302', name: 'Marketing Analytics' },
    ],
    strengths: ['Grade improvement', 'Exam drills', 'Practical examples'],
    nextAvailable: '2026-06-22T13:00:00',
  },
  {
    id: 'm6',
    name: 'Bùi Anh Tú',
    avatar: A('1488426862026-3ee34a7d66df'),
    role: 'Alumni Mentor',
    verified: false,
    university: 'FPT University HCM Campus',
    major: 'Ngành Công nghệ thông tin',
    headline: 'Software engineer at FPT Software mentoring web & mobile projects.',
    about:
      'I work as a software engineer at FPT Software and mentor students through web development, mobile apps, and capstone projects with real-world engineering practices.',
    rating: 4.6,
    reviewsCount: 41,
    sessionsCompleted: 67,
    hourlyRate: 100000,
    groupRate: 75000,
    responseTime: 'Under 5 hours',
    formats: ['Online'],
    languages: ['Vietnamese', 'English'],
    level: 'Graduate',
    expertise: ['Web Development', 'React Native', 'Node.js', 'Databases'],
    courses: [
      { code: 'SWP391', name: 'Software Project' },
      { code: 'WEB301', name: 'Web Development' },
      { code: 'MOB402', name: 'Mobile App Development' },
    ],
    strengths: ['Capstone projects', 'Code review', 'System design'],
    nextAvailable: '2026-06-25T11:00:00',
  },
];

export const reviews: Review[] = [
  {
    id: 'r1',
    author: 'Trang Do',
    avatar: A('1534528741775-53994a69daeb'),
    rating: 5,
    date: '2026-06-10',
    course: 'CS301 Algorithms',
    text: 'Linh made dynamic programming finally click for me. I went from failing to an A. Highly recommend!',
  },
  {
    id: 'r2',
    author: 'Phuc Nguyen',
    avatar: A('1506794778202-cad84cf45f1d'),
    rating: 5,
    date: '2026-06-04',
    course: 'CS201 Data Structures',
    text: 'Very patient and structured. Explained graphs and trees with clear visuals. Booking and payment felt safe.',
  },
  {
    id: 'r3',
    author: 'Quynh Le',
    avatar: A('1517841905240-472988babdf9'),
    rating: 4,
    date: '2026-05-28',
    course: 'CS102 Intro to Programming',
    text: 'Great help preparing for my midterm. The escrow protection gave me peace of mind as a first-time user.',
  },
];

export const sessions: Session[] = [
  {
    id: 's1',
    mentorId: 'm1',
    mentorName: 'Nguyễn Thị Linh',
    mentorAvatar: A('1531427888099-b3ecff6e1a6f'),
    course: 'DSA201 Data Structures & Algorithms',
    dateTime: '2026-06-22T09:00:00',
    durationMinutes: 90,
    format: 'Online',
    status: 'Upcoming',
    amount: 165000, // 110k/hr × 1.5h
  },
  {
    id: 's2',
    mentorId: 'm3',
    mentorName: 'Phạm Thị Hoa',
    mentorAvatar: A('1580489944761-15a19d654956'),
    course: 'ENT401 Entrepreneurship',
    dateTime: '2026-06-20T16:00:00',
    durationMinutes: 60,
    format: 'Online',
    status: 'In Escrow',
    amount: 65000, // 65k/hr × 1h
  },
  {
    id: 's3',
    mentorId: 'm5',
    mentorName: 'Võ Thị Mai',
    mentorAvatar: A('1551632436-cbf9b30d8b03'),
    course: 'DMK301 Digital Marketing',
    dateTime: '2026-06-12T13:00:00',
    durationMinutes: 60,
    format: 'Offline',
    status: 'Completed',
    amount: 55000, // 55k/hr × 1h
  },
  {
    id: 's4',
    mentorId: 'm2',
    mentorName: 'Trần Minh Khoa',
    mentorAvatar: A('1554151228-14d9def656e4'),
    course: 'MAL301 Machine Learning',
    dateTime: '2026-06-05T14:00:00',
    durationMinutes: 60,
    format: 'Online',
    status: 'Completed',
    amount: 120000, // 120k/hr × 1h
  },
  {
    id: 's5',
    mentorId: 'm4',
    mentorName: 'Lê Đức Khang',
    mentorAvatar: A('1506794778202-cad84cf45f1d'),
    course: 'SWR302 Research Writing',
    dateTime: '2026-05-30T10:00:00',
    durationMinutes: 90,
    format: 'Online',
    status: 'Cancelled',
    amount: 157500, // 105k/hr × 1.5h
  },
];

export const resources: Resource[] = [
  {
    id: 'res1',
    type: 'PDF Guide',
    title: 'Mastering Dynamic Programming: A Practical Guide',
    description: 'Step-by-step patterns and worked examples to solve DP problems with confidence.',
    source: 'DynForge Academy',
    university: 'VNU University of Science',
    subject: 'Computer Science',
    level: 'Undergraduate',
  },
  {
    id: 'res2',
    type: 'Article',
    title: 'How to Structure Your Thesis in 6 Clear Stages',
    description: 'A research advisor breaks down the thesis writing process from proposal to defense.',
    source: 'Research Desk',
    university: 'VNU University of Science',
    subject: 'Research',
    level: 'Postgraduate',
  },
  {
    id: 'res3',
    type: 'Video',
    title: 'Case Interview Walkthrough for Business Students',
    description: 'A 25-minute mock case interview with feedback from a consulting alumnus.',
    source: 'Career Lab',
    university: 'Foreign Trade University',
    subject: 'Business',
    level: 'Graduate',
  },
  {
    id: 'res4',
    type: 'Template',
    title: 'Financial Model Starter Template (Excel)',
    description: 'A ready-to-use three-statement financial model for finance coursework.',
    source: 'Finance Toolkit',
    university: 'University of Economics HCMC',
    subject: 'Finance',
    level: 'Undergraduate',
  },
  {
    id: 'res5',
    type: 'Article',
    title: 'Circuit Analysis: Common Mistakes and How to Avoid Them',
    description: 'A lecturer explains the pitfalls students hit in EE210 and how to fix them.',
    source: 'Engineering Notes',
    university: 'Hanoi University of Science & Technology',
    subject: 'Engineering',
    level: 'Undergraduate',
  },
  {
    id: 'res6',
    type: 'PDF Guide',
    title: 'Academic Writing Checklist for Strong Papers',
    description: 'A concise checklist to polish structure, citations, and clarity before submission.',
    source: 'Writing Center',
    university: 'Foreign Trade University',
    subject: 'Writing',
    level: 'Graduate',
  },
];

export const transactions: Transaction[] = [
  { id: 'TXN-10241', student: 'Trang Do', mentor: 'Linh Nguyen', date: '2026-06-18', amount: 375000, commission: 56250, status: 'In Escrow' },
  { id: 'TXN-10240', student: 'Phuc Nguyen', mentor: 'Hoa Pham', date: '2026-06-17', amount: 350000, commission: 52500, status: 'Released' },
  { id: 'TXN-10239', student: 'Quynh Le', mentor: 'Mai Vo', date: '2026-06-16', amount: 220000, commission: 33000, status: 'Released' },
  { id: 'TXN-10238', student: 'Bao Tran', mentor: 'Dr. Minh Tran', date: '2026-06-15', amount: 337500, commission: 50625, status: 'Pending Payout' },
  { id: 'TXN-10237', student: 'Linh Ha', mentor: 'Khang Le', date: '2026-06-14', amount: 600000, commission: 0, status: 'Refunded' },
  { id: 'TXN-10236', student: 'Nam Vu', mentor: 'Anh Bui', date: '2026-06-13', amount: 300000, commission: 45000, status: 'Pending Payout' },
];

export const revenueTrend = [
  { month: 'Jan', revenue: 42000000, commission: 6300000 },
  { month: 'Feb', revenue: 51000000, commission: 7650000 },
  { month: 'Mar', revenue: 48500000, commission: 7275000 },
  { month: 'Apr', revenue: 63000000, commission: 9450000 },
  { month: 'May', revenue: 72500000, commission: 10875000 },
  { month: 'Jun', revenue: 81000000, commission: 12150000 },
];

/**
 * @deprecated The platform is now multi-university. Load universities from the
 * backend via `listUniversities()` in services/universityService.ts instead of
 * this hardcoded list. Kept only so existing imports do not break.
 */
export const universities = [
  'FPT University HCM Campus',
];

export const majors = [
  'Ngành Công nghệ thông tin',
  'Ngành Quản trị kinh doanh',
  'Ngành Công nghệ truyền thông',
  'Ngành Luật',
  'Ngành Khoa học máy tính',
  'Khối Ngành Ngôn ngữ',
];

export const subjects = [
  'Ngành Công nghệ thông tin',
  'Ngành Quản trị kinh doanh',
  'Ngành Công nghệ truyền thông',
  'Ngành Luật',
  'Ngành Khoa học máy tính',
  'Khối Ngành Ngôn ngữ',
];

export const academicLevels = ['Undergraduate', 'Graduate', 'Postgraduate'];

export function getMentor(id: string | undefined): Mentor | undefined {
  return mentors.find((m) => m.id === id);
}

// ─── Phase 2 additions ────────────────────────────────────────────────────────

export type DisputeStatus =
  | 'Open'
  | 'Waiting for Mentor'
  | 'Under Review'
  | 'Resolved'
  | 'Refunded'
  | 'Rejected';

export interface Dispute {
  id: string;
  sessionId: string;
  mentor: string;
  course: string;
  issueType: string;
  createdDate: string;
  status: DisputeStatus;
  reason: string;
  adminNote?: string;
}

export const disputes: Dispute[] = [
  {
    id: 'DSP-001',
    sessionId: 's2',
    mentor: 'Hoa Pham',
    course: 'Career Coaching',
    issueType: 'Session not attended',
    createdDate: '2026-06-21',
    status: 'Open',
    reason: 'The mentor did not show up at the scheduled time.',
  },
  {
    id: 'DSP-002',
    sessionId: 's4',
    mentor: 'Dr. Minh Tran',
    course: 'EE210 Circuit Analysis',
    issueType: 'Quality concern',
    createdDate: '2026-06-08',
    status: 'Under Review',
    reason: 'The session content did not match the advertised scope.',
    adminNote: 'Reviewing evidence submitted by both parties.',
  },
  {
    id: 'DSP-003',
    sessionId: 's3',
    mentor: 'Mai Vo',
    course: 'AC110 Financial Accounting',
    issueType: 'Refund request',
    createdDate: '2026-06-13',
    status: 'Resolved',
    reason: 'Requested refund due to scheduling conflict.',
    adminNote: 'Resolved — partial refund approved.',
  },
  {
    id: 'DSP-004',
    sessionId: 's5',
    mentor: 'Khang Le',
    course: 'BIO410 Research Methodology',
    issueType: 'Technical issue',
    createdDate: '2026-05-31',
    status: 'Refunded',
    reason: 'Platform crash prevented the session from starting.',
    adminNote: 'Full refund processed.',
  },
];

export interface WalletTransaction {
  id: string;
  date: string;
  type: 'Paid' | 'In Escrow' | 'Refunded' | 'Failed';
  mentor: string;
  course: string;
  amount: number;
  method: string;
  status: 'Completed' | 'Pending' | 'Refunded' | 'Failed';
}

export const walletTransactions: WalletTransaction[] = [
  { id: 'WTX-001', date: '2026-06-20', type: 'In Escrow', mentor: 'Hoa Pham', course: 'Career Coaching', amount: 350000, method: 'Wallet', status: 'Pending' },
  { id: 'WTX-002', date: '2026-06-18', type: 'Paid', mentor: 'Linh Nguyen', course: 'CS301 Algorithms', amount: 375000, method: 'Bank Transfer', status: 'Completed' },
  { id: 'WTX-003', date: '2026-06-12', type: 'Paid', mentor: 'Mai Vo', course: 'AC110 Financial Accounting', amount: 220000, method: 'Wallet', status: 'Completed' },
  { id: 'WTX-004', date: '2026-06-05', type: 'Paid', mentor: 'Dr. Minh Tran', course: 'EE210 Circuit Analysis', amount: 337500, method: 'Bank Transfer', status: 'Completed' },
  { id: 'WTX-005', date: '2026-05-30', type: 'Refunded', mentor: 'Khang Le', course: 'BIO410 Research Methodology', amount: 600000, method: 'Wallet', status: 'Refunded' },
  { id: 'WTX-006', date: '2026-05-18', type: 'Failed', mentor: 'Anh Bui', course: 'SE350 Software Engineering', amount: 300000, method: 'Bank Transfer', status: 'Failed' },
  { id: 'WTX-007', date: '2026-05-10', type: 'Paid', mentor: 'Linh Nguyen', course: 'CS201 Data Structures', amount: 250000, method: 'Wallet', status: 'Completed' },
];

export const walletBalance = 500000;
export const escrowHeld = 350000;
export const totalRefunded = 600000;
export const totalSpentAmount = walletTransactions
  .filter((t) => t.status === 'Completed')
  .reduce((s, t) => s + t.amount, 0);

// Teacher-facing session view
export interface TeacherSession {
  id: string;
  studentName: string;
  studentAvatar: string;
  course: string;
  dateTime: string;
  durationMinutes: number;
  mode: string;
  format: 'Online' | 'Offline';
  paymentStatus: 'In Escrow' | 'Released' | 'Refunded' | 'Pending';
  sessionStatus: 'Pending' | 'Upcoming' | 'Completed' | 'Cancelled';
  amount: number;
}

const SA = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=80&q=80`;

export const teacherSessions: TeacherSession[] = [
  { id: 'ts1', studentName: 'Trang Do', studentAvatar: SA('1534528741775-53994a69daeb'), course: 'CS301 Algorithms', dateTime: '2026-06-22T09:00:00', durationMinutes: 90, mode: '1-on-1', format: 'Online', paymentStatus: 'In Escrow', sessionStatus: 'Upcoming', amount: 375000 },
  { id: 'ts2', studentName: 'Phuc Nguyen', studentAvatar: SA('1506794778202-cad84cf45f1d'), course: 'CS201 Data Structures', dateTime: '2026-06-21T14:00:00', durationMinutes: 60, mode: '1-on-1', format: 'Online', paymentStatus: 'Pending', sessionStatus: 'Pending', amount: 250000 },
  { id: 'ts3', studentName: 'Quynh Le', studentAvatar: SA('1517841905240-472988babdf9'), course: 'CS102 Intro to Programming', dateTime: '2026-06-12T10:00:00', durationMinutes: 45, mode: '1-on-1', format: 'Offline', paymentStatus: 'Released', sessionStatus: 'Completed', amount: 187500 },
  { id: 'ts4', studentName: 'Bao Tran', studentAvatar: SA('1500648767791-00dcc994a43e'), course: 'CS301 Algorithms', dateTime: '2026-06-05T15:00:00', durationMinutes: 60, mode: 'Group', format: 'Online', paymentStatus: 'Released', sessionStatus: 'Completed', amount: 250000 },
  { id: 'ts5', studentName: 'Linh Ha', studentAvatar: SA('1544005313-94ddf0286df2'), course: 'CS201 Data Structures', dateTime: '2026-05-30T09:00:00', durationMinutes: 90, mode: '1-on-1', format: 'Online', paymentStatus: 'Refunded', sessionStatus: 'Cancelled', amount: 375000 },
];

export const teacherEarningsTrend = [
  { month: 'Jan', earnings: 2500000, sessions: 10 },
  { month: 'Feb', earnings: 3200000, sessions: 13 },
  { month: 'Mar', earnings: 2800000, sessions: 11 },
  { month: 'Apr', earnings: 4100000, sessions: 16 },
  { month: 'May', earnings: 4750000, sessions: 19 },
  { month: 'Jun', earnings: 5350000, sessions: 21 },
];

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
  status: 'Success' | 'Failed' | 'Warning';
}

export const auditLogs: AuditLog[] = [
  { id: 'AUD-001', action: 'Mentor approved', actor: 'admin@dynforge.vn', target: 'Linh Nguyen (m1)', timestamp: '2026-06-20T10:32:00', status: 'Success' },
  { id: 'AUD-002', action: 'Dispute resolved', actor: 'admin@dynforge.vn', target: 'DSP-003', timestamp: '2026-06-19T14:15:00', status: 'Success' },
  { id: 'AUD-003', action: 'Payout processed', actor: 'system', target: 'TXN-10240', timestamp: '2026-06-18T09:00:00', status: 'Success' },
  { id: 'AUD-004', action: 'User suspended', actor: 'admin@dynforge.vn', target: 'Anh Bui (m6)', timestamp: '2026-06-17T16:44:00', status: 'Warning' },
  { id: 'AUD-005', action: 'Payout failed', actor: 'system', target: 'TXN-10238', timestamp: '2026-06-16T11:20:00', status: 'Failed' },
  { id: 'AUD-006', action: 'Commission rate updated', actor: 'admin@dynforge.vn', target: 'Platform settings', timestamp: '2026-06-15T08:05:00', status: 'Success' },
];

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Student' | 'Mentor' | 'Admin';
  university: string;
  status: 'Active' | 'Suspended' | 'Pending';
  joined: string;
}

export const adminUsers: AdminUser[] = [
  { id: 'u1', name: 'Trang Do', email: 'trang@student.vnu.edu.vn', role: 'Student', university: 'VNU University of Science', status: 'Active', joined: '2026-03-10' },
  { id: 'u2', name: 'Phuc Nguyen', email: 'phuc@student.vnu.edu.vn', role: 'Student', university: 'VNU University of Science', status: 'Active', joined: '2026-03-18' },
  { id: 'u3', name: 'Linh Nguyen', email: 'linh@vnu.edu.vn', role: 'Mentor', university: 'VNU University of Science', status: 'Active', joined: '2026-01-05' },
  { id: 'u4', name: 'Dr. Minh Tran', email: 'minh.tran@hust.edu.vn', role: 'Mentor', university: 'Hanoi University of Science & Technology', status: 'Active', joined: '2026-01-12' },
  { id: 'u5', name: 'Hoa Pham', email: 'hoa.pham@ftu.edu.vn', role: 'Mentor', university: 'Foreign Trade University', status: 'Active', joined: '2026-02-01' },
  { id: 'u6', name: 'Anh Bui', email: 'anh.bui@hust.edu.vn', role: 'Mentor', university: 'Hanoi University of Science & Technology', status: 'Suspended', joined: '2026-02-20' },
  { id: 'u7', name: 'Quynh Le', email: 'quynh@student.ftu.edu.vn', role: 'Student', university: 'Foreign Trade University', status: 'Active', joined: '2026-04-03' },
  { id: 'u8', name: 'Admin DynForge', email: 'admin@dynforge.vn', role: 'Admin', university: '—', status: 'Active', joined: '2025-12-01' },
];
