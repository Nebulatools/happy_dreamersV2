// 🌈 Componente de áreas de fondo - Gradiente día/noche
"use client"

import React from 'react'

export const BackgroundAreas = React.memo(() => {
  return (
    <div 
      className="absolute inset-0"
      style={{
        background: `linear-gradient(
          to bottom,
          hsl(220 40% 85%) 0%,        /* Noche (0:00-6:00) */
          hsl(220 40% 85%) 25%,       /* 25% = 6 horas */
          hsl(48 100% 94%) 25%,       /* Día (6:00-19:00) */
          hsl(48 100% 94%) 79.17%,    /* 79.17% = 19 horas */
          hsl(220 40% 85%) 79.17%,    /* Noche (19:00-24:00) */
          hsl(220 40% 85%) 100%
        )`
      }}
    />
  )
})

BackgroundAreas.displayName = 'BackgroundAreas'