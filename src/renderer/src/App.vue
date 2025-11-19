<!--
  Root Application Component
  
  This is the top-level Vue component that serves as the entry point
  for the entire application UI. It simply renders the Manipulator component
  which contains all the application logic and UI.
  
  Architecture:
  - Uses Vue 3 Composition API with <script setup>
  - Single component architecture for simplicity
  - All state and logic contained in Manipulator component
-->

<script setup lang="ts">
import Manipulator from './components/Manipulator.vue'
</script>

<template>
  <Manipulator />
</template>
