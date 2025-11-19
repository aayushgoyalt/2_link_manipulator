<!--
  Manipulator Component - Main Application Logic
  
  This is the core component that manages the state and behavior of the 2-link
  robotic manipulator. It handles all the mathematical calculations for forward
  kinematics and coordinates between the canvas and controls.
  
  Robotic Manipulator Concepts:
  - A 2-link manipulator consists of two connected rigid links
  - Each link has a joint that can rotate (θ₁ and θ₂)
  - Forward kinematics calculates end effector position from joint angles
  - The workspace is the reachable area (circle with radius L₁ + L₂)
  
  State Management:
  - theta1, theta2: Joint angles in degrees (-180° to 180°)
  - L1, L2: Link lengths in pixels (50-250px)
  - isMoving: Animation state flag
  - animationId: RequestAnimationFrame ID for cleanup
  
  Mathematical Model:
  - Joint 1 position: (L₁·cos(θ₁), L₁·sin(θ₁))
  - End effector: (L₁·cos(θ₁) + L₂·cos(θ₁+θ₂), L₁·sin(θ₁) + L₂·sin(θ₁+θ₂))
-->

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import ManipulatorCanvas from './ManipulatorCanvas.vue'
import ManipulatorControls from './ManipulatorControls.vue'

// ============================================================================
// STATE: Joint Angles (in degrees)
// ============================================================================

/** First joint angle (base rotation) - default 45° */
const theta1 = ref(45)

/** Second joint angle (elbow rotation) - default 30° */
const theta2 = ref(30)

// ============================================================================
// STATE: Link Lengths (in pixels)
// ============================================================================

/** Length of first link from base to joint 1 - default 150px */
const L1 = ref(150)

/** Length of second link from joint 1 to end effector - default 100px */
const L2 = ref(100)

// ============================================================================
// STATE: Animation Control
// ============================================================================

/** Flag indicating if automatic animation is running */
const isMoving = ref(false)

/** RequestAnimationFrame ID for canceling animation */
let animationId: number | null = null

// ============================================================================
// COMPUTED: Forward Kinematics Calculations
// ============================================================================

/**
 * Calculate end effector position using forward kinematics
 * 
 * Formula:
 * x = L₁·cos(θ₁) + L₂·cos(θ₁ + θ₂)
 * y = L₁·sin(θ₁) + L₂·sin(θ₁ + θ₂)
 * 
 * @returns {Object} End effector coordinates {x, y}
 */
const endEffector = computed(() => {
  // Convert degrees to radians for trigonometric functions
  const t1 = (theta1.value * Math.PI) / 180
  const t2 = (theta2.value * Math.PI) / 180

  // Calculate position using forward kinematics equations
  const x = L1.value * Math.cos(t1) + L2.value * Math.cos(t1 + t2)
  const y = L1.value * Math.sin(t1) + L2.value * Math.sin(t1 + t2)

  return { x, y }
})

/**
 * Calculate joint 1 position (elbow position)
 * 
 * Formula:
 * x = L₁·cos(θ₁)
 * y = L₁·sin(θ₁)
 * 
 * @returns {Object} Joint 1 coordinates {x, y}
 */
const joint1 = computed(() => {
  const t1 = (theta1.value * Math.PI) / 180
  return {
    x: L1.value * Math.cos(t1),
    y: L1.value * Math.sin(t1)
  }
})

// ============================================================================
// EVENT HANDLERS: Parameter Updates
// ============================================================================

/** Update first joint angle from control input */
const updateTheta1 = (value: number) => {
  theta1.value = value
}

/** Update second joint angle from control input */
const updateTheta2 = (value: number) => {
  theta2.value = value
}

/** Update first link length from control input */
const updateL1 = (value: number) => {
  L1.value = value
}

/** Update second link length from control input */
const updateL2 = (value: number) => {
  L2.value = value
}

// ============================================================================
// ANIMATION CONTROL
// ============================================================================

/**
 * Start automatic animation of the manipulator
 * 
 * Animation behavior:
 * - θ₁ increments by 1° per frame
 * - θ₂ increments by 0.5° per frame
 * - Angles wrap around at ±180°
 * - Uses requestAnimationFrame for smooth 60fps animation
 */
const startMovement = () => {
  if (isMoving.value) return // Prevent multiple animations
  isMoving.value = true

  const animate = () => {
    // Increment angles at different rates for interesting motion
    theta1.value += 1
    theta2.value += 0.5

    // Wrap angles to stay within -180° to 180° range
    if (theta1.value > 180) theta1.value = -180
    if (theta2.value > 180) theta2.value = -180

    // Continue animation loop
    animationId = requestAnimationFrame(animate)
  }

  // Start the animation loop
  animationId = requestAnimationFrame(animate)
}

/**
 * Stop the automatic animation
 * Cancels the animation frame and resets state
 */
const stopMovement = () => {
  isMoving.value = false
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

/**
 * Reset all parameters to default values
 * Stops animation and restores initial configuration
 */
const reset = () => {
  stopMovement()
  theta1.value = 45
  theta2.value = 30
  L1.value = 150
  L2.value = 100
}

// ============================================================================
// LIFECYCLE: Cleanup
// ============================================================================

/**
 * Component cleanup - stop animation when component is destroyed
 * Prevents memory leaks from running animation frames
 */
onUnmounted(() => {
  stopMovement()
})
</script>

<template>
  <!-- Main container: full screen flex layout with dark theme -->
  <div class="flex w-screen h-screen bg-[#1a1a1a] text-white">
    <!-- Left side: Canvas visualization -->
    <ManipulatorCanvas
      :theta1="theta1"
      :theta2="theta2"
      :L1="L1"
      :L2="L2"
      :joint1="joint1"
      :endEffector="endEffector"
    />
    
    <!-- Right side: Control panel -->
    <ManipulatorControls
      :theta1="theta1"
      :theta2="theta2"
      :L1="L1"
      :L2="L2"
      :endEffector="endEffector"
      :isMoving="isMoving"
      @update:theta1="updateTheta1"
      @update:theta2="updateTheta2"
      @update:l1="updateL1"
      @update:l2="updateL2"
      @start="startMovement"
      @stop="stopMovement"
      @reset="reset"
    />
  </div>
</template>
