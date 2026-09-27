import { useState, useEffect, useRef } from 'react';
import { PhoneOff, Circle, Square, Loader2, ShieldCheck, NotebookPen, Sparkles, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadRecording } from '../services/recordingService';
import { askSession, rewriteNote } from '../services/aiService';

interface MeetProps {
  bookingId: string;
  course: string;
  partnerName: string;
  durationMinutes: number;
  displayName?: string;
  onClose: () => void;
}

// ── In-meeting notes panel (persisted per booking, AI rewrites the main points) ──
function NotesPanel({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const storageKey = `dynforge_meet_note_${bookingId}`;
  const [note, setNote] = useState(() => localStorage.getItem(storageKey) ?? localStorage.getItem(`gradora_meet_note_${bookingId}`) ?? '');
  const [rewriting, setRewriting] = useState(false);

  // Autosave so notes survive accidental tab close / rejoin.
  useEffect(() => {
    localStorage.setItem(storageKey, note);
  }, [note, storageKey]);

  const runRewrite = async () => {
    if (!note.trim() || rewriting) return;
    setRewriting(true);
    try {
      const rewritten = await rewriteNote(bookingId, note.trim());
      setNote(rewritten);
      toast.success('AI đã viết lại nội dung chính của ghi chú.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không viết lại được ghi chú.');
    } finally {
      setRewriting(false);
    }
  };

  return (
    <div className="flex w-80 shrink-0 flex-col rounded-2xl bg-[#1c1f2e] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm text-white" style={{ fontWeight: 600 }}>
          <NotebookPen className="size-4" /> Ghi chú buổi học
        </p>
        <button onClick={onClose} className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white">
          <X className="size-4" />
        </button>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ghi nhanh những gì được dạy, bài tập, điều chưa hiểu…"
        className="min-h-0 flex-1 resize-none rounded-xl border border-white/10 bg-[#0f1117] p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <button
        onClick={runRewrite}
        disabled={rewriting || !note.trim()}
        className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ fontWeight: 600 }}
      >
        {rewriting
          ? <><Loader2 className="size-4 animate-spin" /> Đang viết lại…</>
          : <><Sparkles className="size-4" /> Dùng AI viết lại nội dung chính</>}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-white/40">Ghi chú tự lưu trên máy của bạn.</p>
    </div>
  );
}

// ── Floating AI chat popup (grounded in this session) ──────────────────────────
interface ChatMsg { mine: boolean; text: string }

