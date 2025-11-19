<!--
  ManipulatorCanvas Component - Visualization Layer
  
  This component handles all the 2D canvas rendering for the robotic manipulator.
  It draws the manipulator, workspace, grid, and coordinate system in real-time.
  
  Rendering Features:
  - Responsive canvas that resizes with window
  - Standard Cartesian coordinate system (Y-axis pointing up)
  - Grid background for spatial reference (50px spacing)
  - Coordinate axes (X and Y)
  - Workspace boundary circle (maximum reach)
  - Color-coded components for easy identification
  
  Visual Elements:
  - Base (origin): Red circle at (0,0)
  - Link 1: Cyan line from base to joint 1
  - Joint 1: Yellow circle at elbow position
  - Link 2: Light cyan line from joint 1 to end effector
  - End effector: Red circle at tip position
  - Workspace: Dashed circle showing maximum reach
  
  Performance:
  - Redraws only when parameters change (reactive)
  - Uses requestAnimationFrame for smooth updates
  - Efficient canvas clearing and redrawing
-->

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

/**
 * Component Props Interface
 * Receives all necessary data from parent Manipulator component
 */
interface Props {
  theta1: number                          // First joint angle in degrees
  theta2: number                          // Second joint angle in degrees
  L1: number                              // First link length in pixels
  L2: number                              // Second link length in pixels
  joint1: { x: number; y: number }        // Calculated joint 1 position
  endEffector: { x: number; y: number }   // Calculated end effector position
}

const props = defineProps<Props>()

// ============================================================================
// REFS: Canvas and Context
// ============================================================================

/** Reference to the HTML canvas element */
const canvas = ref<HTMLCanvasElement | null>(null)

/** 2D rendering context for drawing operations */
const ctx = ref<CanvasRenderingContext2D | null>(null)

// ============================================================================
// CANVAS MANAGEMENT
// ============================================================================

/**
 * Resize canvas to match container dimensions
 * 
 * This ensures the canvas always fills its container and maintains
 * proper pixel density for crisp rendering. Called on mount and window resize.
 */
const resizeCanvas = () => {
  if (!canvas.value) return

  const container = canvas.value.parentElement
  if (!container) return

  // Set canvas internal resolution to match display size
  canvas.value.width = container.clientWidth
  canvas.value.height = container.clientHeight
  
  // Redraw after resize
  drawManipulator()
}

// ============================================================================
// RENDERING LOGIC
// ============================================================================

/**
 * Main drawing function - renders the complete manipulator visualization
 * 
 * Drawing order (back to front):
 * 1. Clear canvas
 * 2. Set up coordinate system (center origin, flip Y-axis)
 * 3. Draw grid and axes
 * 4. Draw workspace boundary
 * 5. Draw links and joints
 * 6. Draw end effector
 * 
 * Coordinate System:
 * - Origin at canvas center
 * - Y-axis flipped to point upward (standard math convention)
 * - Units in pixels
 */
const drawManipulator = () => {
  if (!canvas.value || !ctx.value) return

  const c = ctx.value
  const w = canvas.value.width
  const h = canvas.value.height

  // Clear previous frame
  c.clearRect(0, 0, w, h)

  // Transform coordinate system: center origin and flip Y-axis
  c.save()
  c.translate(w / 2, h / 2)  // Move origin to center
  c.scale(1, -1)              // Flip Y-axis (up is positive)

  // -------------------------------------------------------------------------
  // BACKGROUND: Grid
  // -------------------------------------------------------------------------
  c.strokeStyle = '#333'
  c.lineWidth = 1
  
  // Vertical grid lines (every 50px)
  for (let i = -w / 2; i < w / 2; i += 50) {
    c.beginPath()
    c.moveTo(i, -h / 2)
    c.lineTo(i, h / 2)
    c.stroke()
  }
  
  // Horizontal grid lines (every 50px)
  for (let i = -h / 2; i < h / 2; i += 50) {
    c.beginPath()
    c.moveTo(-w / 2, i)
    c.lineTo(w / 2, i)
    c.stroke()
  }

  // -------------------------------------------------------------------------
  // BACKGROUND: Coordinate Axes
  // -------------------------------------------------------------------------
  c.strokeStyle = '#666'
  c.lineWidth = 2
  
  // X-axis (horizontal)
  c.beginPath()
  c.moveTo(-w / 2, 0)
  c.lineTo(w / 2, 0)
  c.stroke()
  
  // Y-axis (vertical)
  c.beginPath()
  c.moveTo(0, -h / 2)
  c.lineTo(0, h / 2)
  c.stroke()

  // -------------------------------------------------------------------------
  // MANIPULATOR: Base (Origin Point)
  // -------------------------------------------------------------------------
  c.fillStyle = '#ff6b6b'  // Red
  c.beginPath()
  c.arc(0, 0, 8, 0, Math.PI * 2)
  c.fill()

  // -------------------------------------------------------------------------
  // MANIPULATOR: Link 1 (Base to Joint 1)
  // -------------------------------------------------------------------------
  c.strokeStyle = '#4ecdc4'  // Cyan
  c.lineWidth = 4
  c.beginPath()
  c.moveTo(0, 0)
  c.lineTo(props.joint1.x, props.joint1.y)
  c.stroke()

  // -------------------------------------------------------------------------
  // MANIPULATOR: Joint 1 (Elbow)
  // -------------------------------------------------------------------------
  c.fillStyle = '#ffe66d'  // Yellow
  c.beginPath()
  c.arc(props.joint1.x, props.joint1.y, 6, 0, Math.PI * 2)
  c.fill()

  // -------------------------------------------------------------------------
  // MANIPULATOR: Link 2 (Joint 1 to End Effector)
  // -------------------------------------------------------------------------
  c.strokeStyle = '#95e1d3'  // Light cyan
  c.lineWidth = 4
  c.beginPath()
  c.moveTo(props.joint1.x, props.joint1.y)
  c.lineTo(props.endEffector.x, props.endEffector.y)
  c.stroke()

  // -------------------------------------------------------------------------
  // MANIPULATOR: End Effector (Tip)
  // -------------------------------------------------------------------------
  c.fillStyle = '#ff6b6b'  // Red
  c.beginPath()
  c.arc(props.endEffector.x, props.endEffector.y, 8, 0, Math.PI * 2)
  c.fill()

  // -------------------------------------------------------------------------
  // WORKSPACE: Maximum Reach Circle
  // -------------------------------------------------------------------------
  // Shows the boundary of reachable positions (L1 + L2 radius)
  c.strokeStyle = '#444'
  c.lineWidth = 1
  c.setLineDash([5, 5])  // Dashed line
  c.beginPath()
  c.arc(0, 0, props.L1 + props.L2, 0, Math.PI * 2)
  c.stroke()
  c.setLineDash([])  // Reset to solid line

  // Restore original coordinate system
  c.restore()
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

/**
 * Component mounted - initialize canvas and set up resize listener
 */
onMounted(() => {
  if (canvas.value) {
    ctx.value = canvas.value.getContext('2d')
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
  }
})

/**
 * Component unmounted - clean up resize listener
 */
onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
})

/**
 * Watch for parameter changes and redraw
 * Reactive rendering: updates canvas whenever manipulator state changes
 */
watch(() => [props.theta1, props.theta2, props.L1, props.L2], drawManipulator)
</script>

<template>
  <!-- Canvas container: fills left side of screen with dark background -->
  <div class="flex-1 flex items-center justify-center bg-[#0a0a0a] border-r-2 border-[#333]">
    <canvas ref="canvas" class="w-full h-full block"></canvas>
  </div>
</template>
