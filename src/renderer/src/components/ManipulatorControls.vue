<!--
  ManipulatorControls Component - User Interface Panel
  
  This component provides the control interface for adjusting manipulator parameters
  and controlling animation. It displays real-time values and allows user interaction
  through sliders and buttons.
  
  Control Sections:
  1. Joint Angles - Sliders for θ₁ and θ₂ (-180° to 180°)
  2. Link Lengths - Sliders for L₁ and L₂ (50px to 250px)
  3. End Effector Position - Read-only display of calculated X,Y coordinates
  4. Animation Controls - Start/Stop and Reset buttons
  
  UI Features:
  - Real-time value display with proper units (°, px)
  - Smooth range sliders with custom styling
  - Responsive button states (Start/Stop toggle)
  - Dark theme matching the canvas
  - Fixed width panel (400px) with scrolling for smaller screens
  
  Event Emission:
  - Emits update events for all parameter changes
  - Emits control events (start, stop, reset) for animation
-->

<script setup lang="ts">
/**
 * Component Props Interface
 * Receives current state from parent Manipulator component
 */
interface Props {
  theta1: number // Current first joint angle
  theta2: number // Current second joint angle
  L1: number // Current first link length
  L2: number // Current second link length
  endEffector: { x: number; y: number } // Current end effector position
  isMoving: boolean // Animation state flag
  targetX: number // IK target X coordinate
  targetY: number // IK target Y coordinate
  elbowUp: boolean // Elbow configuration
  showTrajectory: boolean // Trajectory visibility
  isTargetReachable: boolean // Whether target is reachable
}

defineProps<Props>()

/**
 * Event Emitters
 *
 * Update events: Emitted when user changes slider values
 * Control events: Emitted when user clicks control buttons
 */
const emit = defineEmits<{
  'update:theta1': [value: number] // User adjusted θ₁ slider
  'update:theta2': [value: number] // User adjusted θ₂ slider
  'update:L1': [value: number] // User adjusted L₁ slider
  'update:L2': [value: number] // User adjusted L₂ slider
  'update:targetX': [value: number] // User adjusted IK target X
  'update:targetY': [value: number] // User adjusted IK target Y
  start: [] // User clicked Start Movement
  stop: [] // User clicked Stop Movement
  reset: [] // User clicked Reset to Default
  'apply-ik': [] // User clicked Apply IK
  'toggle-elbow': [] // User toggled elbow configuration
  'toggle-trajectory': [] // User toggled trajectory visibility
  'clear-trajectory': [] // User clicked clear trajectory
}>()
</script>

