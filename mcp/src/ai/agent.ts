import { AgentState, AvatarConfig, SceneDocument, Shape, Mood, EmotionIntent } from '../utils/types.js';

const PROTECTED_SHAPE_ID = 'face_base';

export class AIAgent {
  private state: AgentState;
  private defaultAvatar: AvatarConfig;

  private lastTickTs: number = Date.now();

  // Intent arbitration + safety
  private lastAcceptedIntent: Pick<EmotionIntent, 'source' | 'confidence' | 'timestamp'> | null = null;
  private moodEnteredAtTs: number = Date.now();
  private angryUntilTs: number = 0;
  private transitionHistoryTs: number[] = [];

  // Micro-movement state (non-semantic)
  private breathPhase: number = 0;
  private blinkUntilTs: number = 0;
  private nextBlinkAtTs: number = Date.now() + 2500;
  private lastIntentTs: number = 0;

  private readonly INTENT_COOLDOWN_MS = 1000;
  private readonly DECAY_SECONDS = 75;
  private readonly INTENSITY_TO_CALM_THRESHOLD = 0.05;
  private readonly CALM_TO_NEUTRAL_THRESHOLD = 0.02;
  private readonly MAX_TRANSITIONS_PER_MIN = 6;
  private readonly TRANSITION_WINDOW_MS = 60_000;
  private readonly ANGRY_MAX_MS = 8_000;
  private readonly DEFAULT_INTENSITY_IF_OMITTED = 0.7;

  constructor() {
    this.defaultAvatar = {
      id: 'default',
      name: 'Agent',
      mood: 'neutral',
      intensity: 0.5
    };
    
    this.state = {
      isRunning: false,
      lastUpdate: new Date(),
      mood: 'neutral'
    };
  }

  async initialize(): Promise<void> {
    console.error('Initializing AI agent...');
    this.state.isRunning = true;
    this.state.lastUpdate = new Date();
    this.state.mood = this.defaultAvatar.mood;
    this.lastTickTs = Date.now();
    console.error('AI agent initialized');
  }

  async shutdown(): Promise<void> {
    this.state.isRunning = false;
    this.state.lastUpdate = new Date();
  }

  /**
   * Returns the singleton avatar. No creation/deletion allowed for LLM.
   */
  async getAvatar(): Promise<AvatarConfig> {
    return this.defaultAvatar;
  }

  /**
   * Updates the singleton mood.
   */
  async setMood(mood?: Mood, intensity?: number): Promise<AvatarConfig> {
    const now = Date.now();
    const nextMood = mood ?? this.defaultAvatar.mood;
    const nextIntensity =
      intensity !== undefined
        ? clamp01(intensity)
        : nextMood === 'neutral'
          ? 0
          : this.defaultAvatar.intensity > 0
            ? this.defaultAvatar.intensity
            : this.DEFAULT_INTENSITY_IF_OMITTED;

    // For v1, setMood is treated as a direct intent with full confidence.
    this.applyIntent({
      source: 'INLINE',
      mood: nextMood,
      intensity: nextIntensity,
      confidence: 1,
      timestamp: now,
    });

    this.updateState('mood_updated');
    return this.defaultAvatar;
  }

  /**
   * Accepts an emotion intent (INLINE/POST).
   * The agent stabilizes emotion and compiles it into Scene DSL.
   */
  pushEmotionIntent(intent: EmotionIntent): AvatarConfig {
    this.applyIntent(intent);
    this.updateState('emotion_intent');
    return this.defaultAvatar;
  }

