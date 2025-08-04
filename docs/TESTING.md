# >ê Guía de Testing - Happy Dreamers

## =Ë Tabla de Contenidos

- [Visión General](#visión-general)
- [Estrategia de Testing](#estrategia-de-testing)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Testing de Componentes](#testing-de-componentes)
- [Testing de API](#testing-de-api)
- [Testing de IA](#testing-de-ia)
- [Performance Testing](#performance-testing)
- [Configuración](#configuración)
- [CI/CD Integration](#cicd-integration)
- [Mejores Prácticas](#mejores-prácticas)

## <¯ Visión General

Happy Dreamers implementa una estrategia de testing completa para garantizar calidad y confiabilidad:

- **Unit Tests**: Funciones y componentes individuales
- **Integration Tests**: Interacción entre módulos
- **E2E Tests**: Flujos completos de usuario
- **Performance Tests**: Rendimiento y optimización
- **Security Tests**: Validación de seguridad

### Stack de Testing

```json
{
  "unit": "Jest + React Testing Library",
  "integration": "Jest + MSW",
  "e2e": "Playwright",
  "performance": "Lighthouse CI",
  "security": "npm audit + OWASP",
  "coverage": "Jest Coverage + Codecov"
}
```

## <¯ Estrategia de Testing

### Pirámide de Testing

```
         /\
        /  \       E2E (10%)
       /----\      - Flujos críticos
      /      \     - Happy paths
     /--------\    Integration (30%)
    /          \   - API endpoints
   /            \  - Servicios
  /--------------\ Unit Tests (60%)
 /                \ - Componentes
/                  \- Funciones
--------------------
```

### Cobertura Objetivo

```typescript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./app/api/": {
      branches: 90,
      functions: 90,
      lines: 90,
    },
    "./components/": {
      branches: 75,
      functions: 75,
      lines: 75,
    },
  },
}
```

## >ê Unit Testing

### Setup de Jest

```typescript
// jest.config.js
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
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

### Testing de Funciones

```typescript
// lib/__tests__/sleep-calculations.test.ts
import {
  calculateSleepDuration,
  analyzeSleepPattern,
  getSleepQuality,
} from '@/lib/sleep-calculations'

describe('Sleep Calculations', () => {
  describe('calculateSleepDuration', () => {
    it('calcula duración correcta entre dos timestamps', () => {
      const start = new Date('2024-01-20T22:00:00')
      const end = new Date('2024-01-21T06:30:00')
      
      const duration = calculateSleepDuration(start, end)
      
      expect(duration).toBe(510) // 8.5 horas en minutos
    })
    
    it('maneja casos de día siguiente correctamente', () => {
      const start = new Date('2024-01-20T23:00:00')
      const end = new Date('2024-01-21T07:00:00')
      
      const duration = calculateSleepDuration(start, end)
      
      expect(duration).toBe(480) // 8 horas
    })
    
    it('lanza error para duración negativa', () => {
      const start = new Date('2024-01-20T10:00:00')
      const end = new Date('2024-01-20T08:00:00')
      
      expect(() => calculateSleepDuration(start, end))
        .toThrow('Duración inválida')
    })
  })
  
  describe('analyzeSleepPattern', () => {
    const mockEvents = [
      {
        type: 'NIGHT_SLEEP',
        timestamp: new Date('2024-01-20T22:00:00'),
        duration: 480,
        quality: 'GOOD',
      },
      {
        type: 'NIGHT_WAKING',
        timestamp: new Date('2024-01-21T02:00:00'),
        duration: 30,
      },
    ]
    
    it('identifica patrones de despertar nocturno', () => {
      const pattern = analyzeSleepPattern(mockEvents)
      
      expect(pattern.nightWakings).toBe(1)
      expect(pattern.totalSleepTime).toBe(480)
      expect(pattern.sleepEfficiency).toBeCloseTo(0.94, 2)
    })
  })
})
```

### Testing de Hooks

```typescript
// hooks/__tests__/use-children.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChildren } from '@/hooks/use-children'
import { server } from '@/mocks/server'
import { rest } from 'msw'

describe('useChildren Hook', () => {
  it('carga niños exitosamente', async () => {
    const { result } = renderHook(() => useChildren())
    
    expect(result.current.isLoading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    expect(result.current.children).toHaveLength(2)
    expect(result.current.error).toBeNull()
  })
  
  it('maneja errores de API', async () => {
    server.use(
      rest.get('/api/children', (req, res, ctx) => {
        return res(ctx.status(500))
      })
    )
    
    const { result } = renderHook(() => useChildren())
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    expect(result.current.error).toBe('Error al cargar la lista de niños')
    expect(result.current.children).toHaveLength(0)
  })
  
  it('crea nuevo niño', async () => {
    const { result } = renderHook(() => useChildren())
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    const newChild = {
      firstName: 'Test',
      lastName: 'Child',
      birthDate: '2020-01-01',
    }
    
    await act(async () => {
      await result.current.createChild(newChild)
    })
    
    expect(result.current.children).toHaveLength(3)
  })
})
```

## >ê Testing de Componentes

### Setup de React Testing Library

```typescript
// jest.setup.js
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'jest'

// Cleanup después de cada test
afterEach(() => {
  cleanup()
})

// Mock de next/router
jest.mock('next/router', () => require('next-router-mock'))

// Mock de next-auth
jest.mock('next-auth/react', () => {
  const originalModule = jest.requireActual('next-auth/react')
  const mockSession = {
    expires: '2024-12-31',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'parent',
    },
  }
  
  return {
    ...originalModule,
    useSession: jest.fn(() => {
      return { data: mockSession, status: 'authenticated' }
    }),
  }
})
```

### Testing de Componentes UI

```typescript
// components/__tests__/EventRegistrationModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventRegistrationModal } from '@/components/events/EventRegistrationModal'

describe('EventRegistrationModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    childId: 'child-123',
    onSuccess: jest.fn(),
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  it('renderiza modal cuando está abierto', () => {
    render(<EventRegistrationModal {...mockProps} />)
    
    expect(screen.getByText('Registrar Evento de Sueño')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo de evento')).toBeInTheDocument()
    expect(screen.getByLabelText('Hora')).toBeInTheDocument()
  })
  
  it('no renderiza cuando está cerrado', () => {
    render(<EventRegistrationModal {...mockProps} isOpen={false} />)
    
    expect(screen.queryByText('Registrar Evento de Sueño')).not.toBeInTheDocument()
  })
  
  it('llama onClose cuando se hace click en cancelar', () => {
    render(<EventRegistrationModal {...mockProps} />)
    
    const cancelButton = screen.getByText('Cancelar')
    fireEvent.click(cancelButton)
    
    expect(mockProps.onClose).toHaveBeenCalledTimes(1)
  })
  
  it('valida campos requeridos', async () => {
    render(<EventRegistrationModal {...mockProps} />)
    
    const submitButton = screen.getByText('Guardar')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('El tipo de evento es requerido')).toBeInTheDocument()
    })
  })
  
  it('envía formulario con datos correctos', async () => {
    const user = userEvent.setup()
    render(<EventRegistrationModal {...mockProps} />)
    
    // Seleccionar tipo de evento
    const typeSelect = screen.getByLabelText('Tipo de evento')
    await user.selectOptions(typeSelect, 'NIGHT_SLEEP')
    
    // Ingresar duración
    const durationInput = screen.getByLabelText('Duración (minutos)')
    await user.clear(durationInput)
    await user.type(durationInput, '480')
    
    // Seleccionar estado emocional
    const emotionalState = screen.getByLabelText('Estado emocional')
    await user.selectOptions(emotionalState, 'CALM')
    
    // Enviar formulario
    const submitButton = screen.getByText('Guardar')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockProps.onSuccess).toHaveBeenCalledTimes(1)
    })
  })
})
```

### Testing de Componentes con Context

```typescript
// components/__tests__/ChildSelector.test.tsx
import { render, screen } from '@testing-library/react'
import { ChildSelector } from '@/components/dashboard/child-selector'
import { ActiveChildProvider } from '@/context/active-child-context'

const renderWithContext = (component: React.ReactElement) => {
  return render(
    <ActiveChildProvider>
      {component}
    </ActiveChildProvider>
  )
}

describe('ChildSelector', () => {
  it('renderiza lista de niños', async () => {
    renderWithContext(<ChildSelector />)
    
    await waitFor(() => {
      expect(screen.getByText('María Pérez')).toBeInTheDocument()
      expect(screen.getByText('Carlos Pérez')).toBeInTheDocument()
    })
  })
  
  it('marca niño activo', async () => {
    renderWithContext(<ChildSelector />)
    
    const mariaOption = await screen.findByText('María Pérez')
    fireEvent.click(mariaOption)
    
    expect(mariaOption.parentElement).toHaveClass('bg-blue-100')
  })
})
```

## < Testing de API

### Mock Service Worker Setup

```typescript
// mocks/handlers.ts
import { rest } from 'msw'

export const handlers = [
  // GET /api/children
  rest.get('/api/children', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        children: [
          {
            _id: '1',
            firstName: 'María',
            lastName: 'Pérez',
            birthDate: '2020-05-15',
            parentId: 'user-123',
          },
          {
            _id: '2',
            firstName: 'Carlos',
            lastName: 'Pérez',
            birthDate: '2022-03-20',
            parentId: 'user-123',
          },
        ],
      })
    )
  }),
  
  // POST /api/children
  rest.post('/api/children', async (req, res, ctx) => {
    const body = await req.json()
    
    return res(
      ctx.status(201),
      ctx.json({
        message: 'Niño registrado correctamente',
        id: '3',
      })
    )
  }),
  
  // POST /api/events
  rest.post('/api/events', async (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        message: 'Evento registrado correctamente',
        eventId: 'event-123',
      })
    )
  }),
]

// mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

### Testing de API Routes

```typescript
// app/api/children/__tests__/route.test.ts
import { GET, POST } from '@/app/api/children/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import clientPromise from '@/lib/mongodb'

jest.mock('next-auth')
jest.mock('@/lib/mongodb')

describe('API: /api/children', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      role: 'parent',
    },
  }
  
  beforeEach(() => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })
  
  describe('GET', () => {
    it('retorna niños del usuario autenticado', async () => {
      const mockChildren = [
        { _id: '1', firstName: 'Test', parentId: 'user-123' },
      ]
      
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue(mockChildren),
          }),
        }),
      }
      
      (clientPromise as any) = Promise.resolve({
        db: () => mockDb,
      })
      
      const request = new NextRequest('http://localhost:3000/api/children')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.children).toEqual(mockChildren)
    })
    
    it('retorna 401 sin autenticación', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/children')
      const response = await GET(request)
      
      expect(response.status).toBe(401)
    })
  })
  
  describe('POST', () => {
    it('crea nuevo niño', async () => {
      const mockInsertResult = {
        insertedId: 'new-child-id',
      }
      
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          insertOne: jest.fn().mockResolvedValue(mockInsertResult),
          updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        }),
      }
      
      (clientPromise as any) = Promise.resolve({
        db: () => mockDb,
      })
      
      const request = new NextRequest('http://localhost:3000/api/children', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'New',
          lastName: 'Child',
          birthDate: '2023-01-01',
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.id).toBe('new-child-id')
      expect(data.message).toBe('Niño registrado correctamente')
    })
    
    it('valida datos requeridos', async () => {
      const request = new NextRequest('http://localhost:3000/api/children', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Only',
          // Falta lastName
        }),
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })
})
```