<template>
  <div
    class="w-full md:w-[400px] bg-[#1a1a1a] p-3 md:p-8 overflow-y-auto flex flex-col gap-3 md:gap-8 max-h-[50vh] md:max-h-none"
  >
    <div class="border-b-2 border-[#333] pb-1.5 md:pb-4">
      <h1 class="text-lg md:text-[1.75rem] font-bold m-0 mb-0.5 md:mb-2 text-[#4ecdc4]">
        2-Link Manipulator
      </h1>
      <p class="m-0 text-[#888] text-[0.7rem] md:text-sm hidden md:block">
        Control joint angles and link lengths
      </p>
    </div>

    <div class="flex flex-col gap-2 md:gap-5">
      <h2 class="text-sm md:text-lg font-semibold m-0 mb-1 md:mb-3 text-white">Joint Angles</h2>

      <div class="flex flex-col gap-1.5 md:gap-2">
        <label class="flex justify-between items-center text-xs md:text-sm">
          <span class="text-[#ccc] font-medium">θ₁ (Joint 1)</span>
          <span class="text-[#4ecdc4] font-semibold font-mono">{{ theta1.toFixed(1) }}°</span>
        </label>
        <input
          type="range"
          :value="theta1"
          min="-180"
          max="180"
          step="1"
          class="w-full h-1.5 bg-[#333] rounded appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-[#4ecdc4] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-[#5fd9d0] [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:bg-[#4ecdc4] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:bg-[#5fd9d0] [&::-moz-range-thumb]:hover:scale-110"
          @input="emit('update:theta1', Number(($event.target as HTMLInputElement).value))"
        />
      </div>

      <div class="flex flex-col gap-1.5 md:gap-2">
        <label class="flex justify-between items-center text-xs md:text-sm">
          <span class="text-[#ccc] font-medium">θ₂ (Joint 2)</span>
          <span class="text-[#4ecdc4] font-semibold font-mono">{{ theta2.toFixed(1) }}°</span>
        </label>
        <input
          type="range"
          :value="theta2"
          min="-180"
          max="180"
          step="1"
          class="w-full h-1.5 bg-[#333] rounded appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-[#4ecdc4] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-[#5fd9d0] [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:bg-[#4ecdc4] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:bg-[#5fd9d0] [&::-moz-range-thumb]:hover:scale-110"
          @input="emit('update:theta2', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </div>

    <div class="flex flex-col gap-2 md:gap-5">
      <h2 class="text-sm md:text-lg font-semibold m-0 mb-1 md:mb-3 text-white">Link Lengths</h2>

      <div class="flex flex-col gap-1.5 md:gap-2">
        <label class="flex justify-between items-center text-xs md:text-sm">
          <span class="text-[#ccc] font-medium">L₁ (Link 1)</span>
          <span class="text-[#4ecdc4] font-semibold font-mono">{{ L1.toFixed(0) }}px</span>
        </label>
        <input
          type="range"
          :value="L1"
          min="50"
          max="250"
          step="5"
          class="w-full h-1.5 bg-[#333] rounded appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-[#4ecdc4] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-[#5fd9d0] [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:bg-[#4ecdc4] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:bg-[#5fd9d0] [&::-moz-range-thumb]:hover:scale-110"
          @input="emit('update:L1', Number(($event.target as HTMLInputElement).value))"
        />
      </div>

      <div class="flex flex-col gap-1.5 md:gap-2">
        <label class="flex justify-between items-center text-xs md:text-sm">
          <span class="text-[#ccc] font-medium">L₂ (Link 2)</span>
          <span class="text-[#4ecdc4] font-semibold font-mono">{{ L2.toFixed(0) }}px</span>
        </label>
        <input
          type="range"
          :value="L2"
          min="50"
          max="250"
          step="5"
          class="w-full h-1.5 bg-[#333] rounded appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-[#4ecdc4] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-[#5fd9d0] [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:bg-[#4ecdc4] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:bg-[#5fd9d0] [&::-moz-range-thumb]:hover:scale-110"
          @input="emit('update:L2', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </div>

    <div class="flex flex-col gap-2 md:gap-5">
      <h2 class="text-sm md:text-lg font-semibold m-0 mb-1 md:mb-3 text-white">End Effector</h2>
      <div class="flex gap-3 md:gap-6 p-2 md:p-4 bg-[#0a0a0a] rounded-lg border border-[#333]">
        <div class="flex flex-col gap-0.5 md:gap-1">
          <span class="text-[0.6rem] md:text-xs text-[#888] uppercase tracking-wider">X:</span>
          <span class="text-base md:text-xl font-semibold text-[#ffe66d] font-mono">{{
            endEffector.x.toFixed(1)
          }}</span>
        </div>
        <div class="flex flex-col gap-0.5 md:gap-1">
          <span class="text-[0.6rem] md:text-xs text-[#888] uppercase tracking-wider">Y:</span>
          <span class="text-base md:text-xl font-semibold text-[#ffe66d] font-mono">{{
            endEffector.y.toFixed(1)
          }}</span>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-1.5 md:gap-3">
      <button
        v-if="!isMoving"
        class="px-3 md:px-6 py-2 md:py-3 text-white border-none rounded-md text-xs md:text-sm font-semibold cursor-pointer transition-all bg-[#4ecdc4] hover:bg-[#5fd9d0] active:scale-[0.98]"
        @click="emit('start')"
      >
        Start Movement
      </button>
      <button
        v-else
        class="px-3 md:px-6 py-2 md:py-3 text-white border-none rounded-md text-xs md:text-sm font-semibold cursor-pointer transition-all bg-[#ff6b6b] hover:bg-[#ff5252] active:scale-[0.98]"
        @click="emit('stop')"
      >
        Stop Movement
      </button>

      <button
        class="px-3 md:px-6 py-2 md:py-3 text-white rounded-md text-xs md:text-sm font-semibold cursor-pointer transition-all bg-[#333] border border-[#555] hover:bg-[#444] hover:border-[#666] active:scale-[0.98]"
        @click="emit('reset')"
      >
        Reset
      </button>
    </div>

    <div class="flex flex-col gap-2 md:gap-5">
      <h2 class="text-sm md:text-lg font-semibold m-0 mb-1 md:mb-3 text-white">
        Inverse Kinematics
      </h2>

      <div class="flex flex-col gap-1.5 md:gap-2">
        <label class="flex justify-between items-center text-xs md:text-sm">
          <span class="text-[#ccc] font-medium">Target X</span>
          <span class="text-[#4ecdc4] font-semibold font-mono">{{ targetX.toFixed(0) }}</span>
        </label>
        <input
          type="range"
          :value="targetX"
          min="-300"
          max="300"
          step="5"
          class="w-full h-1.5 bg-[#333] rounded appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-[#ffe66d] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-[#ffd700] [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:bg-[#ffe66d] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:bg-[#ffd700] [&::-moz-range-thumb]:hover:scale-110"
          @input="emit('update:targetX', Number(($event.target as HTMLInputElement).value))"
        />
      </div>

      <div class="flex flex-col gap-1.5 md:gap-2">
        <label class="flex justify-between items-center text-xs md:text-sm">
          <span class="text-[#ccc] font-medium">Target Y</span>
          <span class="text-[#4ecdc4] font-semibold font-mono">{{ targetY.toFixed(0) }}</span>
        </label>
        <input
          type="range"
          :value="targetY"
          min="-300"
          max="300"
          step="5"
          class="w-full h-1.5 bg-[#333] rounded appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-[#ffe66d] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-[#ffd700] [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:bg-[#ffe66d] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:bg-[#ffd700] [&::-moz-range-thumb]:hover:scale-110"
          @input="emit('update:targetY', Number(($event.target as HTMLInputElement).value))"
        />
      </div>

      <div class="flex gap-2">
        <button
          class="flex-1 px-2 md:px-4 py-1.5 md:py-2 text-white border-none rounded-md text-xs md:text-sm font-semibold cursor-pointer transition-all"
          :class="elbowUp ? 'bg-[#ffe66d] text-[#1a1a1a]' : 'bg-[#333] border border-[#555]'"
          @click="emit('toggle-elbow')"
        >
          {{ elbowUp ? 'Elbow Up' : 'Elbow Down' }}
        </button>
        <button
          class="flex-1 px-2 md:px-4 py-1.5 md:py-2 text-white border-none rounded-md text-xs md:text-sm font-semibold cursor-pointer transition-all active:scale-[0.98]"
          :class="isTargetReachable 
            ? 'bg-[#ffe66d] text-[#1a1a1a] hover:bg-[#ffd700]' 
            : 'bg-[#ff6b6b] hover:bg-[#ff5252]'"
          @click="emit('apply-ik')"
        >
          {{ isTargetReachable ? 'Apply IK' : 'Unreachable' }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1.5 md:gap-3">
      <h2 class="text-sm md:text-lg font-semibold m-0 mb-1 md:mb-3 text-white">Trajectory</h2>
      <div class="flex gap-2">
        <button
          class="flex-1 px-2 md:px-4 py-1.5 md:py-2 text-white border-none rounded-md text-xs md:text-sm font-semibold cursor-pointer transition-all"
          :class="showTrajectory ? 'bg-[#4ecdc4]' : 'bg-[#333] border border-[#555]'"
          @click="emit('toggle-trajectory')"
        >
          {{ showTrajectory ? 'Hide' : 'Show' }}
        </button>
        <button
          class="flex-1 px-2 md:px-4 py-1.5 md:py-2 text-white rounded-md text-xs md:text-sm font-semibold cursor-pointer transition-all bg-[#333] border border-[#555] hover:bg-[#444] active:scale-[0.98]"
          @click="emit('clear-trajectory')"
        >
          Clear
        </button>
      </div>
    </div>
  </div>
</template>
