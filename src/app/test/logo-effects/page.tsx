'use client';

import { Logo } from '@/components/ui/Logo';
import { usePlayerStore } from '@/stores/use-player-store';
import { Button } from '@/components/ui/button';

export default function LogoEffectsDemo() {
  const { isPlaying, setPlayState } = usePlayerStore();

  const effects = [
    { 
      name: 'Living Wave (NEW!)', 
      value: 'living-wave', 
      description: 'Animated waveform that responds to hover and music playback - the most brand-relevant effect!' 
    },
    { 
      name: 'Subtle Glow', 
      value: 'subtle-glow', 
      description: 'Gentle brightness increase with cyan glow' 
    },
    { 
      name: 'Brightness', 
      value: 'brightness', 
      description: 'Simple brightness increase' 
    },
    { 
      name: 'Opacity', 
      value: 'opacity', 
      description: 'Subtle opacity fade effect' 
    },
    { 
      name: 'No Effect', 
      value: 'none', 
      description: 'Clean, no hover effects' 
    },
  ] as const;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">🌊 Living Wave Logo Demo</h1>
        <p className="text-muted-foreground text-center mb-8">
          Experience the brand-new "Living Wave" animation that brings your logo to life!
        </p>
        
        {/* Player State Control */}
        <div className="bg-card rounded-lg p-6 mb-8 border">
          <h2 className="text-xl font-semibold mb-4">🎵 Player State Control</h2>
          <p className="text-muted-foreground mb-4">
            Test the "Player-Active" animation! When music is playing, the wave animates continuously.
          </p>
          <Button 
            onClick={() => setPlayState(!isPlaying)}
            variant={isPlaying ? "destructive" : "default"}
            className="mb-2"
          >
            {isPlaying ? "🔄 Stop Music (Stop Wave Animation)" : "▶️ Play Music (Start Wave Animation)"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Current state: <span className="font-bold">{isPlaying ? "PLAYING 🎵" : "STOPPED ⏹️"}</span>
          </p>
        </div>

        {/* Living Wave Showcase */}
        <div className="bg-card rounded-lg p-6 mb-8 border border-cyan-500/20 bg-gradient-to-r from-background to-cyan-500/5">
          <h2 className="text-xl font-semibold mb-4 text-cyan-glow">🌟 Living Wave Animation</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-6">
            <div className="text-center">
              <h3 className="font-medium mb-2">Header Logo (Player Sync ON)</h3>
              <Logo 
                width={72} 
                height={40} 
                hoverEffect="living-wave" 
                enablePlayerSync={true}
                className="text-cyan-glow"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {isPlaying ? "🔄 Animating with music" : "🎵 Hover to see wave effect"}
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-medium mb-2">Footer Logo (Hover Only)</h3>
              <Logo 
                width={48} 
                height={28} 
                hoverEffect="living-wave" 
                enablePlayerSync={false}
                className="text-cyan-glow"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Hover to see wave effect
              </p>
            </div>
          </div>
          <div className="bg-background/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">✨ What makes it special:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 🌊 The wave inside the house icon actually animates</li>
              <li>• 🎵 Syncs with music playback for a "living" brand experience</li>
              <li>• ⚡ Smooth Framer Motion animations for premium feel</li>
              <li>• 🎯 Brand-relevant - connects visual identity to "WAV" in WAVHAVEN</li>
              <li>• 🏎️ Hardware accelerated for smooth 60fps performance</li>
            </ul>
          </div>
        </div>

        {/* All Effects Comparison */}
        <div className="bg-card rounded-lg p-6 border">
          <h2 className="text-xl font-semibold mb-6">All Hover Effects Comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {effects.map((effect) => (
              <div key={effect.value} className="text-center p-4 rounded-lg border bg-background/50">
                <h3 className="font-medium mb-2 text-foreground">
                  {effect.name}
                  {effect.value === 'living-wave' && <span className="text-cyan-glow"> ✨</span>}
                </h3>
                <div className="flex justify-center mb-3">
                  <Logo 
                    width={56} 
                    height={32} 
                    hoverEffect={effect.value as any} 
                    enablePlayerSync={effect.value === 'living-wave'}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{effect.description}</p>
                {effect.value === 'living-wave' && (
                  <p className="text-xs text-cyan-glow mt-1 font-medium">
                    🎯 Recommended for header!
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Implementation Guide */}
        <div className="bg-card rounded-lg p-6 mt-8 border">
          <h2 className="text-xl font-semibold mb-4">🛠️ Implementation Guide</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium text-cyan-glow">Header Logo (Player Sync)</h3>
              <code className="block bg-background p-2 rounded mt-1">
                {`<Logo hoverEffect="living-wave" enablePlayerSync={true} />`}
              </code>
            </div>
            <div>
              <h3 className="font-medium">Footer Logo (Hover Only)</h3>
              <code className="block bg-background p-2 rounded mt-1">
                {`<Logo hoverEffect="living-wave" enablePlayerSync={false} />`}
              </code>
            </div>
            <div>
              <h3 className="font-medium">Other Effects</h3>
              <code className="block bg-background p-2 rounded mt-1">
                {`<Logo hoverEffect="brightness" /> // or "subtle-glow", "opacity", "none"`}
              </code>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-card rounded-lg p-6 mt-8 border">
          <h2 className="text-xl font-semibold mb-4">⚙️ Technical Implementation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium mb-2">🎭 Animation States</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li><strong>Idle:</strong> Static wave form</li>
                <li><strong>Hover:</strong> Gentle wave movement</li>
                <li><strong>Playing:</strong> Continuous oscillation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">🚀 Performance</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li><strong>Library:</strong> Framer Motion</li>
                <li><strong>GPU:</strong> Hardware accelerated</li>
                <li><strong>60fps:</strong> Smooth animations</li>
                <li><strong>Responsive:</strong> Mobile optimized</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 