## <­ End-to-End Testing

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})
```

### E2E Test Examples

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('usuario puede hacer login', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Verificar que estamos en login
    await expect(page).toHaveTitle(/Iniciar Sesión/)
    
    // Llenar formulario
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test123!')
    
    // Submit
    await page.click('button[type="submit"]')
    
    // Verificar redirección a dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })
  
  test('muestra error con credenciales inválidas', async ({ page }) => {
    await page.goto('/auth/login')
    
    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'WrongPass')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('.error-message'))
      .toContainText('Credenciales inválidas')
  })
  
  test('usuario puede hacer logout', async ({ page }) => {
    // Login primero
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button[type="submit"]')
    
    // Esperar dashboard
    await page.waitForURL('/dashboard')
    
    // Hacer logout
    await page.click('button[aria-label="User menu"]')
    await page.click('text=Cerrar Sesión')
    
    // Verificar redirección a login
    await expect(page).toHaveURL('/auth/login')
  })
})

// e2e/sleep-event-registration.spec.ts
test.describe('Registro de Eventos de Sueño', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })
  
  test('registrar evento de sueño nocturno', async ({ page }) => {
    // Navegar a eventos
    await page.click('text=Eventos')
    
    // Abrir modal de registro
    await page.click('button:has-text("Registrar Evento")')
    
    // Llenar formulario
    await page.selectOption('select[name="type"]', 'NIGHT_SLEEP')
    await page.fill('input[name="time"]', '22:00')
    await page.fill('input[name="duration"]', '480')
    await page.selectOption('select[name="emotionalState"]', 'CALM')
    await page.fill('textarea[name="notes"]', 'Se durmió sin problemas')
    
    // Guardar
    await page.click('button:has-text("Guardar")')
    
    // Verificar que se agregó el evento
    await expect(page.locator('.event-list'))
      .toContainText('Sueño Nocturno')
    await expect(page.locator('.toast-success'))
      .toContainText('Evento registrado correctamente')
  })
  
  test('validación de campos requeridos', async ({ page }) => {
    await page.click('text=Eventos')
    await page.click('button:has-text("Registrar Evento")')
    
    // Intentar guardar sin datos
    await page.click('button:has-text("Guardar")')
    
    // Verificar mensajes de error
    await expect(page.locator('.field-error'))
      .toContainText('El tipo de evento es requerido')
  })
})
```

## > Testing de IA

### Mock de OpenAI

