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
import { ref, computed, onUnmounted, watch } from 'vue'
import ManipulatorCanvas from './ManipulatorCanvas.vue'
import ManipulatorControls from './ManipulatorControls.vue'
import { solveIK } from '../utils/inverseKinematics'

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

/** Flag indicating if IK animation is running */
const isIKAnimating = ref(false)

/** RequestAnimationFrame ID for canceling animation */
let animationId: number | null = null

/** Trajectory tracking - stores end effector path history */
const trajectory = ref<Array<{ x: number; y: number }>>([])

/** Toggle trajectory visibility */
const showTrajectory = ref(true)

/** Target position for inverse kinematics */
const targetX = ref(100)
const targetY = ref(100)

/** Elbow configuration for IK (up or down) */
const elbowUp = ref(true)

/** Check if current target is reachable */
const isTargetReachable = computed(() => {
  const distance = Math.sqrt(targetX.value ** 2 + targetY.value ** 2)
  return distance <= L1.value + L2.value && distance >= Math.abs(L1.value - L2.value)
})

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

// ============================================================================
// TRAJECTORY TRACKING
// ============================================================================

/**
 * Track end effector position for trajectory visualization
 * Adds current position to trajectory array when moving or during IK animation
 */
watch(endEffector, (newPos) => {
  if ((isMoving.value || isIKAnimating.value) && showTrajectory.value) {
    trajectory.value.push({ x: newPos.x, y: newPos.y })
    // Limit trajectory length to prevent memory issues
    if (trajectory.value.length > 1000) {
      trajectory.value.shift()
    }
  }
})

/**
 * Clear trajectory path
 */
const clearTrajectory = () => {
  trajectory.value = []
}

/**
 * Toggle trajectory visibility
 */
const toggleTrajectory = () => {
  showTrajectory.value = !showTrajectory.value
  if (!showTrajectory.value) {
    clearTrajectory()
  }
}

// ============================================================================
// INVERSE KINEMATICS
// ============================================================================

/**
 * Apply inverse kinematics to reach target position
 * Calculates joint angles needed to reach (targetX, targetY)
 * Animates smoothly to the target with trajectory tracking
 */
const applyIK = () => {
  // console.log('=== Apply IK Button Clicked ===')
  // console.log('Current state:', {
  //   targetX: targetX.value,
  //   targetY: targetY.value,
  //   L1: L1.value,
  //   L2: L2.value,
  //   elbowUp: elbowUp.value,
  //   isReachable: isTargetReachable.value
  // })

  if (!isTargetReachable.value) {
    console.warn('❌ Target position is unreachable!')
    // const distance = Math.sqrt(targetX.value ** 2 + targetY.value ** 2)
    // console.log(`Distance: ${distance.toFixed(2)}, Max reach: ${L1.value + L2.value}`)
    return
  }

  // console.log('✓ Target is reachable, solving IK...')
  const solution = solveIK(targetX.value, targetY.value, L1.value, L2.value, elbowUp.value)

  if (solution.isValid) {
    // console.log('✓ IK Solution found:', solution)

    // Store starting angles
    const startTheta1 = theta1.value
    const startTheta2 = theta2.value
    const targetTheta1 = solution.theta1
    const targetTheta2 = solution.theta2

    // Verify the solution (for debugging)
    // const verification = verifyIKSolution(solution.theta1, solution.theta2, L1.value, L2.value)
    // const error = Math.sqrt(
    //   Math.pow(verification.x - targetX.value, 2) + Math.pow(verification.y - targetY.value, 2)
    // )

    // console.log('✓ IK Applied Successfully!')
    // console.log('Target:', { x: targetX.value, y: targetY.value })
    // console.log('Link lengths:', { L1: L1.value, L2: L2.value })
    // console.log('Solution angles:', {
    //   theta1: solution.theta1.toFixed(2),
    //   theta2: solution.theta2.toFixed(2),
    //   sum: (solution.theta1 + solution.theta2).toFixed(2)
    // })
    // console.log('Verification:', { x: verification.x.toFixed(2), y: verification.y.toFixed(2) })
    // console.log('Error:', error.toFixed(3), 'pixels')
    // console.log('Elbow config:', solution.elbow)
    
    // Manual verification
    // const t1_rad = solution.theta1 * Math.PI / 180
    // const t2_rad = solution.theta2 * Math.PI / 180
    // const manual_x = L1.value * Math.cos(t1_rad) + L2.value * Math.cos(t1_rad + t2_rad)
    // const manual_y = L1.value * Math.sin(t1_rad) + L2.value * Math.sin(t1_rad + t2_rad)
    // console.log('Manual FK check:', { x: manual_x.toFixed(2), y: manual_y.toFixed(2) })

    // Animate to target using same speed as regular animation
    // Regular animation: theta1 += 1°/frame, theta2 += 0.5°/frame at 60fps
    // Calculate angular distances
    const deltaTheta1 = targetTheta1 - startTheta1
    const deltaTheta2 = targetTheta2 - startTheta2
    
    // Use the larger angular change to determine speed
    // This ensures smooth motion at consistent speed
    const maxDelta = Math.max(Math.abs(deltaTheta1), Math.abs(deltaTheta2))
    
    // Speed: 1° per frame at 60fps = 60°/second
    const degreesPerFrame = 1.0
    const framesNeeded = Math.ceil(maxDelta / degreesPerFrame)
    
    // Calculate increments per frame to reach target in calculated frames
    const theta1Increment = deltaTheta1 / framesNeeded
    const theta2Increment = deltaTheta2 / framesNeeded
    
    let frameCount = 0
    
    // Clear any existing animation
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      isMoving.value = false
    }
    
    // Enable trajectory tracking during IK movement
    const wasShowingTrajectory = showTrajectory.value
    showTrajectory.value = true
    isIKAnimating.value = true

    const animate = () => {
      frameCount++
      
      if (frameCount < framesNeeded) {
        // Increment angles at constant speed
        theta1.value += theta1Increment
        theta2.value += theta2Increment
        
        animationId = requestAnimationFrame(animate)
      } else {
        // Ensure we end exactly at target
        theta1.value = targetTheta1
        theta2.value = targetTheta2
        animationId = null
        isIKAnimating.value = false
        
        // Restore trajectory setting
        if (!wasShowingTrajectory) {
          showTrajectory.value = false
        }
        
        // console.log('✓ Animation complete')
      }
    }

    animationId = requestAnimationFrame(animate)
  } else {
    console.error('❌ IK solver returned invalid solution')
  }
}

