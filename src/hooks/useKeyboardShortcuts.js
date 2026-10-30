import { useEffect } from 'react';

export function useKeyboardShortcuts({
  onOpenSettings,
  onOpenLocalTerminal,
  onCloseActiveTerminal,
  onSplitVertical,
  onSplitHorizontal,
  onToggleSearch
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      // Ctrl + K -> Open / Toggle Command Palette Search
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onToggleSearch?.();
        return;
      }

      // Ctrl + , -> Open / Toggle Settings
      if (e.key === ',') {
        e.preventDefault();
        onOpenSettings?.();
        return;
      }

      // Ctrl + T -> Open Local Terminal Session
      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        onOpenLocalTerminal?.();
        return;
      }

      // Ctrl + W -> Close Active Terminal Pane
      if (e.key.toLowerCase() === 'w') {
        e.preventDefault();
        onCloseActiveTerminal?.();
        return;
      }

      // Ctrl + Shift + D -> Split Terminal Vertically
      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onSplitVertical?.();
        return;
      }

      // Ctrl + Shift + E -> Split Terminal Horizontally
      if (e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        onSplitHorizontal?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onOpenSettings,
    onOpenLocalTerminal,
    onCloseActiveTerminal,
    onSplitVertical,
    onSplitHorizontal,
    onToggleSearch
  ]);
}
