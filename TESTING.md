# Testing the 2-Link Manipulator

## How to Run and Test

### 1. Start the Development Server

```bash
npm run dev
```

This will open the Electron app automatically.

### 2. Open Browser Console

Press **F12** or **Cmd+Option+I** (Mac) to open Developer Tools and see the console logs.

## Testing Inverse Kinematics

### Test 1: Simple Reachable Target

1. **Set Target Position:**
   - Target X: `150` (use slider)
   - Target Y: `100` (use slider)

2. **Check Indicator:**
   - The crosshair on canvas should be **yellow** (reachable)
   - Button should say "Apply IK" in yellow

3. **Click "Apply IK"**
   - Watch the console for debug output
   - The manipulator should move to reach the target
   - Console will show:
     - Target position
     - Calculated angles (theta1, theta2)
     - Verification (forward kinematics check)
     - Error (should be < 0.1 pixels)

### Test 2: Unreachable Target

1. **Set Target Position:**
   - Target X: `300` (beyond reach)
   - Target Y: `300`

2. **Check Indicator:**
   - The crosshair should be **red** (unreachable)
   - Button should say "Unreachable" in red
   - Max reach with default links (L1=150, L2=100) is 250 pixels

3. **Click Button:**
   - Console will show why it's unreachable
   - Manipulator won't move

### Test 3: Elbow Configuration

1. **Set a reachable target:**
   - Target X: `150`
   - Target Y: `50`

2. **Try "Elbow Up":**
   - Click "Apply IK"
   - Note the joint angles

3. **Toggle to "Elbow Down":**
   - Click the "Elbow Up/Down" button
   - Click "Apply IK" again
   - The manipulator reaches the same point but with different joint configuration

### Test 4: Edge Cases

**At Maximum Reach:**
- Target X: `250`, Target Y: `0`
- Should work (fully extended)

**At Minimum Reach:**
- Target X: `50`, Target Y: `0`
- Should work (folded back)

**At Origin:**
- Target X: `0`, Target Y: `0`
- Should handle gracefully

## Testing Trajectory Tracking

1. **Enable Trajectory:**
   - Make sure "Show" button is active (cyan color)

2. **Start Movement:**
   - Click "Start Movement"
   - Watch the red trail appear behind the end effector

3. **Clear Trajectory:**
   - Click "Clear" button to reset the trail

4. **Hide Trajectory:**
   - Click "Show/Hide" toggle to turn off tracking

## Expected Console Output

When you click "Apply IK", you should see:

```
=== Apply IK Button Clicked ===
Current state: {
  targetX: 150,
  targetY: 100,
  L1: 150,
  L2: 100,
  elbowUp: true,
  isReachable: true
}
✓ Target is reachable, solving IK...
✓ IK Solution found: {
  theta1: 28.96,
  theta2: 53.13,
  isValid: true,
  elbow: "up"
}
✓ IK Applied Successfully!
Target: { x: 150, y: 100 }
Solution angles: { theta1: "28.96", theta2: "53.13" }
Verification: { x: "150.00", y: "100.00" }
Error: 0.000 pixels
Elbow config: up
```

## Visual Indicators

### On Canvas:
- **Yellow crosshair** = Target is reachable
- **Red crosshair** = Target is unreachable
- **Red trail** = Trajectory path (when enabled)
- **Dashed circle** = Maximum workspace boundary

### In Controls:
- **Yellow "Apply IK" button** = Ready to apply
- **Red "Unreachable" button** = Target out of reach
- **Cyan "Show" button** = Trajectory is visible
- **Gray "Show" button** = Trajectory is hidden

## Troubleshooting

### IK Not Working?

1. **Check Console:**
   - Look for error messages
   - Verify button click is registered

2. **Check Target Position:**
   - Is it within reach? (distance ≤ L1 + L2)
   - Default max reach: 250 pixels

3. **Try Known Good Values:**
   - Target X: `100`, Target Y: `100`
   - Should always work with defaults

### No Console Output?

1. Make sure Developer Tools are open (F12)
2. Check the Console tab (not Elements or Network)
3. Try clicking the button again

### Manipulator Not Moving?

1. Check if angles are actually changing in the display
2. Verify theta1 and theta2 values update
3. Try manual angle adjustment to confirm controls work

## Mathematical Verification

The IK solver uses:

**Law of Cosines for θ₂:**
```
cos(θ₂) = (L₁² + L₂² - d²) / (2·L₁·L₂)
```

**Geometric method for θ₁:**
```
θ₁ = atan2(y, x) - atan2(L₂·sin(θ₂), L₁ + L₂·cos(θ₂))
```

Where `d = √(x² + y²)` is the distance to target.

The verification step computes forward kinematics and should show error < 0.1 pixels.

## Quick Test Commands

Open browser console and try:

```javascript
// Check current state
console.log('Target:', window.targetX, window.targetY)
console.log('Links:', window.L1, window.L2)

// Manual IK test (if exposed)
// This would require exposing functions to window for testing
```

## Success Criteria

✅ IK is working correctly if:
1. Console shows "✓ IK Applied Successfully!"
2. Verification error is < 0.1 pixels
3. Manipulator visually reaches the target
4. Both elbow configurations work
5. Unreachable targets are properly rejected

## Need Help?

If IK still isn't working:
1. Share the console output
2. Note the target position you're trying
3. Check if it's a reachability issue (red crosshair)
