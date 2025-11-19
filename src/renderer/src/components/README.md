# Components Directory

## Purpose
This directory contains all Vue 3 components for the 2-link manipulator application.

## Component Architecture

```
Manipulator.vue (Parent - State Management)
  ├── ManipulatorCanvas.vue (Child - Visualization)
  └── ManipulatorControls.vue (Child - UI Controls)
```

## Components

### Manipulator.vue
**Main application component - State management and business logic**

#### Responsibilities
- Manages all application state (angles, lengths, animation)
- Performs forward kinematics calculations
- Coordinates between canvas and controls
- Handles animation loop
- Provides reset functionality

#### State
```typescript
theta1: Ref<number>      // Joint 1 angle: -180° to 180°
theta2: Ref<number>      // Joint 2 angle: -180° to 180°
L1: Ref<number>          // Link 1 length: 50px to 250px
L2: Ref<number>          // Link 2 length: 50px to 250px
isMoving: Ref<boolean>   // Animation state flag
animationId: number      // RequestAnimationFrame ID
```

#### Computed Properties
```typescript
joint1: { x: number, y: number }        // Elbow position
endEffector: { x: number, y: number }   // Tip position
```

#### Methods
```typescript
updateTheta1(value: number): void    // Update joint 1 angle
updateTheta2(value: number): void    // Update joint 2 angle
updateL1(value: number): void        // Update link 1 length
updateL2(value: number): void        // Update link 2 length
startMovement(): void                // Start animation
stopMovement(): void                 // Stop animation
reset(): void                        // Reset to defaults
```

#### Forward Kinematics
Calculates positions using trigonometry:
```
Joint 1: (L₁·cos(θ₁), L₁·sin(θ₁))
End Effector: (L₁·cos(θ₁) + L₂·cos(θ₁+θ₂), L₁·sin(θ₁) + L₂·sin(θ₁+θ₂))
```

#### Animation
- Uses `requestAnimationFrame` for smooth 60fps
- Increments θ₁ by 1°/frame, θ₂ by 0.5°/frame
- Wraps angles at ±180°
- Properly cleans up on component unmount

---

### ManipulatorCanvas.vue
**Canvas rendering component - Visualization layer**

#### Responsibilities
- Renders 2D visualization using HTML5 Canvas
- Draws grid, axes, manipulator, and workspace
- Handles canvas resizing
- Transforms coordinate system (center origin, flip Y-axis)
- Redraws on parameter changes

#### Props
```typescript
interface Props {
  theta1: number                          // Joint 1 angle
  theta2: number                          // Joint 2 angle
  L1: number                              // Link 1 length
  L2: number                              // Link 2 length
  joint1: { x: number; y: number }        // Joint 1 position
  endEffector: { x: number; y: number }   // End effector position
}
```

#### Rendering Elements

