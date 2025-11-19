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
  <div class="w-[400px] bg-[#1a1a1a] p-8 overflow-y-auto flex flex-col gap-8">
    <div class="border-b-2 border-[#333] pb-4">
      <h1 class="text-[1.75rem] font-bold m-0 mb-2 text-[#4ecdc4]">2-Link Manipulator</h1>
      <p class="m-0 text-[#888] text-sm">Control joint angles and link lengths</p>
    </div>

    <div class="flex flex-col gap-5">
      <h2 class="text-lg font-semibold m-0 mb-3 text-white">Joint Angles</h2>

      <div class="flex flex-col gap-2">
        <label class="flex justify-between items-center text-sm">
          <span class="text-[#ccc] font-medium">θ₁ (Joint 1)</span>
          <span class="text-[#4ecdc4] font-semibold font-mono">{{ theta1.toFixed(1) }}°</span>
        </label>
        <input
          type="range"
          :value="theta1"
          min="-180"
          max="180"
          step="1"
          @input="emit('update:theta1', Number(($event.target as HTMLInputElement).value))"
          class="w-full h-1.5 bg-[#333] rounded appearance-none outline-none cursor-pointer
                 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] 
                 [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-[#4ecdc4] 
                 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer 
                 [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-[#5fd9d0] 
                 [&::-webkit-slider-thumb]:hover:scale-110
                 [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] 
                 [&::-moz-range-thumb]:bg-[#4ecdc4] [&::-moz-range-thumb]:rounded-full 
                 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none 
                 [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:bg-[#5fd9d0] 
                 [&::-moz-range-thumb]:hover:scale-110"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="flex justify-between items-center text-sm">
          <span class="text-[#ccc] font-medium">θ₂ (Joint 2)</span>
          <span class="text-[#4ecdc4] font-semibold font-mono">{{ theta2.toFixed(1) }}°</span>
        </label>
        <input
          type="range"
          :value="theta2"
          min="-180"
          max="180"
          step="1"
          @input="emit('update:theta2', Number(($event.target as HTMLInputElement).value))"
          class="w-full h-1.5 bg-[#333] rounded appearance-none outline-none cursor-pointer
                 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] 
                 [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-[#4ecdc4] 
                 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer 
                 [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-[#5fd9d0] 
                 [&::-webkit-slider-thumb]:hover:scale-110
                 [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] 
                 [&::-moz-range-thumb]:bg-[#4ecdc4] [&::-moz-range-thumb]:rounded-full 
                 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none 
                 [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:bg-[#5fd9d0] 
                 [&::-moz-range-thumb]:hover:scale-110"
        />
      </div>
    </div>

    <div class="flex flex-col gap-5">
      <h2 class="text-lg font-semibold m-0 mb-3 text-white">Link Lengths</h2>

      <div class="flex flex-col gap-2">
        <label class="flex justify-between items-center text-sm">
          <span class="text-[#ccc] font-medium">L₁ (Link 1)</span>
          <span class="text-[#4ecdc4] font-semibold font-mono">{{ L1.toFixed(0) }}px</span>
        </label>
        <input
          type="range"
          :value="L1"
          min="50"
          max="250"
          step="5"
          @input="emit('update:L1', Number(($event.target as HTMLInputElement).value))"
          class="w-full h-1.5 bg-[#333] rounded appearance-none outline-none cursor-pointer
                 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] 
                 [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-[#4ecdc4] 
                 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer 
                 [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-[#5fd9d0] 
                 [&::-webkit-slider-thumb]:hover:scale-110
                 [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] 
                 [&::-moz-range-thumb]:bg-[#4ecdc4] [&::-moz-range-thumb]:rounded-full 
                 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none 
                 [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:bg-[#5fd9d0] 
                 [&::-moz-range-thumb]:hover:scale-110"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="flex justify-between items-center text-sm">
          <span class="text-[#ccc] font-medium">L₂ (Link 2)</span>
          <span class="text-[#4ecdc4] font-semibold font-mono">{{ L2.toFixed(0) }}px</span>
        </label>
        <input
          type="range"
          :value="L2"
          min="50"
          max="250"
          step="5"
          @input="emit('update:L2', Number(($event.target as HTMLInputElement).value))"
          class="w-full h-1.5 bg-[#333] rounded appearance-none outline-none cursor-pointer
                 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] 
                 [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-[#4ecdc4] 
                 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer 
                 [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-[#5fd9d0] 
                 [&::-webkit-slider-thumb]:hover:scale-110
                 [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] 
                 [&::-moz-range-thumb]:bg-[#4ecdc4] [&::-moz-range-thumb]:rounded-full 
                 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none 
                 [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:bg-[#5fd9d0] 
                 [&::-moz-range-thumb]:hover:scale-110"
        />
      </div>
    </div>

    <div class="flex flex-col gap-5">
      <h2 class="text-lg font-semibold m-0 mb-3 text-white">End Effector Position</h2>
      <div class="flex gap-6 p-4 bg-[#0a0a0a] rounded-lg border border-[#333]">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-[#888] uppercase tracking-wider">X:</span>
          <span class="text-xl font-semibold text-[#ffe66d] font-mono">{{
            endEffector.x.toFixed(2)
          }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-[#888] uppercase tracking-wider">Y:</span>
          <span class="text-xl font-semibold text-[#ffe66d] font-mono">{{
            endEffector.y.toFixed(2)
          }}</span>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <button
        v-if="!isMoving"
        @click="emit('start')"
        class="px-6 py-3 text-white border-none rounded-md text-sm font-semibold cursor-pointer 
               transition-all bg-[#4ecdc4] hover:bg-[#5fd9d0] active:scale-[0.98]"
      >
        Start Movement
      </button>
      <button
        v-else
        @click="emit('stop')"
        class="px-6 py-3 text-white border-none rounded-md text-sm font-semibold cursor-pointer 
               transition-all bg-[#ff6b6b] hover:bg-[#ff5252] active:scale-[0.98]"
      >
        Stop Movement
      </button>

      <button
        @click="emit('reset')"
        class="px-6 py-3 text-white rounded-md text-sm font-semibold cursor-pointer 
               transition-all bg-[#333] border border-[#555] hover:bg-[#444] 
               hover:border-[#666] active:scale-[0.98]"
      >
        Reset to Default
      </button>
    </div>
  </div>
</template>
