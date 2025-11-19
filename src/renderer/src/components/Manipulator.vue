<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import ManipulatorCanvas from './ManipulatorCanvas.vue'
import ManipulatorControls from './ManipulatorControls.vue'

// Joint angles in degrees
const theta1 = ref(45)
const theta2 = ref(30)

// Link lengths
const L1 = ref(150)
const L2 = ref(100)

// Animation state
const isMoving = ref(false)
let animationId: number | null = null

// Computed end effector position
const endEffector = computed(() => {
  const t1 = (theta1.value * Math.PI) / 180
  const t2 = (theta2.value * Math.PI) / 180

  const x = L1.value * Math.cos(t1) + L2.value * Math.cos(t1 + t2)
  const y = L1.value * Math.sin(t1) + L2.value * Math.sin(t1 + t2)

  return { x, y }
})

// Joint 1 position
const joint1 = computed(() => {
  const t1 = (theta1.value * Math.PI) / 180
  return {
    x: L1.value * Math.cos(t1),
    y: L1.value * Math.sin(t1)
  }
})

const updateTheta1 = (value: number) => {
  theta1.value = value
}

const updateTheta2 = (value: number) => {
  theta2.value = value
}

const updateL1 = (value: number) => {
  L1.value = value
}

const updateL2 = (value: number) => {
  L2.value = value
}

const startMovement = () => {
  if (isMoving.value) return
  isMoving.value = true

  const animate = () => {
    theta1.value += 1
    theta2.value += 0.5

    if (theta1.value > 180) theta1.value = -180
    if (theta2.value > 180) theta2.value = -180

    animationId = requestAnimationFrame(animate)
  }

  animationId = requestAnimationFrame(animate)
}

const stopMovement = () => {
  isMoving.value = false
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

const reset = () => {
  stopMovement()
  theta1.value = 45
  theta2.value = 30
  L1.value = 150
  L2.value = 100
}

onUnmounted(() => {
  stopMovement()
})
</script>

<template>
  <div class="flex w-screen h-screen bg-[#1a1a1a] text-white">
    <ManipulatorCanvas
      :theta1="theta1"
      :theta2="theta2"
      :L1="L1"
      :L2="L2"
      :joint1="joint1"
      :endEffector="endEffector"
    />
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
