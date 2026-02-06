
export interface SoundPad {
  id: string;
  name: string;
  color: string;
  soundUri: string;
  keyHint: string; // The keyboard shortcut (e.g., 'A', 'S')
}

export interface PlayHistoryItem {
  id: string;
  name: string;
  timestamp: number;
}