  /**
   * Advances internal timers, decay, and micro-movements.
   */
  tick(): void {
    const now = Date.now();
    const dtMs = Math.max(0, now - this.lastTickTs);
    this.lastTickTs = now;

    // Decay intensity toward calm/neutral over time.
    const dtSec = dtMs / 1000;

    // Breath is always safe and non-semantic.
    this.breathPhase = (this.breathPhase + dtSec * 2 * Math.PI * 0.18) % (2 * Math.PI);

    // Blinking: random-looking but deterministic cadence.
    if (now >= this.nextBlinkAtTs) {
      this.blinkUntilTs = now + 140;
      const jitter = (Math.sin(now / 731) + 1) / 2; // 0..1
      this.nextBlinkAtTs = now + 2500 + Math.floor(jitter * 3000);
    }

    // ANGRY is restricted and short-lived.
    if (this.defaultAvatar.mood === 'angry' && this.angryUntilTs > 0 && now >= this.angryUntilTs) {
      console.error('[MCP] FSM Transition: angry expired -> calm');
      this.defaultAvatar.mood = 'calm';
      this.state.mood = 'calm';
      this.defaultAvatar.intensity = Math.min(this.defaultAvatar.intensity, 0.35);
      this.angryUntilTs = 0;
      this.moodEnteredAtTs = now;
    }

    // Semantic decay: intensity decreases over ~30–90s (v1 uses 75s).
    if (this.defaultAvatar.intensity > 0) {
      const decayPerSec = 1 / this.DECAY_SECONDS;
      this.defaultAvatar.intensity = Math.max(0, this.defaultAvatar.intensity - decayPerSec * dtSec);
    }

    // FSM: always decays toward CALM → NEUTRAL.
    if (this.defaultAvatar.intensity <= this.INTENSITY_TO_CALM_THRESHOLD) {
      if (this.defaultAvatar.mood !== 'neutral' && this.defaultAvatar.mood !== 'calm') {
        console.error(`[MCP] FSM Transition: ${this.defaultAvatar.mood} -> calm`);
        this.defaultAvatar.mood = 'calm';
        this.state.mood = 'calm';
        this.moodEnteredAtTs = now;
      } else if (this.defaultAvatar.mood === 'calm' && this.defaultAvatar.intensity <= this.CALM_TO_NEUTRAL_THRESHOLD) {
        console.error('[MCP] FSM Transition: calm -> neutral');
        this.defaultAvatar.mood = 'neutral';
        this.state.mood = 'neutral';
        this.defaultAvatar.intensity = 0;
        this.moodEnteredAtTs = now;
      }
    }
  }

  /**
   * Generates a SceneDocument based on the avatar's mood.
   * Uses canononical coordinates: X, Y in [-100, +100]
   */
  generateScene(avatar: AvatarConfig): SceneDocument {
    const mood = avatar.mood || 'neutral';
    const intensity = clamp01(avatar.intensity ?? 0);
    
    const shapes: Shape[] = [
      {
        id: 'background',
        type: 'rect',
        transform: { x: 0, y: 0, rotation: 0 },
        style: { fill: '#FFFFFF', stroke: null, strokeWidth: 0, opacity: 1 },
        props: { width: 200, height: 200 }
      },
      {
        id: PROTECTED_SHAPE_ID,
        type: 'circle',
        transform: { x: 0, y: 0, rotation: 0 },
        style: { fill: '#FFD8B0', stroke: null, strokeWidth: 0, opacity: 1 },
        props: { radius: 90 }
      },
      this.makeBrowShape('left', mood, intensity),
      this.makeBrowShape('right', mood, intensity),
      {
        id: 'left_eye',
        type: 'circle',
        transform: { x: -30, y: -20, rotation: 0 },
        style: { fill: '#000000', stroke: null, strokeWidth: 0, opacity: 1 },
        props: { radius: this.getEyeRadiusPx(intensity) }
      },
      {
        id: 'right_eye',
        type: 'circle',
        transform: { x: 30, y: -20, rotation: 0 },
        style: { fill: '#000000', stroke: null, strokeWidth: 0, opacity: 1 },
        props: { radius: this.getEyeRadiusPx(intensity) }
      },
      this.makeMouthShape(mood, intensity)
    ];

    return {
      schema: 'ai-face.v1',
      scene: shapes
    };
  }

  /**
   * Generates a small set of shapes suitable for `apply_mutations`.
   */
  generateMutationShapes(): Shape[] {
    const mood = this.defaultAvatar.mood;
    const intensity = clamp01(this.defaultAvatar.intensity);

    const breath = Math.sin(this.breathPhase) * 2.5; // world units
    const blink = Date.now() < this.blinkUntilTs;
    const eyeRadius = blink ? 1.2 : this.getEyeRadiusPx(intensity);

    return [
      this.makeBrowShape('left', mood, intensity, breath),
      this.makeBrowShape('right', mood, intensity, breath),
      {
        id: 'left_eye',
        type: 'circle',
        transform: { x: -30, y: -20 + breath, rotation: 0 },
        style: { fill: '#000000', stroke: null, strokeWidth: 0, opacity: 1 },
        props: { radius: eyeRadius },
      },
      {
        id: 'right_eye',
        type: 'circle',
        transform: { x: 30, y: -20 + breath, rotation: 0 },
        style: { fill: '#000000', stroke: null, strokeWidth: 0, opacity: 1 },
        props: { radius: eyeRadius },
      },
      this.makeMouthShape(mood, intensity, breath),
    ];
  }

