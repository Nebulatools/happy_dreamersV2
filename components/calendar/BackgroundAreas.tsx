// 🌈 Componente de áreas de fondo - Imagen infantil con nubecitas
"use client"

import React from 'react'

export const BackgroundAreas = React.memo(() => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Imagen de fondo infantil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/calendar-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.35
        }}
      />
    </div>
  )
})

BackgroundAreas.displayName = 'BackgroundAreas'