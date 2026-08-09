import { useEffect, useRef, useState } from 'react';
import { sendMessage } from '../api/chat';

type VoiceStatus = 'idle' | 'listening' | 'user-speaking' | 'processing' | 'ai-speaking';
const maleVoiceHints = /\b(male|man|niwat|nattapong|krit|somchai|pattara|manop)\b|ชาย|ผู้ชาย|นิวัฒน์|ณัฐพงศ์|กฤษณ์|สมชาย|ภัทร|มานพ/i;
const naturalVoiceHints = /natural|neural|enhanced|premium|google|microsoft|siri/i;

function chooseThaiMaleVoice(voices: SpeechSynthesisVoice[]) {
  return voices.filter((voice) => voice.lang.toLowerCase().startsWith('th')).sort((a, b) => {
    const score = (voice: SpeechSynthesisVoice) =>
      (maleVoiceHints.test(voice.name) ? 100 : 0) +
      (naturalVoiceHints.test(voice.name) ? 20 : 0) +
      (voice.lang.toLowerCase() === 'th-th' ? 5 : 0) + (voice.default ? 1 : 0);
    return score(b) - score(a);
  })[0];
}

function prepareSpeechText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, ' ').replace(/!?(?:\[[^\]]*\])\([^)]*\)/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/\b(?:sku|uuid|api\s*key|access\s*token|hash|base64|json|stack\s*trace|request\s*id)\s*[:=]?\s*[A-Za-z0-9_./:+-]{3,}/gi, 'ข้อมูลทางเทคนิค')
    .replace(/\b[0-9a-f]{16,}\b/gi, 'ข้อมูลทางเทคนิค')
    .replace(/\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g, ' ')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ').replace(/[*#_`~>|]/g, '')
    .replace(/^\s*[-•–—]\s*/gm, '').replace(/\n+/g, '. ').replace(/\s+([,;:])/g, '$1')
    .replace(/([.!?])(?=\S)/g, '$1 ').replace(/\s+/g, ' ').trim();
}

