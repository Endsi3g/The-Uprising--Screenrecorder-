import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CaptionRegion, AnnotationTextStyle } from '../components/video-editor/types';

const DEFAULT_CAPTION_STYLE: AnnotationTextStyle = {
  color: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  fontSize: 28,
  fontFamily: 'Inter',
  fontWeight: 'bold',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'center',
};

export function useAutoCaptions() {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const startListening = useCallback((
    baseTimeMs: number, 
    onCaptionReceived: (caption: CaptionRegion) => void,
    language: string = 'fr-FR'
  ) => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this environment');
      return false;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false; // Only want final phrases for timeline blocks
      recognition.lang = language;

      startTimeRef.current = Date.now();

      recognition.onstart = () => {
        setIsListening(true);
        console.log('Captions: Started listening in', language);
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('Captions: Stopped listening');
      };

      recognition.onerror = (event: any) => {
        console.error('Captions: Error', event.error);
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const resultTimeOffset = Date.now() - startTimeRef.current;
        const result = event.results[event.results.length - 1];
        
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (!text) return;

          // Heuristic for duration: ~150ms per character, min 1s, max 5s
          const durationMs = Math.min(Math.max(text.length * 80, 1500), 5000);
          
          const newCaption: CaptionRegion = {
            id: uuidv4(),
            startMs: baseTimeMs + resultTimeOffset - durationMs,
            endMs: baseTimeMs + resultTimeOffset,
            text,
            style: { ...DEFAULT_CAPTION_STYLE }
          };

          // Sanity check for negative start
          if (newCaption.startMs < 0) {
              const diff = -newCaption.startMs;
              newCaption.startMs = 0;
              newCaption.endMs += diff;
          }

          onCaptionReceived(newCaption);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      return true;
    } catch (err) {
      console.error('Captions: Failed to start', err);
      return false;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  return { 
    isListening, 
    startListening, 
    stopListening 
  };
}
