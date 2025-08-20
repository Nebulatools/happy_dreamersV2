"use client"

import React from 'react'
import { Dashboard } from './Dashboard'

/**
 * Demo page for testing the Dashboard component
 * This file demonstrates the responsive Dashboard implementation
 * transcribed from Figma design
 */
export default function DashboardDemo() {
  return (
    <div className="min-h-screen">
      <Dashboard />
    </div>
  )
}

// Usage Instructions:
// 1. Import this component into your page structure
// 2. The Dashboard is fully responsive and adapts to:
//    - Mobile: Single column layout
//    - Tablet: 2-column stats grid, stacked main content
//    - Desktop: 4-column stats grid, 2/3 + 1/3 main content layout
// 3. Includes accessibility features and print styles
// 4. Supports dark mode and reduced motion preferences