/**
 * Update target X coordinate
 */
const updateTargetX = (value: number) => {
  targetX.value = value
}

/**
 * Update target Y coordinate
 */
const updateTargetY = (value: number) => {
  targetY.value = value
}

/**
 * Toggle elbow configuration
 */
const toggleElbow = () => {
  elbowUp.value = !elbowUp.value
}

/**
 * Test IK with known values
 */
// const testIK = () => {
//   // console.log('=== Testing IK with known values ===')

//   // Test 1: Simple case - point straight ahead
//   // console.log('Test 1: Point at (200, 0)')
//   targetX.value = 200
//   targetY.value = 0
//   setTimeout(() => applyIK(), 100)

//   // Expected: theta1 ≈ 0°, theta2 ≈ 0° (or 180° depending on config)
// }

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
  <!-- Main container: full screen flex layout with dark theme, stacks vertically on mobile, horizontal on desktop -->
  <div class="flex flex-col md:flex-row w-screen h-screen bg-[#1a1a1a] text-white overflow-hidden">
    <!-- Top/Left side: Canvas visualization -->
    <ManipulatorCanvas
      :theta1="theta1"
      :theta2="theta2"
      :L1="L1"
      :L2="L2"
      :joint1="joint1"
      :end-effector="endEffector"
      :trajectory="trajectory"
      :show-trajectory="showTrajectory"
      :target-x="targetX"
      :target-y="targetY"
    />

    <!-- Bottom/Right side: Control panel -->
    <ManipulatorControls
      :theta1="theta1"
      :theta2="theta2"
      :L1="L1"
      :L2="L2"
      :end-effector="endEffector"
      :is-moving="isMoving"
      :target-x="targetX"
      :target-y="targetY"
      :elbow-up="elbowUp"
      :show-trajectory="showTrajectory"
      :is-target-reachable="isTargetReachable"
      @update:theta1="updateTheta1"
      @update:theta2="updateTheta2"
      @update:l1="updateL1"
      @update:l2="updateL2"
      @update:target-x="updateTargetX"
      @update:target-y="updateTargetY"
      @start="startMovement"
      @stop="stopMovement"
      @reset="reset"
      @apply-ik="applyIK"
      @toggle-elbow="toggleElbow"
      @toggle-trajectory="toggleTrajectory"
      @clear-trajectory="clearTrajectory"
    />
  </div>
</template>