function AiChatPopup({ bookingId, course, onClose }: { bookingId: string; course: string; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { mine: false, text: `Chào bạn! Mình là trợ lý AI của DynForge. Hỏi mình bất cứ điều gì về buổi học ${course} này nhé.` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;
    setMessages((m) => [...m, { mine: true, text: question }]);
    setInput('');
    setLoading(true);
    try {
      const res = await askSession(bookingId, question);
      setMessages((m) => [...m, { mine: false, text: res.answer }]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'AI không trả lời được, thử lại nhé.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute bottom-24 right-6 z-10 flex h-[420px] w-80 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1c1f2e] shadow-2xl">
      <div className="flex items-center justify-between bg-primary/20 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-sm text-white" style={{ fontWeight: 600 }}>
          <Sparkles className="size-4 text-primary" /> Trợ lý AI
        </p>
        <button onClick={onClose} className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white">
          <X className="size-4" />
        </button>
      </div>
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
              m.mine ? 'bg-primary text-white' : 'bg-white/10 text-white/90'
            }`}>
              {m.text}
            </p>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <p className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm text-white/70">
              <Loader2 className="size-3.5 animate-spin" /> Đang suy nghĩ…
            </p>
          </div>
        )}
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 p-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi về buổi học…"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export function MeetRoomOverlay({ bookingId, course, partnerName, durationMinutes, displayName, onClose }: MeetProps) {
  const [elapsed, setElapsed] = useState('00:00');
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      setElapsed(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Both participants join the same per-booking room, so they meet each other.
  const room = `dynforge-${bookingId}`;
  const name = encodeURIComponent(displayName ?? 'Guest');
  const jitsiUrl = `https://meet.jit.si/${room}#userInfo.displayName=%22${name}%22&config.prejoinPageEnabled=false&config.disableDeepLinking=true`;

  const startRecording = async () => {
    // getDisplayMedia is desktop-only; Android WebView/Chrome do not provide it.
    if (!(navigator.mediaDevices as any)?.getDisplayMedia) {
      toast.info('Screen recording is only available on a desktop browser. Open DynForge on a computer to record this session.');
      return;
    }
    try {
      // Capture the screen/tab (the meeting) + audio.
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        const blob = new Blob(chunks, { type: 'video/webm' });
        setUploading(true);
        try {
          await uploadRecording(bookingId, blob);
          toast.success('Recording saved — available to admins as dispute evidence.');
        } catch (err: any) {
          toast.error(err?.response?.data?.message ?? 'Could not upload recording.');
        } finally {
          setUploading(false);
        }
      };
      // If the user stops sharing from the browser UI, stop the recorder too.
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (recorder.state !== 'inactive') recorder.stop();
        setRecording(false);
      });
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      toast.info('Recording started — pick the meeting tab/window to capture.');
    } catch {
      toast.error('Screen recording was cancelled or blocked.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    setRecording(false);
  };

  const end = () => {
    if (recording) stopRecording();
    toast.success('Session ended. Please mark it as completed.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f1117]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white text-xs" style={{ fontWeight: 700 }}>G</span>
          <div>
            <p className="text-sm text-white" style={{ fontWeight: 600 }}>{course}</p>
            <p className="text-xs text-white/50">with {partnerName} · {durationMinutes} min</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-danger/20 px-3 py-1 text-xs text-red-400">
            <span className="size-1.5 rounded-full bg-red-400 animate-pulse" />
            LIVE · {elapsed}
          </span>
        </div>
      </div>

      {/* Real meeting (Jitsi) + optional notes panel */}
      <div className="relative flex flex-1 min-h-0 gap-3 px-4">
        <iframe
          title="DynForge meeting"
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          className="h-full w-full min-w-0 flex-1 rounded-2xl border-0 bg-[#1c1f2e]"
        />
        {notesOpen && <NotesPanel bookingId={bookingId} onClose={() => setNotesOpen(false)} />}
        {chatOpen && <AiChatPopup bookingId={bookingId} course={course} onClose={() => setChatOpen(false)} />}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 py-4">
        <button
          onClick={() => setNotesOpen((o) => !o)}
          className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm text-white transition-colors ${
            notesOpen ? 'bg-primary hover:opacity-90' : 'bg-white/10 hover:bg-white/20'
          }`}
          style={{ fontWeight: 600 }}
        >
          <NotebookPen className="size-4" /> Notes
        </button>

        <button
          onClick={() => setChatOpen((o) => !o)}
          className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm text-white transition-colors ${
            chatOpen ? 'bg-primary hover:opacity-90' : 'bg-white/10 hover:bg-white/20'
          }`}
          style={{ fontWeight: 600 }}
        >
          <Sparkles className="size-4" /> AI chat
        </button>

        {uploading ? (
          <span className="flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm text-white">
            <Loader2 className="size-4 animate-spin" /> Saving recording…
          </span>
        ) : recording ? (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-3 text-sm text-white transition-opacity hover:opacity-90"
            style={{ fontWeight: 600 }}
          >
            <Square className="size-4 fill-white" /> Stop recording
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm text-white transition-colors hover:bg-white/20"
            style={{ fontWeight: 600 }}
          >
            <Circle className="size-4 fill-red-500 text-red-500" /> Record session
          </button>
        )}

        <button
          onClick={end}
          className="flex items-center gap-2 rounded-2xl bg-danger px-6 py-3 text-white transition-opacity hover:opacity-90"
          style={{ fontWeight: 600 }}
        >
          <PhoneOff className="size-4" /> End
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 pb-4 text-xs text-white/40">
        <ShieldCheck className="size-3.5" /> Recordings are stored securely and only visible to DynForge admins for dispute review.
      </div>
    </div>
  );
}
