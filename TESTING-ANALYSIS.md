# Testing Analysis & Implementation Plan - Happy Dreamers 🌙

*Análisis de cobertura de testing y plan de implementación - Fase 3*

## 📊 Estado Actual de Testing

### Análisis de Cobertura
- **Tests Existentes**: 0 archivos de test
- **Cobertura Actual**: 0%
- **Objetivo**: 80% de cobertura
- **Framework de Testing**: No configurado
- **Scripts de Testing**: No definidos

### Dependencias de Testing Faltantes
- Testing framework (Jest/Vitest)
- React Testing Library
- Testing utilities
- Mocking libraries
- Coverage tools

## 🎯 Estrategia de Testing

### Niveles de Testing Propuestos

#### 1. Tests Unitarios (50% cobertura objetivo)
- Componentes React individuales
- Hooks personalizados
- Funciones utilitarias
- Validaciones y formatters

#### 2. Tests de Integración (25% cobertura objetivo)
- APIs endpoints
- Flujos de autenticación
- Operaciones de base de datos
- Integraciones externas

#### 3. Tests E2E (5% cobertura objetivo)
- Flujos críticos de usuario
- Registro de eventos
- Gestión de perfiles

## 🛠️ Plan de Implementación

### Fase 1: Configuración de Testing Framework

#### Opción A: Jest (Recomendado)
```json
{
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "ts-jest": "^29.1.0"
  }
}
```

#### Opción B: Vitest (Alternativa moderna)
```json
{
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/user-event": "^14.5.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vitest": "^2.0.0",
    "@vitest/ui": "^2.0.0",
    "jsdom": "^24.0.0"
  }
}
```

### Fase 2: Configuración de Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

### Fase 3: Estructura de Tests

```
├── __tests__/
│   ├── components/
│   │   ├── events/
│   │   │   ├── EventRegistrationModal.test.tsx
│   │   │   └── EventFormSection.test.tsx
│   │   ├── dashboard/
│   │   │   ├── ChildSelector.test.tsx
│   │   │   └── PatientQuickSelector.test.tsx
│   │   └── child-profile/
│   │       └── SleepMetricsGrid.test.tsx
│   ├── hooks/
│   │   ├── useEventDateTime.test.ts
│   │   └── useEventForm.test.ts
│   ├── lib/
│   │   ├── validations/
│   │   │   └── event.test.ts
│   │   └── calculations/
│   │       └── sleep-metrics.test.ts
│   └── api/
│       ├── auth.test.ts
│       └── events.test.ts
```

## 📝 Tests Prioritarios

### 1. Hooks Personalizados (Alta Prioridad)
```typescript
// __tests__/hooks/useEventDateTime.test.ts
import { renderHook } from '@testing-library/react'
import { useEventDateTime } from '@/hooks/useEventDateTime'

describe('useEventDateTime', () => {
  it('should format current date correctly', () => {
    const { result } = renderHook(() => useEventDateTime())
    const dateISO = result.current.getCurrentDateTimeISO()
    expect(dateISO).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('should calculate duration correctly', () => {
    const { result } = renderHook(() => useEventDateTime())
    const duration = result.current.calculateDuration(
      '2024-01-01T10:00',
      '2024-01-01T12:30'
    )
    expect(duration).toBe(2.5)
  })
})
```

### 2. Validaciones (Alta Prioridad)
```typescript
// __tests__/lib/validations/event.test.ts
import { eventFormSchema, isValidEventDuration } from '@/lib/validations/event'

describe('Event Validations', () => {
  it('should validate event form data', () => {
    const validData = {
      eventType: 'sleep',
      emotionalState: 'calm',
      startTime: '2024-01-01T20:00',
      endTime: '2024-01-02T07:00'
    }
    
    const result = eventFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should reject invalid duration', () => {
    expect(isValidEventDuration(15, 'sleep')).toBe(false)
    expect(isValidEventDuration(8, 'sleep')).toBe(true)
  })
})
```

### 3. Componentes Críticos (Media Prioridad)
```typescript
// __tests__/components/events/EventFormSection.test.tsx
import { render, screen } from '@testing-library/react'
import { EventFormSection } from '@/components/events/EventFormSection'

describe('EventFormSection', () => {
  it('should render title and children', () => {
    render(
      <EventFormSection title="Test Section">
        <div>Test Content</div>
      </EventFormSection>
    )
    
    expect(screen.getByText('Test Section')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })
})
```

### 4. APIs (Media Prioridad)
```typescript
// __tests__/api/events.test.ts
import { POST } from '@/app/api/events/route'
import { getServerSession } from 'next-auth'

jest.mock('next-auth')

describe('Events API', () => {
  it('should create event with valid data', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user123' }
    })

    const request = new Request('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({
        childId: 'child123',
        eventType: 'sleep',
        startTime: new Date()
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
  })
})
```

## 🚀 Configuración de Jest

### jest.config.js
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)'
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}

module.exports = createJestConfig(customJestConfig)
```

### jest.setup.js
```javascript
import '@testing-library/jest-dom'

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return {
      get: jest.fn(),
    }
  },
  usePathname() {
    return ''
  },
}))

// Mock de MongoDB para tests
jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}))
```

## 📊 Métricas de Éxito

### Cobertura por Categoría
- **Hooks**: 90%+ (crítico)
- **Validaciones**: 95%+ (crítico)
- **Componentes UI**: 80%+ (importante)
- **APIs**: 85%+ (importante)
- **Utilidades**: 90%+ (importante)

### Timeline
- **Semana 1**: Configuración + Tests de hooks y validaciones
- **Semana 2**: Tests de componentes críticos
- **Semana 3**: Tests de APIs y integración
- **Semana 4**: Optimización y CI/CD

## 🔧 Comandos de Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar en modo watch
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage

# Ejecutar tests específicos
npm test EventRegistrationModal

# Ejecutar con debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 🎯 Priorización de Tests

### Prioridad 1 (Críticos)
1. useEventDateTime hook
2. useEventForm hook
3. Event validations
4. API authentication

### Prioridad 2 (Importantes)
1. EventRegistrationModal
2. ChildSelector
3. SleepMetricsGrid
4. Event creation API

### Prioridad 3 (Nice to have)
1. UI components
2. Utility functions
3. Error handling
4. Edge cases

---
*Plan de testing para Happy Dreamers - Objetivo: 80% de cobertura*