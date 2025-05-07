import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { PlayerTrack } from '@/types'; // Import the central type
import { toast } from 'sonner'; // Import toast

// Define Track type (mirroring PersistentPlayer for now)
// TODO: Share this type from a central location - DONE, using PlayerTrack from types/index.ts
// interface Track {
//     id: string | number;
//     title: string;
//     artist: string;
//     audioSrc: string;
//     coverImage?: string;
//     url?: string;
// }
// Use PlayerTrack directly
type Track = PlayerTrack;

interface PlayerState {
    currentTrack: Track | null;
    queue: Track[]; // Array representing the current playback queue.
    currentIndexInQueue: number; // Index of the currentTrack within the queue. -1 if no track is playing or track is not from queue.
    isPlaying: boolean;
    volume: number; // Percentage 0-100
    isMuted: boolean;
    loopMode: 'off' | 'one' | 'all';
    isShuffled: boolean;
    // We might not need currentTime/duration directly in the global store,
    // as the player component itself can manage that internally based on the Howl instance.
    // isLoading and error could be useful globally if other components need to react.
    isLoading: boolean;
    error: string | null;
}

interface PlayerActions {
    // _internalPlayTrack: (track: Track) => void; // Renamed original playTrack
    playTrackFromList: (track: Track, trackList: Track[], startIndex: number) => void; // New primary action
    playNext: () => void;
    playPrevious: () => void;
    togglePlay: () => void; // Toggle play/pause for the *current* track
    setPlayState: (playing: boolean) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    toggleLoop: () => void;
    toggleShuffle: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearPlayer: () => void; // Renamed from resetPlayer
}

const initialState: PlayerState = {
    currentTrack: null,
    queue: [],
    currentIndexInQueue: -1,
    isPlaying: false,
    volume: 80,
    isMuted: false,
    loopMode: 'off',
    isShuffled: false,
    isLoading: false,
    error: null,
};