  private applyIntent(intent: EmotionIntent): void {
    const now = Date.now();
    const confidence = clamp01(intent.confidence);
    if (confidence < 0.2) return;

    // Global cooldown with arbitration (INLINE > HYBRID > POST).
    const dtSinceLast = now - this.lastIntentTs;
    if (dtSinceLast < this.INTENT_COOLDOWN_MS) {
      if (!this.shouldOverrideDuringCooldown(intent)) {
        console.error('[MCP] Intent rejected: Cooldown active');
        return;
      }
    }

    const desiredMood = intent.mood;
    const desiredIntensity = clamp01(intent.intensity);

    const nextMood = this.guardTransition(this.defaultAvatar.mood, desiredMood, intent);
    const nextIntensity = this.guardIntensity(nextMood, desiredIntensity);

    // Transition budget (max transitions per minute).
    const isTransition = nextMood !== this.defaultAvatar.mood;
    if (isTransition) {
      this.transitionHistoryTs = this.transitionHistoryTs.filter((ts) => now - ts < this.TRANSITION_WINDOW_MS);
      if (this.transitionHistoryTs.length >= this.MAX_TRANSITIONS_PER_MIN) {
        console.error('[MCP] Intent limited: budget exceeded, forcing calm');
        this.defaultAvatar.mood = 'calm';
        this.state.mood = 'calm';
        this.defaultAvatar.intensity = Math.min(this.defaultAvatar.intensity, 0.35);
        this.angryUntilTs = 0;
        this.moodEnteredAtTs = now;
        return;
      }
      this.transitionHistoryTs.push(now);
      this.moodEnteredAtTs = now;
    }

    // Apply.
    this.defaultAvatar.mood = nextMood;
    this.state.mood = nextMood;
    this.defaultAvatar.intensity = nextIntensity;

    // Restrict/expire ANGRY.
    if (nextMood === 'angry') {
      this.angryUntilTs = now + this.ANGRY_MAX_MS;
    } else {
      this.angryUntilTs = 0;
    }

    this.lastIntentTs = now;
    this.lastAcceptedIntent = { source: intent.source, confidence, timestamp: Number(intent.timestamp ?? now) };
  }

  private shouldOverrideDuringCooldown(intent: EmotionIntent): boolean {
    const prev = this.lastAcceptedIntent;
    if (!prev) return false;

    const prevPriority = this.getSourcePriority(prev.source);
    const nextPriority = this.getSourcePriority(intent.source);
    if (nextPriority > prevPriority) return true;

    const prevConfidence = clamp01(prev.confidence);
    const nextConfidence = clamp01(intent.confidence);
    if (nextPriority === prevPriority && nextConfidence > prevConfidence) return true;

    return false;
  }

  private getSourcePriority(source: EmotionIntent['source']): number {
    if (source === 'INLINE') return 3;
    // Future-proof: HYBRID may be introduced by clients even if not used yet.
    if (source === 'HYBRID') return 2;
    return 1;
  }

  private guardTransition(from: Mood, to: Mood, intent: EmotionIntent): Mood {
    if (to === from) return to;
    if (to === 'calm' || to === 'neutral') return to;

    // ANGRY is restricted and should never appear as a direct extreme jump.
    if (to === 'angry') {
      const okSource = intent.source === 'INLINE';
      const okConfidence = clamp01(intent.confidence) >= 0.8;
      const okFrom = from === 'calm' || from === 'neutral' || from === 'nervous' || from === 'sad';
      if (okSource && okConfidence && okFrom) return 'angry';
      return 'calm';
    }

    // Allowed transitions (simplified from docs).
    if (from === 'neutral' && (to === 'happy' || to === 'amused' || to === 'nervous' || to === 'sad')) return to;
    if (from === 'calm' && (to === 'happy' || to === 'amused' || to === 'nervous' || to === 'sad')) return to;
    if (from === 'happy' && to === 'amused') return to;
    if (from === 'amused' && to === 'happy') return to;

    // Default fail-safe: CALM.
    return 'calm';
  }

  private guardIntensity(mood: Mood, intensity: number): number {
    if (mood === 'neutral') return 0;
    if (mood === 'angry') return Math.min(intensity, 0.6);
    if (mood === 'calm') return Math.min(intensity, 0.5);
    return intensity;
  }

