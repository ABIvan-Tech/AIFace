import test from 'node:test';
import assert from 'node:assert/strict';
import { AIAgent } from '../dist/ai/agent.js';

const createInitializedAgent = async () => {
  const agent = new AIAgent();
  await agent.initialize();
  return agent;
};

test('setMood without intensity applies expressive default for non-neutral', async () => {
  const agent = await createInitializedAgent();

  const avatar = await agent.setMood('happy');

  assert.equal(avatar.mood, 'happy');
  assert.ok(avatar.intensity > 0, 'expected non-zero intensity for expressive mood');
  await agent.shutdown();
});

test('neutral to happy transition is allowed', async () => {
  const agent = await createInitializedAgent();

  const avatar = agent.pushEmotionIntent({
    source: 'INLINE',
    mood: 'happy',
    intensity: 0.8,
    confidence: 1,
    timestamp: Date.now(),
  });

  assert.equal(avatar.mood, 'happy');
  assert.ok(avatar.intensity > 0.5);
  await agent.shutdown();
});

test('POST angry intent is restricted and falls back to calm', async () => {
  const agent = await createInitializedAgent();

  const avatar = agent.pushEmotionIntent({
    source: 'POST',
    mood: 'angry',
    intensity: 1,
    confidence: 1,
    timestamp: Date.now(),
  });

  assert.equal(avatar.mood, 'calm');
  assert.ok(avatar.intensity <= 0.5);
  await agent.shutdown();
});

test('INLINE angry from neutral is allowed but intensity is capped', async () => {
  const agent = await createInitializedAgent();

  const avatar = agent.pushEmotionIntent({
    source: 'INLINE',
    mood: 'angry',
    intensity: 1,
    confidence: 0.9,
    timestamp: Date.now(),
  });

  assert.equal(avatar.mood, 'angry');
  assert.ok(avatar.intensity <= 0.6);
  await agent.shutdown();
});

test('tick decay transitions expressive mood to calm and then neutral', async () => {
  const agent = await createInitializedAgent();

  agent.pushEmotionIntent({
    source: 'INLINE',
    mood: 'happy',
    intensity: 0.06,
    confidence: 1,
    timestamp: Date.now(),
  });

  agent.lastTickTs = Date.now() - 20000;
  agent.tick();

  const afterFirstTick = await agent.getAvatar();
  assert.equal(afterFirstTick.mood, 'calm');

  afterFirstTick.intensity = 0.01;
  agent.lastTickTs = Date.now() - 20000;
  agent.tick();

  const afterSecondTick = await agent.getAvatar();
  assert.equal(afterSecondTick.mood, 'neutral');
  assert.equal(afterSecondTick.intensity, 0);
  await agent.shutdown();
});

test('cooldown rejects lower-priority intent during active window', async () => {
  const agent = await createInitializedAgent();

  agent.pushEmotionIntent({
    source: 'INLINE',
    mood: 'happy',
    intensity: 0.8,
    confidence: 0.9,
    timestamp: Date.now(),
  });

  const avatar = agent.pushEmotionIntent({
    source: 'POST',
    mood: 'sad',
    intensity: 0.9,
    confidence: 1,
    timestamp: Date.now(),
  });

  assert.equal(avatar.mood, 'happy');
  await agent.shutdown();
});

test('transition budget forces calm when limit is exceeded', async () => {
  const agent = await createInitializedAgent();

  const push = (mood) => {
    // Keep calls outside cooldown so only transition budget is under test.
    agent.lastIntentTs = Date.now() - 2000;
    return agent.pushEmotionIntent({
      source: 'INLINE',
      mood,
      intensity: 0.8,
      confidence: 1,
      timestamp: Date.now(),
    });
  };

  push('happy');
  push('amused');
  push('happy');
  push('amused');
  push('happy');
  push('amused');

  const avatar = push('happy');

  assert.equal(avatar.mood, 'calm');
  assert.ok(avatar.intensity <= 0.35);
  await agent.shutdown();
});

test('cooldown allows override from higher-priority source', async () => {
  const agent = await createInitializedAgent();

  agent.pushEmotionIntent({
    source: 'POST',
    mood: 'happy',
    intensity: 0.8,
    confidence: 0.6,
    timestamp: Date.now(),
  });

  const avatar = agent.pushEmotionIntent({
    source: 'INLINE',
    mood: 'amused',
    intensity: 0.9,
    confidence: 1,
    timestamp: Date.now(),
  });

  assert.equal(avatar.mood, 'amused');
  assert.ok(avatar.intensity > 0.7);
  await agent.shutdown();
});

