<script setup lang="ts">
interface Props {
  theta1: number
  theta2: number
  L1: number
  L2: number
  endEffector: { x: number; y: number }
  isMoving: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:theta1': [value: number]
  'update:theta2': [value: number]
  'update:L1': [value: number]
  'update:L2': [value: number]
  start: []
  stop: []
  reset: []
}>()
</script>

<template>
  <div class="controls-container">
    <div class="controls-header">
      <h1>2-Link Manipulator</h1>
      <p class="subtitle">Control joint angles and link lengths</p>
    </div>

    <div class="controls-section">
      <h2>Joint Angles</h2>
      
      <div class="control-group">
        <label>
          <span class="label-text">θ₁ (Joint 1)</span>
          <span class="value">{{ theta1.toFixed(1) }}°</span>
        </label>
        <input
          type="range"
          :value="theta1"
          min="-180"
          @input="emit('update:theta1', Number(($event.target as HTMLInputElement).value))"
          max="180"
          step="1"
        />
      </div>

      <div class="control-group">
        <label>
          <span class="label-text">θ₂ (Joint 2)</span>
          <span class="value">{{ theta2.toFixed(1) }}°</span>
        </label>
        <input
          type="range"
          :value="theta2"
          min="-180"
          @input="emit('update:theta2', Number(($event.target as HTMLInputElement).value))"
          max="180"
          step="1"
        />
      </div>
    </div>

    <div class="controls-section">
      <h2>Link Lengths</h2>
      
      <div class="control-group">
        <label>
          <span class="label-text">L₁ (Link 1)</span>
          <span class="value">{{ L1.toFixed(0) }}px</span>
        </label>
        <input
          type="range"
          :value="L1"
          min="50"
          @input="emit('update:L1', Number(($event.target as HTMLInputElement).value))"
          max="250"
          step="5"
        />
      </div>

      <div class="control-group">
        <label>
          <span class="label-text">L₂ (Link 2)</span>
          <span class="value">{{ L2.toFixed(0) }}px</span>
        </label>
        <input
          type="range"
          :value="L2"
          min="50"
          @input="emit('update:L2', Number(($event.target as HTMLInputElement).value))"
          max="250"
          step="5"
        />
      </div>
    </div>

    <div class="controls-section">
      <h2>End Effector Position</h2>
      <div class="position-display">
        <div class="position-item">
          <span class="position-label">X:</span>
          <span class="position-value">{{ endEffector.x.toFixed(2) }}</span>
        </div>
        <div class="position-item">
          <span class="position-label">Y:</span>
          <span class="position-value">{{ endEffector.y.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <div class="button-group">
      <button v-if="!isMoving" class="action-button start-button" @click="emit('start')">
        Start Movement
      </button>
      <button v-else class="action-button stop-button" @click="emit('stop')">
        Stop Movement
      </button>
      
      <button class="action-button reset-button" @click="emit('reset')">
        Reset to Default
      </button>
    </div>
  </div>
</template>

<style scoped>
.controls-container {
  width: 400px;
  background: #1a1a1a;
  padding: 2rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.controls-header {
  border-bottom: 2px solid #333;
  padding-bottom: 1rem;
}

h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: #4ecdc4;
}

.subtitle {
  margin: 0;
  color: #888;
  font-size: 0.875rem;
}

.controls-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: #fff;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.label-text {
  color: #ccc;
  font-weight: 500;
}

.value {
  color: #4ecdc4;
  font-weight: 600;
  font-family: monospace;
}

input[type="range"] {
  width: 100%;
  height: 6px;
  background: #333;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #4ecdc4;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: #5fd9d0;
  transform: scale(1.1);
}

input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #4ecdc4;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

input[type="range"]::-moz-range-thumb:hover {
  background: #5fd9d0;
  transform: scale(1.1);
}

.position-display {
  display: flex;
  gap: 1.5rem;
  padding: 1rem;
  background: #0a0a0a;
  border-radius: 8px;
  border: 1px solid #333;
}

.position-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.position-label {
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.position-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffe66d;
  font-family: monospace;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-button {
  padding: 0.75rem 1.5rem;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.start-button {
  background: #4ecdc4;
}

.start-button:hover {
  background: #5fd9d0;
}

.stop-button {
  background: #ff6b6b;
}

.stop-button:hover {
  background: #ff5252;
}

.reset-button {
  background: #333;
  border: 1px solid #555;
}

.reset-button:hover {
  background: #444;
  border-color: #666;
}

.action-button:active {
  transform: scale(0.98);
}
</style>
