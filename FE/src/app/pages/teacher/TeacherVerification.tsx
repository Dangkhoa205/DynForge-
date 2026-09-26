import { useState, useRef, useEffect } from 'react';
import {
  Upload, FileText, Mail, Mic, BadgeCheck, X,
  CheckCircle2, Award, BookOpen, Briefcase, Loader2, AlertCircle, Plus, Trash2,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { StepProgress } from '../../components/common';
import { cn } from '../../components/ui/utils';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useUniversity } from '../../context/UniversityContext';
import { majors } from '../../data/mockData';
import {
  listMyVerifications, submitVerification, type VerificationItem,
} from '../../services/verificationService';
import {
  getMyMentorProfile, updateMyMentorProfile, type BackendCourse,
} from '../../services/mentorService';
import { requestSchoolEmail, verifySchoolEmail } from '../../services/schoolEmailService';

// Must match the mentee search filter options (MentorListing).
const TEACHING_ROLES = ['Senior Student', 'Alumni Mentor', 'Lecturer', 'Research Advisor'];

const steps = [
  'Basic information',
  'University email',
  'Documents upload',
  'Interview',
  'Approved',
];

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  preview?: string;
}

interface CourseRow {
  code: string;
  name: string;
  grade: 'A' | 'A+';
  ratePrivate: string;
  rateGroup: string;
}

const emptyCourse = (): CourseRow => ({ code: '', name: '', grade: 'A', ratePrivate: '100000', rateGroup: '60000' });

const certTypes = [
  { key: 'transcript', icon: BookOpen, label: 'Academic Transcript', desc: 'Official transcript or grade report from your university.', accept: '.pdf,.jpg,.png' },
  { key: 'certificate', icon: Award, label: 'Certificates & Awards', desc: 'Relevant course certificates, competition awards, or scholarships.', accept: '.pdf,.jpg,.png' },
  { key: 'portfolio', icon: Briefcase, label: 'Portfolio / Work Samples', desc: 'Projects, capstone work, or professional experience evidence.', accept: '.pdf,.jpg,.png,.zip' },
  { key: 'id', icon: FileText, label: 'Student / Staff ID', desc: 'Your valid university student card or staff ID.', accept: '.jpg,.png' },
];

