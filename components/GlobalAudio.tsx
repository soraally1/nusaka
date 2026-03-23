'use client'

import { useEffect, useRef } from 'react';
import { useJoystickStore } from '@/app/game/store';

export default function GlobalAudio() {
    const menuState = useJoystickStore(s => s.menuState);
    const isAudioMuted = useJoystickStore(s => s.isAudioMuted);
    const audioVolume = useJoystickStore(s => s.audioVolume);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const currentBgmIndex = useRef(0);

    // Sync paused state when muted changes
    useEffect(() => {
        if (!audioRef.current) return;
        if (isAudioMuted || menuState !== 'playing') {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(() => { });
        }
        audioRef.current.volume = isAudioMuted ? 0 : audioVolume;
    }, [isAudioMuted, menuState, audioVolume]);

    // Pause audio when the page/tab is hidden (e.g. Chrome minimised or tab closed)
    useEffect(() => {
        const handleVisibility = () => {
            if (!audioRef.current) return;
            if (document.hidden) {
                audioRef.current.pause();
            } else if (menuState === 'playing' && !useJoystickStore.getState().isAudioMuted) {
                audioRef.current.play().catch(() => { });
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [menuState]);

    useEffect(() => {
        // Stop if not playing or creating character
        if (menuState !== 'playing') {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            return;
        }

        // Initialize audio instance the first time
        if (!audioRef.current) {
            const bgmList = ['/sfx/bgm1.mp3', '/sfx/bgm2.mp3'];
            const audio = new Audio(bgmList[currentBgmIndex.current]);
            audio.volume = useJoystickStore.getState().isAudioMuted ? 0 : useJoystickStore.getState().audioVolume;
            audioRef.current = audio;

            const playNext = () => {
                currentBgmIndex.current = (currentBgmIndex.current + 1) % bgmList.length;
                audio.src = bgmList[currentBgmIndex.current];
                if (!useJoystickStore.getState().isAudioMuted) {
                    audio.play().catch(e => console.warn('BGM playNext blocked:', e));
                }
            };

            audio.addEventListener('ended', playNext);

            const tryPlay = () => {
                if (useJoystickStore.getState().isAudioMuted) return;

                audio.play().then(() => {
                    window.removeEventListener('click', tryPlay);
                    window.removeEventListener('keydown', tryPlay);
                    window.removeEventListener('touchstart', tryPlay);
                }).catch(e => {
                    window.addEventListener('click', tryPlay, { once: true });
                    window.addEventListener('keydown', tryPlay, { once: true });
                    window.addEventListener('touchstart', tryPlay, { once: true });
                });
            };
            tryPlay();
        } else if (!isAudioMuted) {
            // If it exists, make sure it continues playing if not muted
            audioRef.current.play().catch(() => { });
        }
    }, [menuState]);

    return null; // This component doesn't render anything visibly
}
