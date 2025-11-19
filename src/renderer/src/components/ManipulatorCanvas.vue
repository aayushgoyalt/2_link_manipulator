<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  theta1: number
  theta2: number
  L1: number
  L2: number
  joint1: { x: number; y: number }
  endEffector: { x: number; y: number }
}

const props = defineProps<Props>()

const canvas = ref<HTMLCanvasElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)

const resizeCanvas = () => {
  if (!canvas.value) return

  const container = canvas.value.parentElement
  if (!container) return

  canvas.value.width = container.clientWidth
  canvas.value.height = container.clientHeight
  drawManipulator()
}

const drawManipulator = () => {
  if (!canvas.value || !ctx.value) return

  const c = ctx.value
  const w = canvas.value.width
  const h = canvas.value.height

  // Clear canvas
  c.clearRect(0, 0, w, h)

  // Set origin to center
  c.save()
  c.translate(w / 2, h / 2)
  c.scale(1, -1) // Flip Y axis for standard coordinate system

  // Draw grid
  c.strokeStyle = '#333'
  c.lineWidth = 1
  for (let i = -w / 2; i < w / 2; i += 50) {
    c.beginPath()
    c.moveTo(i, -h / 2)
    c.lineTo(i, h / 2)
    c.stroke()
  }
  for (let i = -h / 2; i < h / 2; i += 50) {
    c.beginPath()
    c.moveTo(-w / 2, i)
    c.lineTo(w / 2, i)
    c.stroke()
  }

  // Draw axes
  c.strokeStyle = '#666'
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(-w / 2, 0)
  c.lineTo(w / 2, 0)
  c.stroke()
  c.beginPath()
  c.moveTo(0, -h / 2)
  c.lineTo(0, h / 2)
  c.stroke()

  // Draw base (origin)
  c.fillStyle = '#ff6b6b'
  c.beginPath()
  c.arc(0, 0, 8, 0, Math.PI * 2)
  c.fill()

  // Draw link 1
  c.strokeStyle = '#4ecdc4'
  c.lineWidth = 4
  c.beginPath()
  c.moveTo(0, 0)
  c.lineTo(props.joint1.x, props.joint1.y)
  c.stroke()

  // Draw joint 1
  c.fillStyle = '#ffe66d'
  c.beginPath()
  c.arc(props.joint1.x, props.joint1.y, 6, 0, Math.PI * 2)
  c.fill()

  // Draw link 2
  c.strokeStyle = '#95e1d3'
  c.lineWidth = 4
  c.beginPath()
  c.moveTo(props.joint1.x, props.joint1.y)
  c.lineTo(props.endEffector.x, props.endEffector.y)
  c.stroke()

  // Draw end effector
  c.fillStyle = '#ff6b6b'
  c.beginPath()
  c.arc(props.endEffector.x, props.endEffector.y, 8, 0, Math.PI * 2)
  c.fill()

  // Draw workspace circle (approximate)
  c.strokeStyle = '#444'
  c.lineWidth = 1
  c.setLineDash([5, 5])
  c.beginPath()
  c.arc(0, 0, props.L1 + props.L2, 0, Math.PI * 2)
  c.stroke()
  c.setLineDash([])

  c.restore()
}

onMounted(() => {
  if (canvas.value) {
    ctx.value = canvas.value.getContext('2d')
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
})

watch(() => [props.theta1, props.theta2, props.L1, props.L2], drawManipulator)
</script>

<template>
  <div class="flex-1 flex items-center justify-center bg-[#0a0a0a] border-r-2 border-[#333]">
    <canvas ref="canvas" class="w-full h-full block"></canvas>
  </div>
</template>