function UploadZone({
  certKey, accept, files, onAdd, onRemove,
}: {
  certKey: string; accept: string;
  files: UploadedFile[];
  onAdd: (key: string, files: UploadedFile[]) => void;
  onRemove: (key: string, name: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFiles = (fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((f) => ({
      name: f.name, size: f.size, type: f.type,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    }));
    onAdd(certKey, newFiles);
    toast.success(`${newFiles.length} file${newFiles.length > 1 ? 's' : ''} added.`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="mt-3 space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-sm transition-colors',
          dragging ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-accent/40 text-muted-foreground hover:border-primary/50 hover:bg-accent'
        )}
      >
        <span className={cn('flex size-11 items-center justify-center rounded-xl', dragging ? 'bg-primary/15 text-primary' : 'bg-accent text-muted-foreground')}>
          <Upload className="size-5" />
        </span>
        <div className="text-center">
          <p style={{ fontWeight: 600 }} className={dragging ? 'text-primary' : 'text-foreground'}>
            {dragging ? 'Drop files here' : 'Click to upload or drag & drop'}
          </p>
          <p className="text-xs mt-0.5">Accepted: {accept} · Max 10 MB per file</p>
        </div>
      </button>
      <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={(e) => { if (e.target.files?.length) processFiles(e.target.files); e.target.value = ''; }} />
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              {f.preview
                ? <img src={f.preview} alt={f.name} className="size-10 rounded-lg object-cover" />
                : <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="size-5" /></span>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm" style={{ fontWeight: 500 }}>{f.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(f.size)}</p>
              </div>
              <CheckCircle2 className="size-4 shrink-0 text-success" />
              <button type="button" onClick={() => onRemove(certKey, f.name)} className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-danger">
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const baseDocuments = [
  { icon: Mail, title: 'University email verification', description: 'Verify your university email address to confirm your enrollment.' },
  { icon: Mic, title: 'Verification interview', description: 'A short 15-minute online call with a DynForge team member.' },
];

export function TeacherVerification() {
  const { refreshUser } = useAuth();
  const { T, lang } = useLanguage();
  const { universities } = useUniversity();
  const [existing, setExisting] = useState<VerificationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Profile fields
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [major, setMajor] = useState('');
  const [university, setUniversity] = useState('FPT University HCM');
  const [universityCode, setUniversityCode] = useState('');

  // School-email verification (see mục A — copies the OTP flow)
  const [schoolEmail, setSchoolEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [schoolBusy, setSchoolBusy] = useState(false);
  const [schoolVerified, setSchoolVerified] = useState(false);

  const requestSchool = async () => {
    if (!schoolEmail.trim()) { toast.error(T.schoolEmailPrompt); return; }
    setSchoolBusy(true);
    try {
      await requestSchoolEmail(schoolEmail.trim());
      setOtpSent(true);
      toast.success(T.schoolEmailSent);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to send code.');
    } finally {
      setSchoolBusy(false);
    }
  };

  const confirmSchool = async () => {
    if (!otp.trim()) { toast.error(T.schoolEmailOtpPrompt); return; }
    setSchoolBusy(true);
    try {
      const me = await verifySchoolEmail(otp.trim());
      setSchoolVerified(true);
      if (me.universityName) setUniversity(me.universityName);
      if (me.universityCode) setUniversityCode(me.universityCode);
      toast.success(T.schoolEmailVerified);
      await refreshUser();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Invalid or expired code.');
    } finally {
      setSchoolBusy(false);
    }
  };
  const [teachingRole, setTeachingRole] = useState('Senior Student');
  const [skills, setSkills] = useState('');
  const [languages, setLanguages] = useState('Vietnamese, English');
  const [courses, setCourses] = useState<CourseRow[]>([emptyCourse()]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile[]>>({});

  const totalUploaded = Object.values(uploadedFiles).flat().length;
  const transcriptFile = (uploadedFiles['transcript'] ?? [])[0];

  useEffect(() => {
    Promise.all([
      listMyVerifications().catch(() => []),
      getMyMentorProfile().catch(() => null),
    ]).then(([items, prof]) => {
      setExisting(items[0] ?? null);
      if (prof) {
        setTitle(prof.title ?? '');
        setBio(prof.bio ?? '');
        if (prof.major) setMajor(prof.major);
        if (prof.university) setUniversity(prof.university);
        if (prof.teachingRole) setTeachingRole(prof.teachingRole);
        setSkills((prof.skills ?? []).join(', '));
        setLanguages((prof.languages ?? []).join(', ') || 'Vietnamese, English');
        if (prof.courses?.length) {
          setCourses(prof.courses.map((c) => ({
            code: c.code, name: c.name, grade: (c.grade === 'A+' ? 'A+' : 'A'),
            ratePrivate: String(c.ratePrivate), rateGroup: String(c.rateGroup),
          })));
        }
      }
    }).finally(() => setLoading(false));
  }, []);

  // Preselect the university dropdown by matching the loaded profile name.
  useEffect(() => {
    if (universityCode || !universities.length) return;
    const match = universities.find((u) => u.name === university || u.shortName === university);
    if (match) setUniversityCode(match.code);
  }, [universities, university, universityCode]);

  const addFiles = (key: string, files: UploadedFile[]) =>
    setUploadedFiles((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...files] }));

  const removeFile = (key: string, name: string) =>
    setUploadedFiles((prev) => ({ ...prev, [key]: (prev[key] ?? []).filter((f) => f.name !== name) }));

  const updateCourse = (i: number, patch: Partial<CourseRow>) =>
    setCourses((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const addCourse = () => setCourses((prev) => [...prev, emptyCourse()]);
  const removeCourse = (i: number) => setCourses((prev) => prev.filter((_, idx) => idx !== i));

  const isApproved = existing?.status === 'APPROVED';

  const handleSubmit = async () => {
    const valid = courses
      .filter((c) => c.code.trim() && c.name.trim())
      .map<BackendCourse>((c) => ({
        code: c.code.trim().toUpperCase(),
        name: c.name.trim(),
        grade: c.grade,
        ratePrivate: Number(c.ratePrivate) || 0,
        rateGroup: Number(c.rateGroup) || 0,
      }));

    if (!major) { toast.error('Please select your major.'); return; }
    if (valid.length === 0) { toast.error('Please add at least one course with a code and name.'); return; }
    if (!isApproved && totalUploaded === 0) { toast.error('Please upload at least one document.'); return; }

    setSubmitting(true);
    try {
      // Create/update the mentor profile with all courses so mentees can see them.
      await updateMyMentorProfile({
        title: title.trim(),
        bio: bio.trim(),
        major: major || undefined,
        university: university.trim() || undefined,
        teachingRole,
        courses: valid,
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        languages: languages.split(',').map((s) => s.trim()).filter(Boolean),
        formats: ['Online', 'Offline'],
      });

      if (isApproved) {
        // Already verified — just save the updated courses.
        toast.success('Courses updated. They are now visible to students.');
      } else {
        // Submit a verification request (representative course) for admin review.
        const result = await submitVerification({
          course: valid[0].code,
          claimedGrade: valid[0].grade,
          transcriptUrl: transcriptFile?.name,
        });
        setExisting(result);
        toast.success('Application submitted! DynForge will review within 2–3 business days.');
      }
      // Creating the profile grants the MENTOR role — refresh so the header/portal updates.
      await refreshUser();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
        <Loader2 className="size-5 animate-spin" /> Loading verification status…
      </div>
    );
  }

  const currentStep = existing?.status === 'APPROVED' ? 4
    : existing?.status === 'PENDING' ? 3
    : existing?.status === 'REJECTED' ? 2
    : 2;

  // Profile/course editor is available unless an application is pending review.
  // Approved mentors can still add/manage the courses they teach.
  const showForm = existing?.status !== 'PENDING';

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-6">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Mentor Verification</h1>
        <p className="mt-1 text-muted-foreground">
          Register the courses you teach and complete verification to become a listed mentor.
        </p>
      </div>

      <Card className="mb-8 border-border p-8">
        <StepProgress steps={steps} current={currentStep} />
      </Card>

      {/* Status banners */}
      {existing?.status === 'APPROVED' && (
        <Card className="mb-6 border-success/20 bg-success/5 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
            <div>
              <p className="text-success" style={{ fontWeight: 600 }}>Verification approved!</p>
              <p className="text-sm text-muted-foreground">Your profile is now listed as a verified mentor on DynForge.</p>
            </div>
          </div>
        </Card>
      )}

      {existing?.status === 'PENDING' && (
        <Card className="mb-6 border-warning/20 bg-warning/5 p-5">
          <div className="flex items-start gap-3">
            <BadgeCheck className="mt-0.5 size-5 shrink-0 text-warning" />
            <div>
              <p className="text-warning" style={{ fontWeight: 600 }}>Application under review</p>
              <p className="text-sm text-muted-foreground">
                Your courses have been saved and submitted for <strong>{existing.course}</strong> ({existing.claimedGrade}).
                DynForge will review within 2–3 business days.
              </p>
            </div>
          </div>
        </Card>
      )}

      {existing?.status === 'REJECTED' && (
        <Card className="mb-6 border-danger/20 bg-danger/5 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
            <div>
              <p className="text-danger" style={{ fontWeight: 600 }}>Application rejected</p>
              {existing.note && <p className="text-sm text-muted-foreground mt-1">Reason: {existing.note}</p>}
              <p className="text-sm text-muted-foreground mt-1">Please update your documents and resubmit below.</p>
            </div>
          </div>
        </Card>
      )}

      {showForm && (
        <>
          {/* Profile basics */}
          <Card className="mb-6 border-border p-6">
            <h2 className="mb-4" style={{ fontSize: '1.125rem', fontWeight: 700 }}>Mentor profile</h2>
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Headline / title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AI/ML Lecturer · FPT University" className="bg-input-background" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block">Major <span className="text-danger">*</span></Label>
                  <Select value={major} onValueChange={setMajor}>
                    <SelectTrigger className="bg-input-background"><SelectValue placeholder="Select your major" /></SelectTrigger>
                    <SelectContent>
                      {majors.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Teaching role <span className="text-danger">*</span></Label>
                  <Select value={teachingRole} onValueChange={setTeachingRole}>
                    <SelectTrigger className="bg-input-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEACHING_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">{T.university}</Label>
                <Select
                  value={universityCode || undefined}
                  onValueChange={(code) => {
                    setUniversityCode(code);
                    const u = universities.find((x) => x.code === code);
                    if (u) setUniversity(u.name);
                  }}
                >
                  <SelectTrigger className="bg-input-background"><SelectValue placeholder={T.selectUniversity} /></SelectTrigger>
                  <SelectContent>
                    {universities.map((u) => <SelectItem key={u.code} value={u.code}>{u.shortName || u.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                {/* Verify with school email (mục A) */}
                <div className="mt-3 rounded-xl border border-border bg-accent/30 p-4">
                  {schoolVerified ? (
                    <p className="flex items-center gap-2 text-sm text-success" style={{ fontWeight: 600 }}>
                      <BadgeCheck className="size-4" />
                      {university ? T.verifiedStudentOf.replace('{university}', university) : T.schoolEmailVerified}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-sm" style={{ fontWeight: 600 }}>
                        <Mail className="size-4 text-primary" /> {T.verifySchoolEmail}
                      </p>
                      {!otpSent ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            type="email"
                            value={schoolEmail}
                            onChange={(e) => setSchoolEmail(e.target.value)}
                            placeholder={lang === 'vi' ? 'ban@fpt.edu.vn' : 'you@fpt.edu.vn'}
                            className="bg-input-background"
                          />
                          <Button type="button" onClick={requestSchool} disabled={schoolBusy}>
                            {schoolBusy ? <Loader2 className="size-4 animate-spin" /> : T.verifySchoolEmail}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder={T.schoolEmailOtpPrompt}
                            className="bg-input-background"
                          />
                          <Button type="button" onClick={confirmSchool} disabled={schoolBusy}>
                            {schoolBusy ? <Loader2 className="size-4 animate-spin" /> : T.confirm}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Short bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell students about your background and how you can help." />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block">Skills <span className="text-muted-foreground">(comma-separated)</span></Label>
                  <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Python, Data Analysis" className="bg-input-background" />
                </div>
                <div>
                  <Label className="mb-1.5 block">Languages</Label>
                  <Input value={languages} onChange={(e) => setLanguages(e.target.value)} className="bg-input-background" />
                </div>
              </div>
            </div>
          </Card>

          {/* Courses — multiple */}
          <Card className="mb-6 border-border p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Courses you teach</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Add every course you want to tutor, with your rates.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary" style={{ fontWeight: 600 }}>
                {courses.length} course{courses.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-4">
              {courses.map((c, i) => (
                <div key={i} className="rounded-2xl border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground" style={{ fontWeight: 600 }}>Course {i + 1}</span>
                    {courses.length > 1 && (
                      <button type="button" onClick={() => removeCourse(i)} className="rounded-lg p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block">Course code</Label>
                      <Input value={c.code} onChange={(e) => updateCourse(i, { code: e.target.value })} placeholder="MAL301" className="bg-input-background uppercase" />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Course name</Label>
                      <Input value={c.name} onChange={(e) => updateCourse(i, { name: e.target.value })} placeholder="Machine Learning" className="bg-input-background" />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Your grade</Label>
                      <div className="flex gap-2">
                        {(['A', 'A+'] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => updateCourse(i, { grade: g })}
                            className={cn('flex-1 rounded-xl border px-4 py-2 text-sm transition-colors', c.grade === g ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-accent/40 text-muted-foreground hover:border-primary/50')}
                            style={{ fontWeight: 600 }}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="mb-1.5 block">1-on-1 rate/hr</Label>
                        <Input value={c.ratePrivate} onChange={(e) => updateCourse(i, { ratePrivate: e.target.value.replace(/\D/g, '') })} className="bg-input-background" />
                      </div>
                      <div>
                        <Label className="mb-1.5 block">Group rate/hr</Label>
                        <Input value={c.rateGroup} onChange={(e) => updateCourse(i, { rateGroup: e.target.value.replace(/\D/g, '') })} className="bg-input-background" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" className="mt-4 w-full" onClick={addCourse}>
              <Plus className="size-4" /> Add another course
            </Button>
          </Card>

          {/* Approved mentors: save courses directly (already verified) */}
          {isApproved && (
            <Button className="mb-6 w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="size-4" /> Save courses</>}
            </Button>
          )}

          {/* Documents (only for the initial application) */}
          {!isApproved && (
          <Card className="mb-6 border-border p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Upload documents &amp; certificates</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Upload at least one document. Multiple file types accepted.</p>
              </div>
              {totalUploaded > 0 && (
                <span className="rounded-full bg-success/15 px-3 py-1 text-sm text-success" style={{ fontWeight: 600 }}>
                  {totalUploaded} file{totalUploaded > 1 ? 's' : ''} ready
                </span>
              )}
            </div>

            <div className="space-y-5">
              {certTypes.map(({ key, icon: Icon, label, desc, accept }) => (
                <div key={key} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontWeight: 600 }}>{label}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                      <UploadZone certKey={key} accept={accept} files={uploadedFiles[key] ?? []} onAdd={addFiles} onRemove={removeFile} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button className="mt-6 w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? <><Loader2 className="size-4 animate-spin" /> Submitting…</>
                : <><Upload className="size-4" /> Submit application for review</>}
            </Button>
          </Card>
          )}
        </>
      )}

      {existing?.status !== 'APPROVED' && (
        <div className="space-y-4">
          {baseDocuments.map((doc) => {
            const Icon = doc.icon;
            return (
              <Card key={doc.title} className="border-border p-6 opacity-60">
                <div className="flex items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-muted-foreground">
                    <Icon className="size-5" />
                  </span>
                  <div className="flex-1">
                    <p style={{ fontWeight: 600 }}>{doc.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{doc.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground italic">Available after documents are approved.</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