export const usePlayerStore = create<PlayerState & PlayerActions>()(
    devtools(
        persist(
            (set, get) => ({
                ...initialState,

                // _internalPlayTrack: (track) => { // Keep for potential direct play, but primarily use playTrackFromList
                //     const current = get().currentTrack;
                //     if (current?.id !== track.id) {
                //         console.log('[PlayerStore] Playing new track (internal):', track.id);
                //         set({
                //             currentTrack: track,
                //             isPlaying: true,
                //             isLoading: true,
                //             error: null,
                //             // Reset queue info if playing a track outside a list context? Or assume it replaces queue?
                //             // For now, let's assume direct play clears the queue context.
                //             queue: [track], // Or maybe just clear queue? queue: [], currentIndexInQueue: -1
                //             currentIndexInQueue: 0
                //         });
                //     } else {
                //         console.log('[PlayerStore] Toggling play for current track (internal):', track.id);
                //         get().togglePlay();
                //     }
                // },

                playTrackFromList: (track, trackList, startIndex) => {
                    console.log(`[PlayerStore] Playing track ${track.id} from list, starting at index ${startIndex}`);
                    set({
                        currentTrack: track,
                        queue: trackList, // Set the full context list as the queue
                        currentIndexInQueue: startIndex,
                        isPlaying: true, // Start playing immediately
                        isLoading: true, // Howler will need to load it
                        error: null,
                        // Potentially reset shuffle/loop? Or keep user preference? Keep for now.
                    });
                    // TODO: Handle shuffle - if isShuffled is true, maybe shuffle trackList before setting queue?
                    // Or handle shuffle logic within playNext/playPrevious
                },

                playNext: () => {
                    const { queue, currentIndexInQueue, loopMode, isShuffled } = get();
                    if (queue.length === 0) return;

                    let nextIndex: number;

                    if (isShuffled) {
                        // Simple random shuffle (can be improved)
                        nextIndex = Math.floor(Math.random() * queue.length);
                        // Avoid playing the same track twice in a row in shuffle unless it's the only track
                        if (queue.length > 1 && nextIndex === currentIndexInQueue) {
                            nextIndex = (nextIndex + 1) % queue.length; // Simple wrap around
                        }
                    } else {
                        // Linear playback logic
                        nextIndex = currentIndexInQueue + 1;
                        if (nextIndex >= queue.length) {
                            if (loopMode === 'all') {
                                nextIndex = 0; // Wrap around if looping all
                            } else {
                                // Reached end, not looping all
                                console.log('[PlayerStore] Reached end of queue.');
                                // If loopMode is 'one', the player component handles replaying.
                                // If loopMode is 'off', playback stops. We don't change track here.
                                // Optionally set isPlaying to false if loopMode is 'off'?
                                // set({ isPlaying: false }); // Let the component handle this based on Howler's onend
                                return; // Stop here if not looping all and at the end
                            }
                        }
                    }

                     if (nextIndex < 0 || nextIndex >= queue.length) {
                         console.error('[PlayerStore] Calculated invalid nextIndex:', nextIndex);
                         return; // Safety check
                     }


                    const nextTrack = queue[nextIndex];
                    console.log(`[PlayerStore] Playing next track: ${nextTrack.id} at index ${nextIndex}`);
                    set({
                        currentTrack: nextTrack,
                        currentIndexInQueue: nextIndex,
                        isPlaying: true, // Assume playback continues
                        isLoading: true,
                        error: null,
                    });
                },

                playPrevious: () => {
                    const { queue, currentIndexInQueue, loopMode, isShuffled } = get();
                     if (queue.length === 0) return;
                
                     let prevIndex: number;
                
                     if (isShuffled) {
                         // Shuffle logic for previous might just pick another random track
                         // Or maybe it should try to go back in a conceptual history (more complex)
                         // For now, let's just pick another random track, similar to 'next' in shuffle
                         prevIndex = Math.floor(Math.random() * queue.length);
                         if (queue.length > 1 && prevIndex === currentIndexInQueue) {
                             prevIndex = (prevIndex - 1 + queue.length) % queue.length; // Avoid same track
                         }
                     } else {
                         // Linear playback logic
                         prevIndex = currentIndexInQueue - 1;
                         if (prevIndex < 0) {
                             if (loopMode === 'all') {
                                 prevIndex = queue.length - 1; // Wrap around to the end if looping
                             } else {
                                 console.log('[PlayerStore] Reached beginning of queue.');
                                 // Not looping or only looping one track, stay at the beginning
                                 // Maybe seek to 0 instead? Handled by player component potentially.
                                 return; // Stop here if not looping all and at the beginning
                             }
                         }
                     }

                     if (prevIndex < 0 || prevIndex >= queue.length) {
                        console.error('[PlayerStore] Calculated invalid prevIndex:', prevIndex);
                        return; // Safety check
                    }
                
                     const prevTrack = queue[prevIndex];
                     console.log(`[PlayerStore] Playing previous track: ${prevTrack.id} at index ${prevIndex}`);
                     set({
                         currentTrack: prevTrack,
                         currentIndexInQueue: prevIndex,
                         isPlaying: true, // Assume playback continues
                         isLoading: true,
                         error: null,
                     });
                },


                togglePlay: () => {
                    if (get().currentTrack) {
                        set((state) => ({ isPlaying: !state.isPlaying }));
                    } else {
                        console.warn("[PlayerStore] Toggle play called without a current track.");
                        // Optionally play the first track in the queue?
                    }
                },

                setPlayState: (playing) => {
                    set({ isPlaying: playing });
                },

                setVolume: (volume) => {
                     // Ensure volume is within 0-100 range
                    const clampedVolume = Math.max(0, Math.min(100, volume));
                    set({ volume: clampedVolume, isMuted: clampedVolume === 0 });
                },

                toggleMute: () => {
                    set((state) => ({ isMuted: !state.isMuted }));
                },

                toggleLoop: () => {
                    set((state) => {
                        let nextLoopMode: PlayerState['loopMode'];
                        if (state.loopMode === 'off') nextLoopMode = 'all';
                        else if (state.loopMode === 'all') nextLoopMode = 'one';
                        else nextLoopMode = 'off'; // 'one' -> 'off'
                        console.log('[PlayerStore] Loop mode changed to:', nextLoopMode);
                        return { loopMode: nextLoopMode };
                    });
                },

                toggleShuffle: () => {
                    set((state) => {
                        const newShuffleState = !state.isShuffled;
                        console.log('[PlayerStore] Shuffle mode changed to:', newShuffleState);
                        // TODO: Add logic here to actually shuffle the queue if needed when turning shuffle ON?
                        // Or handle shuffling primarily in playNext/playPrevious
                        return { isShuffled: newShuffleState };
                    });
                },

                setLoading: (loading) => {
                    set({ isLoading: loading });
                },

                setError: (error) => {
                    set({ error: error, isLoading: false }); // Stop loading on error
                    if (error) {
                        console.error("[PlayerStore] Error set:", error);
                        toast.error(error); // Display toast notification
                    }
                },

                clearPlayer: () => {
                    console.log('[PlayerStore] Clearing player state.');
                    set(initialState); // Reset to initial state
                },
            }),
            {
                name: 'wavhaven-player-storage', // Unique name for local storage
                partialize: (state) => ({
                    // Persist only specific parts of the state
                    volume: state.volume,
                    isMuted: state.isMuted,
                    loopMode: state.loopMode,
                    isShuffled: state.isShuffled,
                    // Don't persist currentTrack, queue, isPlaying, isLoading, error
                    // They should be re-initialized on page load or based on user actions
                }),
            },
        )
    )
); 