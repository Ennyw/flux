import { useState, useEffect, useRef } from 'react';
import { Content } from '@/types';
import './WatchParty.css';

interface WatchPartyProps {
  content: Content | null;
  playerUrl: string;
  onClose: () => void;
}

export const WatchParty = ({ content, playerUrl, onClose }: WatchPartyProps) => {
  const [roomId, setRoomId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [participants] = useState<string[]>(['You']);
  const [isSynced] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Generate room ID
    const id = Math.random().toString(36).substring(2, 9);
    setRoomId(id);
    setIsHost(true);
    
    // In production: connect to WebSocket server for real sync
    // For now, simulate with localStorage events
    const handleSync = (e: Event) => {
      const storageEvent = e as StorageEvent;
      if (storageEvent.key?.startsWith(`watchparty_${id}`)) {
        const data = JSON.parse(storageEvent.newValue || '{}');
        if (data.type === 'play' && !isHost) {
          // Sync playback
        }
      }
    };
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, [isHost]);

  if (!content) return null;

  const shareLink = `${window.location.origin}/watch/${roomId}`;

  return (
    <div className="watch-party-modal">
      <div className="watch-party-header">
        <h2>Watch Party</h2>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      
      <div className="watch-party-info">
        <div className="party-room-id">
          <label>Room ID:</label>
          <code>{roomId}</code>
          <button onClick={() => navigator.clipboard.writeText(shareLink)}>Copy Link</button>
        </div>
        
        <div className="party-participants">
          <label>Watching Together ({participants.length}):</label>
          <div className="participants-list">
            {participants.map((p, i) => (
              <span key={i} className="participant">{p}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="party-player">
        <iframe
          ref={iframeRef}
          src={playerUrl}
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
          title={content.title}
        />
      </div>

      <div className="party-controls">
        <div className="sync-status">
          {isSynced ? '🟢 Synced' : '🟡 Connecting...'}
        </div>
      </div>
    </div>
  );
};

