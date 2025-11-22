/**
 * Inverse Kinematics Solver for 2-Link Manipulator
 * 
 * Given a target position (x, y), calculates the joint angles (θ₁, θ₂)
 * needed to reach that position.
 * 
 * Mathematical Approach:
 * Uses geometric method with law of cosines
 * 
 * Forward Kinematics (for reference):
 * x = L₁·cos(θ₁) + L₂·cos(θ₁ + θ₂)
 * y = L₁·sin(θ₁) + L₂·sin(θ₁ + θ₂)
 */

// inverseKinematics.ts
export interface IKSolution {
  theta1: number   // degrees, normalized to [-180, 180]
  theta2: number   // degrees, normalized to [-180, 180]
  isValid: boolean
  elbow: 'up' | 'down'
}

/** small epsilon for numerical stability */
const EPS = 1e-6

const degToRad = (d: number) => (d * Math.PI) / 180
const radToDeg = (r: number) => (r * 180) / Math.PI

/** Normalize angle in degrees to [-180, 180] */
export function normalizeAngleDeg(angle: number): number {
  let a = ((angle + 180) % 360 + 360) % 360 - 180
  // convert -0 to +0
  if (Math.abs(a) < EPS) return 0
  return a
}

/**
 * Solve inverse kinematics for 2-link manipulator
 *
 * @param targetX desired x (same units as L1/L2)
 * @param targetY desired y
 * @param L1 link 1 length (must be > 0)
 * @param L2 link 2 length (must be > 0)
 * @param elbowUp true => elbow-up solution, false => elbow-down
 */
export function solveIK(
  targetX: number,
  targetY: number,
  L1: number,
  L2: number,
  elbowUp: boolean = true
): IKSolution {
  if (L1 <= 0 || L2 <= 0) {
    throw new Error('L1 and L2 must be positive')
  }

  const distance = Math.hypot(targetX, targetY)

  const minReach = Math.abs(L1 - L2)
  const maxReach = L1 + L2

  // unreachable or ambiguous (very close to zero)
  if (distance > maxReach + EPS || distance < minReach - EPS || distance < EPS) {
    return {
      theta1: 0,
      theta2: 0,
      isValid: false,
      elbow: elbowUp ? 'up' : 'down'
    }
  }

  // Law of cosines gives us the angle BETWEEN the two links
  // But we need the relative angle for forward kinematics
  const cosAngleBetween = (L1 * L1 + L2 * L2 - distance * distance) / (2 * L1 * L2)
  const clampedCos = Math.max(-1, Math.min(1, cosAngleBetween))
  const angleBetween = Math.acos(clampedCos)
  
  // Convert to relative angle: theta2 = π - angleBetween for elbow up
  // theta2 = -(π - angleBetween) for elbow down
  const theta2Rad = elbowUp ? (Math.PI - angleBetween) : -(Math.PI - angleBetween)

  // geometry for theta1
  const alpha = Math.atan2(targetY, targetX) // angle to target
  const beta = Math.atan2(L2 * Math.sin(theta2Rad), L1 + L2 * Math.cos(theta2Rad))
  const theta1Rad = alpha - beta

  const theta1Deg = normalizeAngleDeg(radToDeg(theta1Rad))
  const theta2Deg = normalizeAngleDeg(radToDeg(theta2Rad))

  return {
    theta1: theta1Deg,
    theta2: theta2Deg,
    isValid: true,
    elbow: elbowUp ? 'up' : 'down'
  }
}

/** Reachability helper */
export function isReachable(
  targetX: number,
  targetY: number,
  L1: number,
  L2: number
): boolean {
  const d = Math.hypot(targetX, targetY)
  const minReach = Math.abs(L1 - L2)
  const maxReach = L1 + L2
  return d <= maxReach + EPS && d >= minReach - EPS && d > EPS
}

/** Verify by forward kinematics (angles in degrees) */
export function verifyIKSolution(
  theta1: number,
  theta2: number,
  L1: number,
  L2: number
): { x: number; y: number } {
  const t1 = degToRad(theta1)
  const t2 = degToRad(theta2)
  const x = L1 * Math.cos(t1) + L2 * Math.cos(t1 + t2)
  const y = L1 * Math.sin(t1) + L2 * Math.sin(t1 + t2)
  return { x, y }
}