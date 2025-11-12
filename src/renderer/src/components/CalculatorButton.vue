<script setup lang="ts">
/**
 * Calculator Button Component
 * Reusable button component for calculator operations and numbers
 */

interface Props {
  label: string;
  variant?: 'number' | 'operation' | 'function' | 'equals' | 'clear';
}

interface Emits {
  (e: 'click'): void;
}

withDefaults(defineProps<Props>(), {
  variant: 'number'
});

const emit = defineEmits<Emits>();

/**
 * Get button styling based on variant type
 */
const buttonClasses = (variant: string) => {
  const baseClasses = 'text-xl font-medium rounded-lg transition-all duration-150 active:scale-95 hover:opacity-90';
  
  const variantClasses = {
    number: 'bg-gray-700 text-white hover:bg-gray-600',
    operation: 'bg-orange-500 text-white hover:bg-orange-600',
    function: 'bg-gray-500 text-white hover:bg-gray-400',
    equals: 'bg-green-500 text-white hover:bg-green-600',
    clear: 'bg-red-500 text-white hover:bg-red-600'
  };
  
  return `${baseClasses} ${variantClasses[variant] || variantClasses.number}`;
};

const handleClick = () => {
  emit('click');
};
</script>

<template>
  <button
    :class="buttonClasses(variant)"
    @click="handleClick"
    class="w-full py-3 text-lg font-medium rounded-md transition-all duration-150 active:scale-95 hover:opacity-90 flex items-center justify-center select-none"
  >
    {{ label }}
  </button>
</template>