**Background**:
- Grid: 50px spacing, dark gray (#333)
- X-axis: Horizontal line, medium gray (#666)
- Y-axis: Vertical line, medium gray (#666)

**Manipulator**:
- Base: Red circle (#ff6b6b) at origin
- Link 1: Cyan line (#4ecdc4) from base to joint 1
- Joint 1: Yellow circle (#ffe66d) at elbow
- Link 2: Light cyan line (#95e1d3) from joint 1 to end effector
- End Effector: Red circle (#ff6b6b) at tip

**Workspace**:
- Dashed circle (#444) showing maximum reach (L₁ + L₂)

#### Coordinate System
```typescript
// Transform to mathematical coordinates
ctx.translate(width/2, height/2)  // Center origin
ctx.scale(1, -1)                  // Y-axis points up
```

#### Methods
```typescript
resizeCanvas(): void      // Resize to container dimensions
drawManipulator(): void   // Main rendering function
```

#### Reactivity
Watches props and redraws automatically:
```typescript
watch(() => [props.theta1, props.theta2, props.L1, props.L2], drawManipulator)
```

---

### ManipulatorControls.vue
**Control panel component - User interface**

#### Responsibilities
- Provides interactive controls for all parameters
- Displays real-time values
- Emits events for state changes
- Shows end effector position
- Provides animation controls

#### Props
```typescript
interface Props {
  theta1: number                          // Current joint 1 angle
  theta2: number                          // Current joint 2 angle
  L1: number                              // Current link 1 length
  L2: number                              // Current link 2 length
  endEffector: { x: number; y: number }   // Current end effector position
  isMoving: boolean                       // Animation state
}
```

#### Events
```typescript
'update:theta1': [value: number]   // Joint 1 angle changed
'update:theta2': [value: number]   // Joint 2 angle changed
'update:L1': [value: number]       // Link 1 length changed
'update:L2': [value: number]       // Link 2 length changed
'start': []                        // Start animation clicked
'stop': []                         // Stop animation clicked
'reset': []                        // Reset clicked
```

#### UI Sections

**1. Joint Angles**
- θ₁ slider: -180° to 180°, step 1°
- θ₂ slider: -180° to 180°, step 1°
- Real-time value display with ° symbol

**2. Link Lengths**
- L₁ slider: 50px to 250px, step 5px
- L₂ slider: 50px to 250px, step 5px
- Real-time value display with px unit

**3. End Effector Position**
- Read-only X coordinate (2 decimal places)
- Read-only Y coordinate (2 decimal places)
- Highlighted display box

**4. Animation Controls**
- Start Movement button (cyan, shown when stopped)
- Stop Movement button (red, shown when moving)
- Reset to Default button (gray, always available)

#### Styling
- Fixed width: 400px
- Scrollable for smaller screens
- Dark theme matching canvas
- Custom styled range sliders
- Hover effects on interactive elements

---

## Data Flow

### Parent to Children (Props)
```
Manipulator (state)
  ├─→ ManipulatorCanvas (theta1, theta2, L1, L2, joint1, endEffector)
  └─→ ManipulatorControls (theta1, theta2, L1, L2, endEffector, isMoving)
```

### Children to Parent (Events)
```
ManipulatorControls (user input)
  └─→ emit('update:*') → Manipulator (updates state)
        └─→ computed properties recalculate
              └─→ props update → children re-render
```

### Reactive Update Cycle
1. User adjusts slider in Controls
2. Controls emits `update:theta1` event
3. Manipulator updates `theta1.value`
4. Computed properties (`joint1`, `endEffector`) recalculate
5. Props update in both Canvas and Controls
6. Canvas redraws (via watch)
7. Controls updates displayed value

---

## Component Communication

### Props Down
```vue
<!-- Manipulator.vue -->
<ManipulatorCanvas
  :theta1="theta1"
  :theta2="theta2"
  :L1="L1"
  :L2="L2"
  :joint1="joint1"
  :endEffector="endEffector"
/>
```

### Events Up
```vue
<!-- ManipulatorControls.vue -->
<input
  type="range"
  :value="theta1"
  @input="emit('update:theta1', Number($event.target.value))"
/>
```

### No Sibling Communication
- Canvas and Controls don't communicate directly
- All communication goes through parent (Manipulator)
- Maintains unidirectional data flow

---

## Styling Patterns

### Tailwind Utilities
All components use inline Tailwind classes:
```vue
<div class="flex w-screen h-screen bg-[#1a1a1a] text-white">
  <!-- Content -->
</div>
```

### Custom Colors
Consistent dark theme:
- Backgrounds: `#1a1a1a`, `#0a0a0a`
- Borders: `#333`, `#555`
- Text: `#ffffff`, `#ccc`, `#888`
- Accents: `#4ecdc4` (cyan), `#ffe66d` (yellow), `#ff6b6b` (red)

### Responsive Design
- Canvas: Fills available space (flex-1)
- Controls: Fixed 400px width
- Scrollable controls on small screens

---

## Performance Considerations

### Canvas Rendering
- Only redraws when parameters change (reactive)
- Uses `requestAnimationFrame` for animation
- Efficient coordinate transformations
- Clears canvas before each frame

### Vue Reactivity
- Computed properties cached until dependencies change
- Minimal watchers (only for canvas redraw)
- Refs for primitive values (better performance)

### Event Handling
- Direct event emission (no event bus)
- Type-safe events with TypeScript
- No unnecessary re-renders

---

## Testing Strategies

### Unit Tests
```typescript
// Test forward kinematics
describe('Manipulator forward kinematics', () => {
  it('calculates joint1 position correctly', () => {
    const wrapper = mount(Manipulator)
    wrapper.vm.theta1 = 0
    wrapper.vm.L1 = 100
    expect(wrapper.vm.joint1.x).toBe(100)
    expect(wrapper.vm.joint1.y).toBe(0)
  })
})
```

### Component Tests
```typescript
// Test event emission
describe('ManipulatorControls', () => {
  it('emits update event on slider change', async () => {
    const wrapper = mount(ManipulatorControls, {
      props: { theta1: 45, /* ... */ }
    })
    await wrapper.find('input[type="range"]').setValue(90)
    expect(wrapper.emitted('update:theta1')).toBeTruthy()
  })
})
```

### Integration Tests
```typescript
// Test full component interaction
describe('Manipulator integration', () => {
  it('updates canvas when controls change', async () => {
    const wrapper = mount(Manipulator)
    const controls = wrapper.findComponent(ManipulatorControls)
    await controls.vm.$emit('update:theta1', 90)
    expect(wrapper.vm.theta1).toBe(90)
  })
})
```

---

## Common Modifications

### Adding a New Parameter
1. Add state in Manipulator.vue:
```typescript
const newParam = ref(defaultValue)
```

2. Add computed property if needed:
```typescript
const derivedValue = computed(() => /* calculation */)
```

3. Add update method:
```typescript
const updateNewParam = (value: number) => {
  newParam.value = value
}
```

4. Pass to children as props
5. Add control in ManipulatorControls.vue
6. Update canvas rendering if needed

### Changing Animation Behavior
Modify `startMovement()` in Manipulator.vue:
```typescript
const animate = () => {
  // Custom animation logic
  theta1.value += customIncrement
  theta2.value += customIncrement
  
  // Custom wrapping or bounds
  if (theta1.value > max) theta1.value = min
  
  animationId = requestAnimationFrame(animate)
}
```

### Adding Canvas Elements
In ManipulatorCanvas.vue `drawManipulator()`:
```typescript
// Add new drawing code
c.strokeStyle = '#color'
c.lineWidth = 2
c.beginPath()
c.moveTo(x1, y1)
c.lineTo(x2, y2)
c.stroke()
```

### Customizing Controls
In ManipulatorControls.vue template:
```vue
<!-- Add new control section -->
<div class="flex flex-col gap-5">
  <h2 class="text-lg font-semibold">New Section</h2>
  <!-- Controls here -->
</div>
```

---

## Best Practices

### Component Design
- Keep components focused (single responsibility)
- Use TypeScript for type safety
- Define clear prop interfaces
- Document complex logic with comments
- Use meaningful variable names

### State Management
- Keep state in parent component
- Use computed for derived values
- Emit events for state changes
- Avoid prop mutation

### Performance
- Use computed properties for calculations
- Minimize watchers
- Debounce rapid updates if needed
- Clean up resources in `onUnmounted`

### Styling
- Use Tailwind utilities consistently
- Maintain color scheme
- Keep responsive design in mind
- Test on different screen sizes

---

## Debugging Tips

### Vue DevTools
- Inspect component hierarchy
- View reactive state
- Track emitted events
- Monitor performance

### Console Logging
```typescript
// Add temporary logging
watch(() => theta1.value, (val) => {
  console.log('Theta1 changed:', val)
})
```

### Canvas Debugging
```typescript
// Draw debug information
const drawDebug = () => {
  ctx.fillStyle = 'white'
  ctx.fillText(`θ₁: ${theta1.value}°`, 10, 20)
  ctx.fillText(`θ₂: ${theta2.value}°`, 10, 40)
}
```

---

## Resources

- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [TypeScript with Vue](https://vuejs.org/guide/typescript/overview.html)
- [Canvas API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
