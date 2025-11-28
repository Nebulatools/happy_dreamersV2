// Optimizador de imports de Radix UI
// Consolida 30+ paquetes individuales en imports optimizados

/**
 * Configuración para optimizar imports de Radix UI
 * Esto debe usarse con el webpack alias en next.config.js
 */

// Mapeo de componentes Radix UI más usados
export const RADIX_COMPONENTS = {
  // Componentes de layout
  "Accordion": "@radix-ui/react-accordion",
  "AlertDialog": "@radix-ui/react-alert-dialog",
  "AspectRatio": "@radix-ui/react-aspect-ratio",
  "Avatar": "@radix-ui/react-avatar",
  
  // Componentes de formulario
  "Checkbox": "@radix-ui/react-checkbox",
  "Collapsible": "@radix-ui/react-collapsible",
  "ContextMenu": "@radix-ui/react-context-menu",
  "Dialog": "@radix-ui/react-dialog",
  "DropdownMenu": "@radix-ui/react-dropdown-menu",
  
  // Componentes de navegación
  "HoverCard": "@radix-ui/react-hover-card",
  "Label": "@radix-ui/react-label",
  "Menubar": "@radix-ui/react-menubar",
  "NavigationMenu": "@radix-ui/react-navigation-menu",
  
  // Componentes de datos
  "Popover": "@radix-ui/react-popover",
  "Progress": "@radix-ui/react-progress",
  "RadioGroup": "@radix-ui/react-radio-group",
  "ScrollArea": "@radix-ui/react-scroll-area",
  "Select": "@radix-ui/react-select",
  "Separator": "@radix-ui/react-separator",
  
  // Componentes de feedback
  "Slider": "@radix-ui/react-slider",
  "Switch": "@radix-ui/react-switch",
  "Tabs": "@radix-ui/react-tabs",
  "Toast": "@radix-ui/react-toast",
  "Toggle": "@radix-ui/react-toggle",
  "ToggleGroup": "@radix-ui/react-toggle-group",
  "Tooltip": "@radix-ui/react-tooltip",
  
  // Utilidades
  "Slot": "@radix-ui/react-slot",
  "VisuallyHidden": "@radix-ui/react-visually-hidden",
} as const

// Script para analizar y optimizar imports en el proyecto
export function generateOptimizedImports(usedComponents: string[]): string {
  const imports: string[] = []
  const componentGroups: Record<string, string[]> = {}
  
  // Agrupar componentes por paquete
  usedComponents.forEach(component => {
    const packageName = RADIX_COMPONENTS[component as keyof typeof RADIX_COMPONENTS]
    if (packageName) {
      if (!componentGroups[packageName]) {
        componentGroups[packageName] = []
      }
      componentGroups[packageName].push(component)
    }
  })
  
  // Generar imports optimizados
  Object.entries(componentGroups).forEach(([packageName, components]) => {
    if (components.length === 1) {
      imports.push(`import * as ${components[0]} from '${packageName}'`)
    } else {
      const componentList = components.join(", ")
      imports.push(`import { ${componentList} } from '${packageName}'`)
    }
  })
  
  return imports.join("\n")
}

// Configuración para webpack (usar en next.config.js)
export const radixWebpackConfig = {
  resolve: {
    alias: {
      // Consolidar imports comunes
      "@radix-ui/react-primitives": "@radix-ui/react-primitive",
      // Optimizar carga de íconos
      "@radix-ui/react-icons": "@radix-ui/react-icons/dist/index.esm.js",
    },
  },
  optimization: {
    sideEffects: false,
    usedExports: true,
  },
}

// Hook para lazy load de componentes Radix pesados
export function useLazyRadixComponent<T = any>(
  componentName: keyof typeof RADIX_COMPONENTS
): T | null {
  const [Component, setComponent] = React.useState<T | null>(null)
  
  React.useEffect(() => {
    const loadComponent = async () => {
      try {
        const packageName = RADIX_COMPONENTS[componentName]
        const module = await import(packageName)
        setComponent(module[componentName] || module.default)
      } catch (error) {
        console.error(`Error cargando componente Radix: ${componentName}`, error)
      }
    }
    
    loadComponent()
  }, [componentName])
  
  return Component
}

// Utilidad para detectar componentes Radix no utilizados
export async function findUnusedRadixPackages(): Promise<string[]> {
  // Esta función sería ejecutada como script de análisis
  // npm run analyze:radix
  
  const fs = await import("fs")
  const path = await import("path")
  const glob = await import("glob")
  
  const projectRoot = process.cwd()
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "package.json"), "utf-8")
  )
  
  // Obtener todos los paquetes Radix instalados
  const installedRadixPackages = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }).filter(pkg => pkg.startsWith("@radix-ui/"))
  
  // Buscar imports en el código
  const files = glob.sync("**/*.{ts,tsx,js,jsx}", {
    cwd: projectRoot,
    ignore: ["node_modules/**", ".next/**", "dist/**"],
  })
  
  const usedPackages = new Set<string>()
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(projectRoot, file), "utf-8")
    const importRegex = /from\s+['"](@radix-ui\/[^'"]+)['"]/g
    let match
    
    while ((match = importRegex.exec(content)) !== null) {
      usedPackages.add(match[1])
    }
  }
  
  // Encontrar paquetes no utilizados
  const unusedPackages = installedRadixPackages.filter(
    pkg => !usedPackages.has(pkg)
  )
  
  return unusedPackages
}

// Re-exportar React para el hook
import * as React from "react"

export default {
  RADIX_COMPONENTS,
  generateOptimizedImports,
  radixWebpackConfig,
  useLazyRadixComponent,
  findUnusedRadixPackages,
}