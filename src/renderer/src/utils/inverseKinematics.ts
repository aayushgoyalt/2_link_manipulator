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

export interface IKSolution {
  theta1: number  // First joint angle in degrees
  theta2: number  // Second joint angle in degrees
  isValid: boolean // Whether the target is reachable
  elbow: 'up' | 'down' // Elbow configuration
}

/**
 * Solve inverse kinematics for 2-link manipulator
 * 
 * @param targetX - Desired X coordinate
 * @param targetY - Desired Y coordinate
 * @param L1 - Length of first link
 * @param L2 - Length of second link
 * @param elbowUp - Elbow configuration (true = up, false = down)
 * @returns IK solution with joint angles
 */
export function solveIK(
  targetX: number,
  targetY: number,
  L1: number,
  L2: number,
  elbowUp: boolean = true
): IKSolution {
  // Calculate distance to target
  const distance = Math.sqrt(targetX * targetX + targetY * targetY)
  
  // Check if target is reachable
  // Target must be within workspace: |L1 - L2| <= distance <= L1 + L2
  const minReach = Math.abs(L1 - L2)
  const maxReach = L1 + L2
  
  if (distance > maxReach || distance < minReach || distance < 0.001) {
    return {
      theta1: 0,
      theta2: 0,
      isValid: false,
      elbow: elbowUp ? 'up' : 'down'
    }
  }
  
  // Calculate θ₂ using law of cosines
  // In triangle formed by L1, L2, and distance to target:
  // cos(θ₂) = (L₁² + L₂² - distance²) / (2·L₁·L₂)
  const cosTheta2 = (L1 * L1 + L2 * L2 - distance * distance) / (2 * L1 * L2)
  
  // Clamp to valid range to handle floating point errors
  const clampedCos = Math.max(-1, Math.min(1, cosTheta2))
  
  // Two solutions: elbow up (positive) or elbow down (negative)
  const theta2Rad = elbowUp 
    ? Math.acos(clampedCos)
    : -Math.acos(clampedCos)
  
  // Calculate θ₁ using geometry
  // θ₁ = atan2(y, x) - atan2(L₂·sin(θ₂), L₁ + L₂·cos(θ₂))
  const alpha = Math.atan2(targetY, targetX)
  const beta = Math.atan2(L2 * Math.sin(theta2Rad), L1 + L2 * Math.cos(theta2Rad))
  const theta1Rad = alpha - beta
  
  // Convert to degrees
  const theta1Deg = (theta1Rad * 180) / Math.PI
  const theta2Deg = (theta2Rad * 180) / Math.PI
  
  return {
    theta1: theta1Deg,
    theta2: theta2Deg,
    isValid: true,
    elbow: elbowUp ? 'up' : 'down'
  }
}

/**
 * Check if a target position is reachable
 */
export function isReachable(
  targetX: number,
  targetY: number,
  L1: number,
  L2: number
): boolean {
  const distance = Math.sqrt(targetX * targetX + targetY * targetY)
  const minReach = Math.abs(L1 - L2)
  const maxReach = L1 + L2
  return distance <= maxReach && distance >= minReach && distance > 0.001
}

/**
 * Verify IK solution by computing forward kinematics
 */
export function verifyIKSolution(
  theta1: number,
  theta2: number,
  L1: number,
  L2: number
): { x: number; y: number } {
  const t1 = (theta1 * Math.PI) / 180
  const t2 = (theta2 * Math.PI) / 180
  
  const x = L1 * Math.cos(t1) + L2 * Math.cos(t1 + t2)
  const y = L1 * Math.sin(t1) + L2 * Math.sin(t1 + t2)
  
  return { x, y }
}