test('confidence gate rejects very low-confidence intents', async () => {
  const agent = await createInitializedAgent();

  const before = await agent.getAvatar();

  const avatar = agent.pushEmotionIntent({
    source: 'POST',
    mood: 'happy',
    intensity: 1,
    confidence: 0.1,
    timestamp: Date.now(),
  });

  assert.equal(avatar.mood, before.mood);
  assert.equal(avatar.intensity, before.intensity);
  await agent.shutdown();
});

test('same-source cooldown override requires higher confidence', async () => {
  const agent = await createInitializedAgent();

  agent.pushEmotionIntent({
    source: 'POST',
    mood: 'happy',
    intensity: 0.8,
    confidence: 0.8,
    timestamp: Date.now(),
  });

  // Same source + lower confidence should be rejected during cooldown.
  const rejected = agent.pushEmotionIntent({
    source: 'POST',
    mood: 'amused',
    intensity: 0.9,
    confidence: 0.7,
    timestamp: Date.now(),
  });
  assert.equal(rejected.mood, 'happy');

  // Same source + higher confidence should override during cooldown.
  const accepted = agent.pushEmotionIntent({
    source: 'POST',
    mood: 'amused',
    intensity: 0.9,
    confidence: 0.95,
    timestamp: Date.now(),
  });
  assert.equal(accepted.mood, 'amused');
  await agent.shutdown();
});

test('calm intensity is capped at 0.5', async () => {
  const agent = await createInitializedAgent();

  const avatar = agent.pushEmotionIntent({
    source: 'INLINE',
    mood: 'calm',
    intensity: 1,
    confidence: 1,
    timestamp: Date.now(),
  });

  assert.equal(avatar.mood, 'calm');
  assert.ok(avatar.intensity <= 0.5);
  await agent.shutdown();
});

test('neutral intensity is always forced to 0', async () => {
  const agent = await createInitializedAgent();

  agent.pushEmotionIntent({
    source: 'INLINE',
    mood: 'happy',
    intensity: 0.9,
    confidence: 1,
    timestamp: Date.now(),
  });

  agent.lastIntentTs = Date.now() - 2000;

  const avatar = agent.pushEmotionIntent({
    source: 'INLINE',
    mood: 'neutral',
    intensity: 1,
    confidence: 1,
    timestamp: Date.now(),
  });

  assert.equal(avatar.mood, 'neutral');
  assert.equal(avatar.intensity, 0);
  await agent.shutdown();
});

test('angry TTL expires to calm on tick', async () => {
  const agent = await createInitializedAgent();

  agent.pushEmotionIntent({
    source: 'INLINE',
    mood: 'angry',
    intensity: 0.6,
    confidence: 1,
    timestamp: Date.now(),
  });

  // Force TTL expiration and run tick.
  agent.angryUntilTs = Date.now() - 1;
  agent.lastTickTs = Date.now() - 1000;
  agent.tick();

  const avatar = await agent.getAvatar();
  assert.equal(avatar.mood, 'calm');
  assert.ok(avatar.intensity <= 0.35);
  await agent.shutdown();
});

test('forbidden direct transition falls back to calm', async () => {
  const agent = await createInitializedAgent();

  agent.pushEmotionIntent({
    source: 'INLINE',
    mood: 'happy',
    intensity: 0.8,
    confidence: 1,
    timestamp: Date.now(),
  });

  agent.lastIntentTs = Date.now() - 2000;

  // happy -> nervous is forbidden by current graph and should fallback to calm.
  const avatar = agent.pushEmotionIntent({
    source: 'INLINE',
    mood: 'nervous',
    intensity: 0.8,
    confidence: 1,
    timestamp: Date.now(),
  });

  assert.equal(avatar.mood, 'calm');
  await agent.shutdown();
});

test('transition budget window allows transitions after old history is pruned', async () => {
  const agent = await createInitializedAgent();

  // Simulate stale transition history older than TRANSITION_WINDOW_MS.
  agent.transitionHistoryTs = Array.from({ length: 6 }, () => Date.now() - 120000);
  agent.lastIntentTs = Date.now() - 2000;

  const avatar = agent.pushEmotionIntent({
    source: 'INLINE',
    mood: 'happy',
    intensity: 0.8,
    confidence: 1,
    timestamp: Date.now(),
  });

  assert.equal(avatar.mood, 'happy');
  await agent.shutdown();
});