export default function VoicePage() {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [replyText, setReplyText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(() => { try { return localStorage.getItem('webapp-voice-enabled') !== 'false'; } catch { return true; } });
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const voiceEnabledRef = useRef(voiceEnabled);
  const sessionActiveRef = useRef(false);
  const processingRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const speechTimerRef = useRef<number | null>(null);

  const stopSpeaking = () => {
    if (speechTimerRef.current !== null) window.clearTimeout(speechTimerRef.current);
    speechTimerRef.current = null;
    synthRef.current?.cancel();
    setStatus((current) => current === 'ai-speaking' ? 'user-speaking' : current);
  };

  const speakText = (text: string) => {
    if (!synthRef.current || !voiceEnabledRef.current || !sessionActiveRef.current) return;
    stopSpeaking();
    const speech = prepareSpeechText(text).slice(0, 800);
    if (!speech) { if (sessionActiveRef.current) setStatus('listening'); return; }
    const utterance = new SpeechSynthesisUtterance(speech);
    utterance.lang = 'th-TH';
    const voice = chooseThaiMaleVoice(voicesRef.current); if (voice) utterance.voice = voice;
    utterance.rate = 1.08; utterance.pitch = 0.86; utterance.volume = 1;
    utterance.onstart = () => setStatus('ai-speaking');
    utterance.onend = () => { if (sessionActiveRef.current) { processingRef.current = false; setStatus('listening'); } };
    utterance.onerror = () => { if (sessionActiveRef.current) { processingRef.current = false; setStatus('listening'); } };
    // Chrome can drop an utterance when speak() immediately follows cancel().
    // A short delay makes TTS reliable without adding a noticeable pause.
    speechTimerRef.current = window.setTimeout(() => {
      if (!sessionActiveRef.current || !voiceEnabledRef.current || !synthRef.current) return;
      synthRef.current.resume();
      synthRef.current.speak(utterance);
      speechTimerRef.current = null;
    }, 80);
  };

  const handleSendToAI = async (text: string) => {
    if (!sessionActiveRef.current || processingRef.current) return;
    processingRef.current = true; setStatus('processing');
    try { const response = await sendMessage(text); setReplyText(response.content); speakText(response.content); }
    catch (error) { console.error(error); processingRef.current = false; setErrorMsg('เชื่อมต่อผู้ช่วย AI ไม่สำเร็จ ลองพูดอีกครั้งได้เลย'); if (sessionActiveRef.current) setStatus('listening'); }
  };

  const endSession = () => {
    sessionActiveRef.current = false; processingRef.current = false;
    recognitionRef.current?.stop(); synthRef.current?.cancel();
    micStreamRef.current?.getTracks().forEach((track) => track.stop()); micStreamRef.current = null;
    setStatus('idle');
  };

  const startSession = async () => {
    if (!recognitionRef.current) { setErrorMsg('เบราว์เซอร์นี้ไม่รองรับการสนทนาด้วยเสียง'); return; }
    sessionActiveRef.current = true; processingRef.current = false; setErrorMsg(''); setReplyText(''); setTranscript('');
    // Prime speech synthesis during the user's click. This is required by
    // Safari/iOS and also prevents Chromium from silently blocking later TTS.
    try {
      synthRef.current?.resume();
      const unlock = new SpeechSynthesisUtterance('');
      unlock.volume = 0;
      synthRef.current?.speak(unlock);
    } catch { /* the browser may not require an unlock */ }
    // Ask for an echo-cancelled microphone permission where supported. The
    // browser SpeechRecognition engine applies its own input processing too.
    try { micStreamRef.current = await navigator.mediaDevices?.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); } catch { /* recognition may still work if permission was already granted */ }
    try { recognitionRef.current.start(); } catch { /* already listening */ }
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition(); recognition.lang = 'th-TH'; recognition.continuous = true; recognition.interimResults = true;
      recognition.onstart = () => { if (sessionActiveRef.current) setStatus('listening'); };
      recognition.onresult = (event: any) => {
        let finalText = ''; let interimText = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const phrase = event.results[index][0].transcript;
          if (event.results[index].isFinal) finalText += phrase; else interimText += phrase;
        }
        if (interimText) { setTranscript(interimText); setStatus('user-speaking'); stopSpeaking(); }
        if (finalText.trim()) { setTranscript(finalText.trim()); handleSendToAI(finalText.trim()); }
      };
      recognition.onerror = (event: any) => { if (event.error === 'not-allowed') { setErrorMsg('กรุณาอนุญาตให้เว็บเข้าถึงไมโครโฟน'); endSession(); } };
      recognition.onend = () => { if (sessionActiveRef.current) { try { recognition.start(); } catch { /* restart is already pending */ } } };
      recognitionRef.current = recognition;
    }
    synthRef.current = window.speechSynthesis;
    const refreshVoices = () => { voicesRef.current = synthRef.current?.getVoices() ?? []; }; refreshVoices();
    synthRef.current.onvoiceschanged = refreshVoices;
    return () => { sessionActiveRef.current = false; recognitionRef.current?.stop(); synthRef.current?.cancel(); if (speechTimerRef.current !== null) window.clearTimeout(speechTimerRef.current); micStreamRef.current?.getTracks().forEach((track) => track.stop()); if (synthRef.current) synthRef.current.onvoiceschanged = null; };
  }, []);

  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);
  const toggleVoice = () => setVoiceEnabled((enabled) => { const next = !enabled; voiceEnabledRef.current = next; try { localStorage.setItem('webapp-voice-enabled', String(next)); } catch { /* private mode */ } if (!next) stopSpeaking(); return next; });
  const active = status !== 'idle';

  return <div className="voice-page">
    <div className="voice-status">{status === 'idle' ? 'กดเริ่มสนทนาเพื่อคุยต่อเนื่อง' : status === 'listening' ? 'กำลังฟัง พูดได้เลย' : status === 'user-speaking' ? 'กำลังฟังคุณพูด...' : status === 'processing' ? 'กำลังประมวลผล...' : 'กำลังพูดคำตอบ (พูดแทรกได้)'}</div>
    <div className="voice-transcript">{transcript || 'กดเริ่มสนทนา แล้วไม่ต้องกดไมโครโฟนซ้ำ'}</div>
    <div className={`voice-orb ${status === 'listening' || status === 'user-speaking' ? 'listening' : ''} ${status === 'ai-speaking' ? 'speaking' : ''}`} onClick={active ? endSession : startSession}>
      {active && <><div className="voice-orb-ring" /><div className="voice-orb-ring" /><div className="voice-orb-ring" /></>}
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '48px', height: '48px', color: '#fff' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
    </div>
    {errorMsg && <div className="error-msg text-center" style={{ marginTop: '24px', maxWidth: '300px' }}>{errorMsg}</div>}
    {replyText && <div className="glass" style={{ marginTop: '32px', padding: '16px', borderRadius: '16px', maxWidth: '320px', maxHeight: '180px', overflowY: 'auto', fontSize: '14px', lineHeight: 1.5 }}><strong>คำตอบผู้ช่วย AI:</strong><p style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{replyText}</p></div>}
    <div className="voice-controls"><button onClick={toggleVoice} className="btn btn-ghost" aria-pressed={voiceEnabled}>{voiceEnabled ? 'เสียงผู้ชาย: เปิด' : 'เสียงผู้ชาย: ปิด'}</button>{active && <button onClick={endSession} className="btn btn-danger">จบการสนทนา</button>}</div>
  </div>;
}
