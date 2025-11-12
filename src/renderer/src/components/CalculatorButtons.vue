<script setup lang="ts">
/**
 * Calculator Buttons Component
 * All calculator buttons in a clean grid layout
 */

import CalculatorButton from './CalculatorButton.vue'
import CameraButton from './CameraButton.vue'
import type { Operation } from '../types/calculator'

interface Props {
  clearClickCount: number
  isCameraProcessing: boolean
  hasCameraError: boolean
  cameraError: any
}

interface Emits {
  (e: 'number-click', num: string): void
  (e: 'operation-click', op: Operation): void
  (e: 'equals-click'): void
  (e: 'clear-click'): void
  (e: 'backspace-click'): void
  (e: 'toggle-sign-click'): void
  (e: 'camera-click'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="flex-1 p-3 grid grid-cols-4 gap-2 content-stretch">
    <!-- Row 1: Clear, Backspace, Camera, / -->
    <div class="relative">
      <CalculatorButton
        label="C"
        variant="clear"
        @click="emit('clear-click')"
        :title="'Single click: Clear calculator | Double click: Clear all + history'"
      />
      <div
        v-if="clearClickCount > 0"
        class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10"
      >
        Double-click for AC
      </div>
    </div>

    <CalculatorButton label="⌫" variant="function" @click="emit('backspace-click')" />

    <div class="relative">
      <CameraButton
        :disabled="isCameraProcessing"
        :is-processing="isCameraProcessing"
        size="medium"
        variant="secondary"
        @click="emit('camera-click')"
      />
      <div
        v-if="hasCameraError"
        class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-800"
        :title="cameraError?.message"
      />
    </div>

    <CalculatorButton label="÷" variant="operation" @click="emit('operation-click', '/')" />

    <!-- Row 2: 7, 8, 9, × -->
    <CalculatorButton label="7" variant="number" @click="emit('number-click', '7')" />
    <CalculatorButton label="8" variant="number" @click="emit('number-click', '8')" />
    <CalculatorButton label="9" variant="number" @click="emit('number-click', '9')" />
    <CalculatorButton label="×" variant="operation" @click="emit('operation-click', '*')" />

    <!-- Row 3: 4, 5, 6, % -->
    <CalculatorButton label="4" variant="number" @click="emit('number-click', '4')" />
    <CalculatorButton label="5" variant="number" @click="emit('number-click', '5')" />
    <CalculatorButton label="6" variant="number" @click="emit('number-click', '6')" />
    <CalculatorButton label="%" variant="operation" @click="emit('operation-click', '%')" />

    <!-- Row 4: 1, 2, 3, + -->
    <CalculatorButton label="1" variant="number" @click="emit('number-click', '1')" />
    <CalculatorButton label="2" variant="number" @click="emit('number-click', '2')" />
    <CalculatorButton label="3" variant="number" @click="emit('number-click', '3')" />
    <CalculatorButton label="−" variant="operation" @click="emit('operation-click', '-')" />

    <!-- Row 5: ±, 0, ., + -->
    <CalculatorButton label="±" variant="function" @click="emit('toggle-sign-click')" />
    <CalculatorButton label="0" variant="number" @click="emit('number-click', '0')" />
    <CalculatorButton label="." variant="number" @click="emit('number-click', '.')" />
    <CalculatorButton label="+" variant="operation" @click="emit('operation-click', '+')" />

    <!-- Row 6: =, spanning full width would be ideal but let's keep it simple -->
    <div class="col-span-4">
      <CalculatorButton label="=" variant="equals" @click="emit('equals-click')" />
    </div>
  </div>
</template>