  private makeBrowShape(side: 'left' | 'right', mood: Mood, intensity: number, breathYOffset: number = 0): Shape {
    const base = this.getBrowProps(side, 'neutral');
    const target = this.getBrowProps(side, mood);
    const props = lerpRecord(base, target, intensity);

    return {
      id: side === 'left' ? 'left_brow' : 'right_brow',
      type: 'line',
      transform: { x: 0, y: breathYOffset, rotation: this.getMoodRotation('brow', side, mood) * intensity },
      style: { fill: null, stroke: '#000000', strokeWidth: 4, opacity: 1 },
      props,
    };
  }

  private makeMouthShape(mood: Mood, intensity: number, breathYOffset: number = 0): Shape {
    const target = this.getMouthProps(mood);
    // To avoid 'C' distortions, the base (neutral) props for lerping must share the target's arc orientation
    const base = this.getMouthProps('neutral');
    const baseProps = { 
      ...base.props, 
      startAngle: target.props.startAngle, 
      sweepAngle: target.props.sweepAngle,
      height: 0 // Completely flat line in arc-space
    };
    
    const props = lerpRecord(baseProps, target.props, intensity);

    return {
      id: 'mouth',
      type: intensity > 0.5 ? target.type : base.type,
      transform: { x: 0, y: 35 + breathYOffset, rotation: 0 },
      style: { fill: null, stroke: '#000000', strokeWidth: 4, opacity: 1 },
      props,
    };
  }

  private getEyeRadiusPx(intensity: number): number {
    // Calm/Neutral are more relaxed eyes, lower intensity means slightly "sleepier" (smaller) eyes
    const mood = this.defaultAvatar.mood;
    const baseRadius = mood === 'calm' ? 6.5 : 7.5;
    return lerp(baseRadius, 9.0, intensity);
  }

  private getBrowProps(side: 'left' | 'right', mood: Mood): Record<string, number> {
    const isLeft = side === 'left';
    // Standardized level baseline for all brows to ensure rotation-only tilt parity
    const x1 = isLeft ? -40 : 15;
    const x2 = isLeft ? -15 : 40;
    
    // Calm/Amused/Happy brows are slightly higher than Neutral/Angry/Sad
    let y = -38;
    if (mood === 'calm' || mood === 'happy' || mood === 'amused') {
      y = -44;
    }

    return { x1, y1: y, x2, y2: y };
  }

  private getMouthProps(mood: Mood): { type: 'line' | 'arc'; props: Record<string, number> } {
    const all = { width: 50, height: 20, startAngle: 0, sweepAngle: 180, x1: -25, y1: 0, x2: 25, y2: 0 };

    switch (mood) {
    case 'happy': return { type: 'arc', props: { ...all, width: 60, height: 40, startAngle: 0, sweepAngle: 180 } };
    case 'amused': return { type: 'arc', props: { ...all, width: 70, height: 50, startAngle: 0, sweepAngle: 180 } };
    case 'calm': return { type: 'arc', props: { ...all, width: 40, height: 10, startAngle: 0, sweepAngle: 180 } };
    case 'nervous': return { type: 'arc', props: { ...all, width: 40, height: 15, startAngle: 0, sweepAngle: -180 } };
    case 'sad': return { type: 'arc', props: { ...all, width: 45, height: 25, startAngle: 0, sweepAngle: -180 } };
    case 'angry': return { type: 'arc', props: { ...all, width: 55, height: 35, startAngle: 0, sweepAngle: -180 } };
    default: return { type: 'line', props: { ...all, height: 0 } };
    }
  }

  private getMoodRotation(part: 'brow' | 'mouth', side: 'left' | 'right' | 'center', mood: Mood): number {
    if (part === 'brow') {
      const isLeft = side === 'left';
      if (mood === 'angry') return isLeft ? 15 : -15; // Inner end high (orig happy)
      if (mood === 'sad' || mood === 'nervous') return isLeft ? -15 : 15; // Inner end low/V-tilt (orig angry)
      return 0; // Neutral, Calm, Happy, Amused are level
    }
    if (part === 'mouth') {
      return 0; // Standardized to 0 for better stability
    }
    return 0;
  }

  getState(): AgentState {
    return { ...this.state };
  }

  private updateState(task: string): void {
    this.state.lastUpdate = new Date();
    this.state.currentTask = task;
  }
}

const clamp01 = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpRecord = (
  base: Record<string, number>,
  target: Record<string, number>,
  t: number,
): Record<string, number> => {
  const out: Record<string, number> = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(target)]);
  for (const key of keys) {
    const a = base[key] ?? 0;
    const b = target[key] ?? a;
    out[key] = lerp(a, b, t);
  }
  return out;
};
