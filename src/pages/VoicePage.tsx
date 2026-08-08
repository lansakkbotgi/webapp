import { useEffect, useState, useRef } from 'react';
import { sendMessage } from '../api/chat';

const MALE_VOICE_NAMES = /\b(male|man|niwat|nattapong|krit|somchai|pattara|manop)\b|ชาย|นิวัฒน์|ณัฐพงศ์|กฤษณ์|สมชาย|ภัทร|มานพ/i;
const NATURAL_VOICE_NAMES = /natural|neural|enhanced|premium|google|microsoft|siri/i;

function selectThaiMaleVoice(voices: SpeechSynthesisVoice[]) {
  return voices
    .filter((voice) => voice.lang.toLowerCase().startsWith('th'))
    .sort((a, b) => {
      const score = (voice: SpeechSynthesisVoice) =>
        (MALE_VOICE_NAMES.test(voice.name) ? 100 : 0) +
        (NATURAL_VOICE_NAMES.test(voice.name) ? 20 : 0) +
        (voice.default ? 1 : 0);

      return score(b) - score(a);
    })[0];
}

function prepareSpeechText(text: string) {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*#_`~]/g, '')
    .replace(/^\s*[-•▪◦]\s*/gm, '')
    .replace(/\n+/g, '. ')
    .replace(/\s+([,;:])/g, '$1')
    .replace(/([.!?])(?=\S)/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function VoicePage() {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [replyText, setReplyText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Initialize Speech Services on mount
  useEffect(() => {
    // 1. STT Init
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'th-TH';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setStatus('listening');
        setTranscript('กำลังฟังคำถาม...');
        setReplyText('');
        setErrorMsg('');
      };

      rec.onresult = async (event: any) => {
        const resultText = event.results[0][0].transcript;
        setTranscript(resultText);
        setStatus('thinking');
        await handleSendToAI(resultText);
      };

      rec.onerror = (e: any) => {
        console.error('STT error', e);
        setStatus('idle');
        if (e.error === 'not-allowed') {
          setErrorMsg('กรุณาอนุญาตสิทธิ์เข้าถึงไมโครโฟน (กรุณาเช็คการตั้งค่า Safari)');
        } else {
          setErrorMsg(`เกิดข้อผิดพลาดในการฟังเสียง: (Error: ${e.error})`);
        }
      };

      rec.onend = () => {
        if (status === 'listening') {
          setStatus('idle');
        }
      };

      recognitionRef.current = rec;
    } else {
      setErrorMsg('เบราว์เซอร์นี้ไม่รองรับการแปลงเสียงเป็นข้อความ');
    }

    // 2. TTS Init
    synthRef.current = window.speechSynthesis;
    const refreshVoices = () => {
      voicesRef.current = synthRef.current?.getVoices() ?? [];
    };
    refreshVoices();
    synthRef.current.onvoiceschanged = refreshVoices;

    // ─── iOS Safari Speech Synthesis Global Unlock Hack ───
    // ปลดล็อกเสียงเมื่อผู้ใช้แตะสัมผัสหน้าจอส่วนใดก็ตามในครั้งแรก
    // ป้องกันการเรียกใช้ speak() พร้อมกันกับ mic start ซึ่งทำให้ iOS ตัดสาย (aborted)
    const unlock = () => {
      if (synthRef.current) {
        try {
          const silentUtterance = new SpeechSynthesisUtterance('');
          silentUtterance.volume = 0;
          synthRef.current.speak(silentUtterance);
          console.log('[auth] iOS TTS engine unlocked via interaction');
          document.removeEventListener('click', unlock);
          document.removeEventListener('touchstart', unlock);
        } catch (err) {
          console.error('[auth] Global unlock failed', err);
        }
      }
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);

    return () => {
      stopSpeaking();
      if (synthRef.current) {
        synthRef.current.onvoiceschanged = null;
      }
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  const startListening = () => {
    stopSpeaking();
    setErrorMsg('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Start recognition failed', err);
      }
    } else {
      setErrorMsg('ระบบเสียงไม่พร้อมใช้งาน');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setStatus('idle');
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (status === 'speaking') {
      setStatus('idle');
    }
  };

  const handleSendToAI = async (text: string) => {
    try {
      // Send text to backend Express (which uses askAI + Gemini)
      const res = await sendMessage(text);
      const cleanedReply = res.content
        .replace(/^[🔐👤👑].*?\n─{28,}\n/g, '') // remove header info for clean TTS
        .trim();

      setReplyText(res.content);
      speakText(cleanedReply);
    } catch (err) {
      console.error(err);
      setTranscript('ผิดพลาด');
      setReplyText('⚠️ ไม่สามารถเชื่อมต่อระบบวิเคราะห์เสียงได้');
      setStatus('idle');
    }
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;

    synthRef.current.cancel(); // Cancel any current speech

    // standard clean up of markdown symbols for speech synthesis
    const normalizedSpeech = prepareSpeechText(text);
    const speechCleaned = normalizedSpeech
      .replace(/[*#_`~]/g, '')
      .replace(/https?:\/\/\S+/g, 'ลิงก์ภายนอก')
      .slice(0, 800); // Limit long speech response to save performance on phone

    if (!speechCleaned) return;

    const utterance = new SpeechSynthesisUtterance(speechCleaned);
    utterance.lang = 'th-TH';
    
    // Attempt to locate a Thai voice on iOS Safari
    const thaiVoice = selectThaiMaleVoice(voicesRef.current);
    if (thaiVoice) {
      utterance.voice = thaiVoice;
    }
    
    utterance.rate = 1.15;
    utterance.pitch = 0.88;
    utterance.volume = 1;

    utterance.onstart = () => {
      setStatus('speaking');
    };

    utterance.onend = () => {
      setStatus('idle');
    };

    utterance.onerror = (e) => {
      console.error('TTS utterance error', e);
      setStatus('idle');
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  return (
    <div className="voice-page">
      <div className="voice-status">
        {status === 'idle' && 'กดเพื่อพูดคุยด้วยเสียง'}
        {status === 'listening' && '🔴 กำลังฟังคำถาม...'}
        {status === 'thinking' && '🔍 กำลังประมวลผลข้อมูล...'}
        {status === 'speaking' && '🔊 กำลังอ่านออกเสียงคำตอบ...'}
      </div>

      <div className="voice-transcript">
        {transcript || 'กดปุ่มไมโครโฟนตรงกลางเพื่อเริ่มคุย'}
      </div>

      <div 
        className={`voice-orb ${status === 'listening' ? 'listening' : ''} ${status === 'speaking' ? 'speaking' : ''}`}
        onClick={status === 'listening' ? stopListening : startListening}
      >
        {/* Render Orb rings inside the mic wrapper for beautiful pulse animation */}
        {status === 'listening' && (
          <>
            <div className="voice-orb-ring"></div>
            <div className="voice-orb-ring"></div>
            <div className="voice-orb-ring"></div>
          </>
        )}
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '48px', height: '48px', color: '#fff' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
        </svg>
      </div>

      {errorMsg && (
        <div className="error-msg text-center" style={{ marginTop: '24px', maxWidth: '300px' }}>
          {errorMsg}
        </div>
      )}

      {replyText && (
        <div 
          className="glass" 
          style={{ 
            marginTop: '32px', 
            padding: '16px', 
            borderRadius: '16px', 
            maxWidth: '320px', 
            maxHeight: '180px',
            overflowY: 'auto',
            fontSize: '14px',
            lineHeight: 1.5
          }}
        >
          <strong>คำตอบผู้ช่วย AI:</strong>
          <p style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{replyText}</p>
        </div>
      )}

      <div className="voice-controls">
        {status === 'speaking' && (
          <button onClick={stopSpeaking} className="btn btn-ghost">
            🛑 หยุดเล่นเสียง
          </button>
        )}
        {status !== 'idle' && (
          <button onClick={() => { stopListening(); stopSpeaking(); }} className="btn btn-danger">
            จบการสนทนา
          </button>
        )}
      </div>
    </div>
  );
}
