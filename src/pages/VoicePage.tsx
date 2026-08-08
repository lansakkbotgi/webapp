import { useEffect, useState, useRef } from 'react';
import { sendMessage } from '../api/chat';

export default function VoicePage() {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [replyText, setReplyText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
          setErrorMsg('กรุณาอนุญาตสิทธิ์เข้าถึงไมโครโฟน');
        } else {
          setErrorMsg('เกิดข้อผิดพลาดในการฟังเสียง');
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

    return () => {
      stopSpeaking();
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
    const speechCleaned = text
      .replace(/[*#_`~]/g, '')
      .replace(/https?:\/\/\S+/g, 'ลิงก์ภายนอก')
      .slice(0, 800); // Limit long speech response to save performance on phone

    const utterance = new SpeechSynthesisUtterance(speechCleaned);
    utterance.lang = 'th-TH';
    
    // Attempt to locate a Thai voice on iOS Safari
    const voices = synthRef.current.getVoices();
    const thaiVoice = voices.find(v => v.lang.includes('th') || v.lang.includes('TH'));
    if (thaiVoice) {
      utterance.voice = thaiVoice;
    }
    
    utterance.rate = 1.0;

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
