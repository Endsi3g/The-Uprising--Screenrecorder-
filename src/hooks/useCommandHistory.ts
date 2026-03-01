import { useState, useCallback } from 'react';

export interface Command {
  execute: () => void;
  undo: () => void;
}

export function useCommandHistory() {
  const [history, setHistory] = useState<Command[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const executeCommand = useCallback((command: Command) => {
    command.execute();
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      return [...newHistory, command];
    });
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex >= 0 && history[currentIndex]) {
      history[currentIndex].undo();
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const nextIndex = currentIndex + 1;
      if (history[nextIndex]) {
        history[nextIndex].execute();
        setCurrentIndex(nextIndex);
      }
    }
  }, [currentIndex, history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return {
    executeCommand,
    undo,
    redo,
    canUndo: currentIndex >= 0,
    canRedo: currentIndex < history.length - 1,
    clearHistory,
    currentIndex
  };
}