```typescript
// __mocks__/openai.ts
export class OpenAI {
  chat = {
    completions: {
      create: jest.fn().mockResolvedValue({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Análisis de sueño mock',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }),
    },
  }
  
  embeddings = {
    create: jest.fn().mockResolvedValue({
      object: 'list',
      data: [{
        object: 'embedding',
        embedding: Array(1536).fill(0.1),
        index: 0,
      }],
      model: 'text-embedding-ada-002',
      usage: {
        prompt_tokens: 8,
        total_tokens: 8,
      },
    }),
  }
}
```

### Testing de Funciones de IA

```typescript
// lib/ai/__tests__/sleep-analyzer.test.ts
import { SleepAnalyzer } from '@/lib/ai/sleep-analyzer'
import { OpenAI } from 'openai'

jest.mock('openai')

describe('SleepAnalyzer', () => {
  let analyzer: SleepAnalyzer
  let mockOpenAI: jest.Mocked<OpenAI>
  
  beforeEach(() => {
    analyzer = new SleepAnalyzer()
    mockOpenAI = (OpenAI as jest.MockedClass<typeof OpenAI>).mock.instances[0]
  })
  
  describe('analyzePatterns', () => {
    it('genera análisis correcto', async () => {
      const mockEvents = [
        {
          type: 'NIGHT_SLEEP',
          timestamp: new Date('2024-01-20T22:00:00'),
          duration: 480,
          emotionalState: 'CALM',
        },
      ]
      
      const analysis = await analyzer.analyzePatterns(mockEvents)
      
      expect(analysis).toHaveProperty('statistics')
      expect(analysis).toHaveProperty('patterns')
      expect(analysis).toHaveProperty('insights')
      expect(analysis).toHaveProperty('recommendations')
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled()
    })
    
    it('maneja errores de OpenAI', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Rate limit exceeded')
      )
      
      await expect(analyzer.analyzePatterns([]))
        .rejects.toThrow('Rate limit exceeded')
    })
  })
})
```

## ¡ Performance Testing

### Lighthouse CI

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run build && npm run start',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/dashboard/children',
      ],
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
```

### Performance Tests

```typescript
// performance/load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 20 },   // Stay
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
  },
}

export default function () {
  const BASE_URL = 'http://localhost:3000'
  
  // Test login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, {
    email: 'test@example.com',
    password: 'Test123!',
  })
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'login fast': (r) => r.timings.duration < 300,
  })
  
  const token = loginRes.json('token')
  
  // Test get children
  const childrenRes = http.get(`${BASE_URL}/api/children`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  
  check(childrenRes, {
    'children fetched': (r) => r.status === 200,
    'children fast': (r) => r.timings.duration < 200,
  })
  
  sleep(1)
}
```

## =' CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
  
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        env:
          MONGODB_URI: mongodb://localhost:27017/test
        run: npm run test:integration
  
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
  
  performance-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
```

## <¯ Mejores Prácticas

### 1. Organización de Tests

```
__tests__/
   unit/
      components/
      hooks/
      lib/
   integration/
      api/
      services/
   e2e/
      auth/
      dashboard/
      flows/
   performance/
```

### 2. Naming Conventions

```typescript
// Descriptivo y en español
describe('EventRegistrationModal', () => {
  it('muestra modal cuando está abierto', () => {})
  it('valida campos requeridos antes de enviar', () => {})
  it('envía datos correctos al API', () => {})
})
```

### 3. Test Data Builders

```typescript
// test-utils/builders.ts
export class ChildBuilder {
  private child = {
    _id: 'test-id',
    firstName: 'Test',
    lastName: 'Child',
    birthDate: '2020-01-01',
    parentId: 'parent-id',
  }
  
  withId(id: string) {
    this.child._id = id
    return this
  }
  
  withName(firstName: string, lastName: string) {
    this.child.firstName = firstName
    this.child.lastName = lastName
    return this
  }
  
  build() {
    return { ...this.child }
  }
}

// Uso
const child = new ChildBuilder()
  .withName('María', 'García')
  .build()
```

### 4. Async Testing

```typescript
// Siempre usar async/await o return promises
it('carga datos asincrónicamente', async () => {
  const data = await fetchData()
  expect(data).toBeDefined()
})

// Con waitFor para UI
it('muestra datos después de cargar', async () => {
  render(<Component />)
  
  await waitFor(() => {
    expect(screen.getByText('Datos cargados')).toBeInTheDocument()
  })
})
```

### 5. Cleanup

```typescript
// Siempre limpiar después de tests
afterEach(() => {
  jest.clearAllMocks()
  cleanup()
})

afterAll(async () => {
  await server.close()
})
```

---

**Última actualización:** Enero 2024  
**Versión:** 1.0.0