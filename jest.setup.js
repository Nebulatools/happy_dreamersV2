// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
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
  useParams() {
    return {}
  },
}))

// Mock de next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  SessionProvider: ({ children }) => children,
}))

// Mock de capa de datos unificada (Mongoose)
jest.mock('@/lib/mongoose', () => ({
  getDb: jest.fn().mockResolvedValue({}),
  getMongoClientPromise: jest.fn().mockResolvedValue({}),
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined), // dbConnect
}))

// Mock del logger para evitar logs en tests
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}))

// Configuración global de fetch para tests
global.fetch = jest.fn()

// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks()
})
