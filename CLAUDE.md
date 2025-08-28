# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Claude AI Development Workflow - Happy Dreamers 🌙
*Customized for the Happy Dreamers child sleep tracking platform*

IMPORTANT: Don't ever use emojis in the UI. 
## 🎯 Project Context - Happy Dreamers

### Tech Stack & Architecture
- **Frontend**: Next.js 15.2.4 with App Router, React 19, TypeScript 5
- **UI**: Tailwind CSS 3.4.17 with shadcn/ui component system
- **Backend**: Next.js API Routes (serverless architecture)
- **Database**: MongoDB 6.19.0 with singleton connection pattern
- **Auth**: NextAuth.js with JWT sessions and role-based access control
- **AI**: OpenAI GPT-4, LangChain 0.3.27, LangGraph 0.3.0 for multi-agent RAG system
- **Testing**: Jest 29.7.0 with React Testing Library for unit/integration tests
- **Deployment**: Vercel with automatic CI/CD pipeline

### Project Purpose
Happy Dreamers is a comprehensive sleep tracking and AI consultation platform for children, serving both parents and healthcare professionals. The application features multi-child support, advanced analytics, and an AI-powered assistant with RAG capabilities.

### Language & Localization
- **Interface Language**: Spanish (all user-facing text)
- **Code Comments**: Spanish throughout codebase for team collaboration
- **User Messages**: Spanish for all user interactions and error messages
- **Technical Logs**: English for debugging and system logs
- **Database**: Spanish field names for user-related data

### Core Development Commands
```bash
# Development
npm run dev              # Start development server (localhost:3000)
npm run build           # Production build with type checking
npm run start           # Start production server

# Code Quality
npm run lint            # ESLint with auto-fix
npm run lint:strict     # Strict linting (max warnings: 0)
npm run type-check      # TypeScript type checking
npm run check-all       # Run both lint:strict and type-check

# Testing
npm test                # Run Jest test suite
npm run test:watch      # Interactive test mode for development
npm run test:coverage   # Generate coverage report
npm run test:ci         # CI-optimized test run (maxWorkers: 2)
```

### Environment Setup
Required `.env.local` variables:
```bash
# Database Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/happy_dreamers
MONGODB_DB=happy_dreamers

# Authentication (NextAuth.js)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key

# Development
NODE_ENV=development
```

## 🧠 CLAUDE BRAIN - CORE WORKFLOW SYSTEM

### Standard Workflow
1. **Think through the problem** - Read codebase and understand requirements
2. **Write a plan** to tasks/TODO.md with checkable items
3. **Get user approval** before starting any work
4. **Execute step by step** - Mark items complete as you go
5. **Explain changes** - High level summary of each change
6. **Keep it simple** - Avoid massive or complex changes
7. **Add review section** - Summary in TODO.md when complete

### Session Context Management

#### At Session Start (MANDATORY):
- [ ] **READ SESSION-CONTEXT.md first** - Critical for context
- [ ] **Check tasks/TODO.md** - Current priorities
- [ ] **Review recent commits** - Understand latest changes
- [ ] **Ask user for task** if not clear from context
- [ ] **Create detailed plan** using TodoWrite tool
- [ ] **WAIT for user approval** before coding

#### During Session (CONSTANT):
- [ ] **Update TodoWrite** - Track every step
- [ ] **Mark progress** - in_progress → completed
- [ ] **Simple changes only** - No massive refactors
- [ ] **Explain each step** - What was changed
- [ ] **Ask for feedback** - Before major decisions

#### At Session End (REQUIRED):
- [ ] **Update SESSION-CONTEXT.md** - What was accomplished (MAX 500 LINES)
- [ ] **Archive old context** - Move to /session-archive/ if needed
- [ ] **Clean up markdowns** - Remove obsolete files
- [ ] **Update SESSION-DEBUG.md** - Technical details if needed
- [ ] **Commit with descriptive message** - Clear commit format
- [ ] **Report session results** - What's ready for next time

### Documentation Priority
1. **CLAUDE.md** - This file (BRAIN & ORCHESTRATOR)
2. **SESSION-CONTEXT.md** - Current state (MAX 500 LINES)
3. **tasks/TODO.md** - Actionable items and progress
4. **SESSION-DEBUG.md** - Technical debugging history
5. **docs/** - Comprehensive architecture documentation (for deep analysis when needed)
6. **reference/** - Reference documentation (workflow, survey, consultas, etc.)

## 📚 Architecture Documentation (/docs/)

The `/docs/` folder contains comprehensive documentation about the entire application architecture. Use these resources for deep analysis when required:

### Available Documentation:
- **ARCHITECTURE.md** - Complete system design, patterns, and architectural decisions
- **API_REFERENCE.md** - All API endpoints, request/response formats, authentication
- **DATABASE.md** - MongoDB schemas, relationships, indexes, and patterns
- **COMPONENTS.md** - Component library, usage patterns, and UI guidelines
- **AI_INTEGRATION.md** - RAG system, OpenAI integration, LangChain implementation
- **SECURITY.md** - Security practices, authentication flow, data protection
- **TESTING.md** - Testing strategies, test patterns, coverage requirements
- **DEPLOYMENT.md** - Vercel deployment, environment variables, CI/CD
- **DEVELOPMENT.md** - Development workflow, coding standards, best practices
- **TROUBLESHOOTING.md** - Common issues, solutions, debugging techniques

### When to Use:
- **Deep Analysis Required**: When user requests comprehensive understanding
- **Complex Feature Implementation**: Before implementing major features
- **Architecture Changes**: When modifying system structure
- **Problem Solving**: When encountering complex issues
- **NOT for every session**: Regular development uses SESSION-CONTEXT.md

## 🔄 Context Management Rules - CRITICAL

### Session Context Limits
- **SESSION-CONTEXT.md**: MAXIMUM 500 lines
- **Information Age**: Archive after 1 week
- **No Duplication**: Reference /docs/ instead of copying

### Weekly Context Rotation
- **Every Monday**: Archive old context to /session-archive/YYYY-MM/
- **Keep Recent**: Only last 2-3 sessions in main file
- **Use References**: Link to docs instead of duplicating content

### File Organization
```
/session-archive/     # Historical session contexts
  /2025-01/          # January 2025 contexts
  /2024-12/          # December 2024 contexts
  
/reference/          # Reference documentation
  workflow.md        # Technical workflow
  survey.md          # Survey structure
  CONSULTAS.md       # Consultation system
  ADMIN_DASHBOARD_TRIAGE.md  # Admin dashboard

/docs/              # Permanent architecture docs
  [All architecture documentation]
```

### Session End Checklist
- [ ] Check SESSION-CONTEXT.md line count (<500)
- [ ] Remove information older than 1 week
- [ ] Archive old context to /session-archive/
- [ ] Update only with current session info
- [ ] Reference docs instead of duplicating

## 🎯 Happy Dreamers Code Standards

### MongoDB Best Practices
- Use singleton pattern for connections
- Implement proper error handling with try-catch
- Always check session before data access
- Use ObjectId for references
- Validate data before database operations

### Spanish Language Standards
- **Code Comments**: Always in Spanish
- **Variable Names**: English (standard practice)
- **User Messages**: Spanish for all user-facing text
- **Error Messages**: Spanish for users, English for logs
- **API Responses**: Spanish error messages

### Component Development
- Use TypeScript for all components
- Implement proper loading states
- Handle errors gracefully with Spanish messages
- Use shadcn/ui components consistently
- Follow feature-based organization

### Security Guidelines for Child Data
- Always validate user permissions
- Implement data isolation between families
- Never expose child data in logs
- Use proper authentication checks
- Follow GDPR principles for minor data

## 🚩 Error Handling & Debugging

### When Errors Occur:
1. **Document in SESSION-DEBUG.md** - Full error details
2. **Include context** - What was being attempted
3. **Record solution** - How it was fixed
4. **Update prevention** - How to avoid in future

### Common Issues & Solutions:
- **Import errors**: Check file paths and exports
- **API failures**: Verify endpoints and request format
- **Database issues**: Check schema and connections
- **Build errors**: Review dependencies and configuration

## 🏗️ Architecture Overview

### Directory Structure & Patterns
```
app/                    # Next.js App Router (file-based routing)
├── api/               # API routes with serverless functions
│   ├── auth/          # NextAuth.js authentication endpoints
│   ├── children/      # Child CRUD operations with role-based access
│   ├── events/        # Sleep event management with real-time updates
│   ├── consultas/     # AI consultation system with RAG integration
│   ├── rag/           # Document processing and vector search
│   └── admin/         # Administrative functions and reporting
├── auth/              # Authentication pages (login/register)
├── dashboard/         # Main application interface with nested routing
│   ├── children/      # Child management and profiles
│   ├── calendar/      # Event visualization and calendar views
│   ├── consultas/     # AI consultation interface
│   ├── configuracion/ # Settings and preferences
│   └── reports/       # Analytics and professional reporting
└── globals.css        # Global styles and Tailwind imports

components/            # Reusable React components with feature organization
├── ui/               # Base shadcn/ui components (primitive UI elements)
├── events/           # Event registration system (sleep, feeding, medication)
├── consultas/        # AI consultation components and chat interface
├── stats/            # Data visualization and analytics charts
├── survey/           # Dynamic survey system with wizard pattern
├── dashboard/        # Dashboard-specific components and layouts
└── calendar/         # Calendar views and event visualization

lib/                   # Utilities, configurations, and business logic
├── rag/              # AI system: multi-agent RAG with LangGraph
│   ├── chat-agent.ts # OpenAI GPT-4 integration with doctor personality
│   ├── vector-store-mongodb.ts # MongoDB vector storage for documents
│   └── plan-context-builder.ts # Context building for consultations
├── auth.ts           # NextAuth configuration with JWT and role-based auth
├── mongodb.ts        # Singleton database connection pattern
├── date-utils.ts     # Date/time utilities for event management
├── sleep-calculations.ts # Sleep metrics and analytics algorithms
└── validations/      # Zod schemas for runtime type validation

hooks/                 # Custom React hooks for state management
├── use-children.ts   # Child data fetching and caching
├── use-sleep-data.ts # Sleep analytics and metrics calculation
├── use-events-cache.ts # Event caching with optimistic updates
├── use-sleep-state.ts # Real-time sleep state management
└── use-sleep-insights.ts # AI-powered insights and recommendations

context/               # React Context providers for global state
├── active-child-context.tsx # Currently selected child state
├── dev-time-context.tsx     # Development time manipulation
└── page-header-context.tsx  # Navigation and header state

types/                 # TypeScript type definitions
└── models.ts         # Database model interfaces and types
```

### Key Architecture Patterns

#### 1. Serverless Monolith with Domain Separation
```typescript
// Each API route is a serverless function with clear domain boundaries
app/api/
├── events/route.ts    # Sleep event management domain
├── children/route.ts  # Child profile management domain  
├── consultas/route.ts # AI consultation domain
└── admin/route.ts     # Administrative functions domain
```

#### 2. Custom Hook Pattern for State Management
```typescript
// hooks/use-children.ts - Centralized child data management
export const useChildren = () => {
  const [children, setChildren] = useState<Child[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const fetchChildren = async () => {
    try {
      const response = await fetch('/api/children')
      const data = await response.json()
      setChildren(data.children)
    } catch (error) {
      console.error('Error fetching children:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return { children, isLoading, fetchChildren, refetch: fetchChildren }
}
```

#### 3. Singleton Database Connection Pattern
```typescript
// lib/mongodb.ts - Prevents connection exhaustion in serverless
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // Reuse connection in development to prevent exhaustion
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  // Create new connection for production
  client = new MongoClient(uri)
  clientPromise = client.connect()
}
```

#### 4. Role-Based Access Control Pattern
```typescript
// API middleware pattern for data isolation
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }
  
  const query: any = {}
  
  // Parents can only access their own children's data
  if (session.user.role === "parent") {
    query.parentId = session.user.id
  }
  // Admins can access all data (no additional filtering)
  
  const children = await db.collection('children').find(query).toArray()
  return NextResponse.json({ children })
}
```

### Core Data Models

#### Database Schema (MongoDB)
```typescript
// User model with role-based access
interface User {
  _id: ObjectId
  email: string
  name: string
  role: 'parent' | 'admin'
  password: string // hashed with bcryptjs
  children: ObjectId[] // Array of child references
  createdAt: Date
  updatedAt: Date
}

// Child profile with survey integration
interface Child {
  _id: ObjectId
  firstName: string
  lastName: string
  birthDate: string // ISO date string
  parentId: ObjectId // Reference to parent user
  surveyData: {
    completed: boolean
    responses: Record<string, any> // Dynamic survey responses
    lastUpdated: Date
  }
  currentSleepState: {
    isAsleep: boolean
    sleepStartTime?: Date
    expectedWakeTime?: Date
    sleepType: 'night' | 'nap'
  }
  activePlan?: {
    planId: ObjectId
    startDate: Date
    status: 'active' | 'completed' | 'paused'
  }
}

// Event system for tracking all child activities
interface Event {
  _id: ObjectId
  childId: ObjectId
  parentId: ObjectId // For data isolation
  type: 'sleep' | 'wake' | 'nap' | 'feeding' | 'medication' | 'activity'
  startTime: Date
  endTime?: Date // null for ongoing events
  duration?: number // calculated field in minutes
  emotionalState?: 'happy' | 'calm' | 'fussy' | 'crying'
  notes?: string
  metadata: {
    sleepDelay?: number // minutes delay before actual sleep
    feedingType?: 'breast' | 'bottle' | 'solid'
    medicationName?: string
    activityType?: 'play' | 'outdoor' | 'screen'
  }
  createdAt: Date
}
```

### AI System Architecture (RAG with Multi-Agent)

#### Vector Store and Document Processing
```typescript
// lib/rag/vector-store-mongodb.ts
export class MongoDBVectorStore {
  async addDocuments(documents: Document[]) {
    // Process documents into chunks
    const chunks = this.chunkDocuments(documents)
    
    // Generate embeddings using OpenAI
    const embeddings = await this.generateEmbeddings(chunks)
    
    // Store in MongoDB with vector search capabilities
    await this.collection.insertMany(chunks.map((chunk, i) => ({
      content: chunk.pageContent,
      metadata: chunk.metadata,
      embedding: embeddings[i]
    })))
  }
  
  async similaritySearch(query: string, k: number = 4) {
    const queryEmbedding = await this.generateQueryEmbedding(query)
    
    // MongoDB vector search pipeline
    const results = await this.collection.aggregate([
      {
        $vectorSearch: {
          queryVector: queryEmbedding,
          path: "embedding",
          numCandidates: k * 10,
          limit: k
        }
      }
    ]).toArray()
    
    return results.map(doc => new Document({
      pageContent: doc.content,
      metadata: doc.metadata
    }))
  }
}
```

#### Multi-Agent Chat System
```typescript
// lib/rag/chat-agent.ts - Doctor personality AI agent
export class ChatAgent {
  async generateResponse(query: string, relevantDocs: Document[]) {
    // Build context from retrieved documents
    const context = relevantDocs.length > 0 
      ? relevantDocs.map(doc => `
        Fuente: ${doc.metadata.source || "documento"}
        Contenido: ${doc.pageContent}
      `).join('\n\n---\n\n')
      : ""
    
    // Use specialized doctor personality prompt
    const systemPrompt = getDoctorSystemPrompt(context)
    
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      max_tokens: 300, // Optimized for concise responses
      temperature: 0.8, // Balanced creativity and consistency
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    })
    
    return completion.choices[0]?.message?.content
  }
}
```

### Event Registration System

#### Smart Sleep Button with Modal Flow
```typescript
// components/events/SleepButton.tsx - Core event registration logic
export function SleepButton({ childId, childName, onEventRegistered }) {
  const { sleepState, refetch } = useSleepState(childId)
  const [showDelayModal, setShowDelayModal] = useState(false)
  
  // Modal-first approach: Show configuration before creating event
  const handleSleepStart = () => {
    setShowDelayModal(true)
    setPendingEventData({
      eventType: sleepState?.sleepType === 'night' ? 'sleep' : 'nap',
      startTime: getCurrentTime()
    })
  }
  
  // Direct event creation for wake up
  const handleWakeUp = async () => {
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          type: 'wake',
          startTime: getCurrentTime(),
          endTime: getCurrentTime()
        })
      })
      
      await refetch() // Update sleep state
      onEventRegistered?.()
      
    } catch (error) {
      toast.error('Error al registrar el despertar')
    }
  }
}
```

### Security Implementation

#### NextAuth.js Configuration with Role-Based Access
```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const client = await clientPromise
        const user = await client.db().collection('users')
          .findOne({ email: credentials.email })
          
        if (!user || !await compare(credentials.password, user.password)) {
          return null
        }
        
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    
    async session({ session, token }) {
      session.user.id = token.sub!
      session.user.role = token.role as string
      return session
    }
  }
}
```

## 🔧 Development Patterns & Best Practices

### Component Development Standards

#### TypeScript Component Pattern
```typescript
// components/events/SleepButton.tsx
interface SleepButtonProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
}

export function SleepButton({ 
  childId, 
  childName,
  onEventRegistered 
}: SleepButtonProps) {
  // Always use proper TypeScript interfaces
  // Include optional callback props for parent communication
  // Use descriptive prop names that indicate their purpose
}
```

#### Error Handling Pattern
```typescript
// Pattern: Graceful error handling with Spanish user messages
const handleSubmit = async (data: EventData) => {
  try {
    setIsLoading(true)
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const result = await response.json()
    toast.success('Evento registrado correctamente') // Spanish success message
    
  } catch (error) {
    console.error('Event registration error:', error) // English for logs
    toast.error('Error al registrar el evento') // Spanish for users
  } finally {
    setIsLoading(false)
  }
}
```

#### Loading State Management
```typescript
// Pattern: Consistent loading states across components
const [isLoading, setIsLoading] = useState(false)
const [data, setData] = useState(null)
const [error, setError] = useState(null)

// Use loading states for all async operations
if (isLoading) return <div>Cargando...</div>
if (error) return <div>Error: {error.message}</div>
if (!data) return <div>No hay datos disponibles</div>
```

### API Development Patterns

#### Standardized API Response Format
```typescript
// lib/api-utils.ts - Consistent response format
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Usage in API routes
export async function GET() {
  try {
    const data = await fetchData()
    return NextResponse.json({ 
      success: true, 
      data 
    } as ApiResponse)
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    } as ApiResponse, { status: 500 })
  }
}
```

#### Input Validation with Zod
```typescript
// lib/validations/event.ts
import { z } from 'zod'

export const eventSchema = z.object({
  childId: z.string().min(1, "ID del niño es requerido"),
  type: z.enum(['sleep', 'wake', 'nap', 'feeding'], {
    errorMap: () => ({ message: "Tipo de evento inválido" })
  }),
  startTime: z.string().datetime("Formato de fecha inválido"),
  emotionalState: z.enum(['happy', 'calm', 'fussy', 'crying']).optional(),
  notes: z.string().max(500, "Notas demasiado largas").optional()
})

// Usage in API routes
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validatedData = eventSchema.parse(body) // Throws if invalid
    // Process validated data...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "Datos inválidos",
        details: error.errors
      }, { status: 400 })
    }
  }
}
```

### Database Patterns

#### Safe Database Queries with Error Handling
```typescript
// Pattern: Always handle database connection and query errors
import clientPromise from '@/lib/mongodb'

export async function getChildEvents(childId: string, parentId: string) {
  try {
    const client = await clientPromise
    const db = client.db()
    
    // Always include parentId in queries for data isolation
    const events = await db.collection('events').find({
      childId,
      parentId // Critical for security - prevent cross-family data access
    }).sort({ startTime: -1 }).toArray()
    
    return events
    
  } catch (error) {
    console.error('Database query error:', error)
    throw new Error('Error al obtener eventos')
  }
}
```

### Common Issues & Solutions

#### MongoDB Connection Issues
```typescript
// Problem: "Too many connections" or connection timeout
// Solution: Always use the singleton pattern in lib/mongodb.ts

// ❌ Wrong - Creates new connections
const client = new MongoClient(uri)
await client.connect()

// ✅ Correct - Uses singleton
import clientPromise from '@/lib/mongodb'
const client = await clientPromise
```

#### NextAuth Session Issues
```typescript
// Problem: Session not available in API routes
// Solution: Always use getServerSession with authOptions

// ❌ Wrong - Won't work in API routes
import { useSession } from 'next-auth/react'

// ✅ Correct - For API routes
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
}
```

#### TypeScript Import Issues
```typescript
// Problem: Cannot resolve module imports
// Solution: Check tsconfig.json path mapping

// tsconfig.json should include:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./app/*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/hooks/*": ["./hooks/*"]
    }
  }
}

// Use absolute imports consistently
import { Button } from '@/components/ui/button'  // ✅ Correct
import { Button } from '../../../components/ui/button'  // ❌ Avoid
```

#### Environment Variable Issues
```typescript
// Problem: Environment variables not loaded
// Solution: Ensure proper naming and loading

// .env.local (correct naming)
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=your-secret
OPENAI_API_KEY=sk-...

// Check variables are loaded
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set')
}
```

### Testing Patterns

#### Component Testing with Spanish Content
```typescript
// __tests__/components/SleepButton.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SleepButton } from '@/components/events/SleepButton'

describe('SleepButton', () => {
  test('should display Spanish sleep text when child is awake', () => {
    render(<SleepButton childId="123" childName="Test Child" />)
    
    // Test Spanish content
    expect(screen.getByText('SE DURMIÓ')).toBeInTheDocument()
  })
  
  test('should show error message in Spanish on API failure', async () => {
    // Mock failed API call
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'))
    
    render(<SleepButton childId="123" childName="Test Child" />)
    
    fireEvent.click(screen.getByText('SE DURMIÓ'))
    
    await waitFor(() => {
      expect(screen.getByText(/Error al registrar/)).toBeInTheDocument()
    })
  })
})
```

#### Hook Testing Pattern
```typescript
// __tests__/hooks/use-children.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useChildren } from '@/hooks/use-children'

describe('useChildren', () => {
  test('should fetch children data on mount', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ children: [{ id: '1', name: 'Test' }] })
    })
    
    const { result } = renderHook(() => useChildren())
    
    expect(result.current.isLoading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.children).toHaveLength(1)
    })
  })
})
```

## 🎯 Commit Message Standards

Format: `<type>(<scope>): <description>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style
- `refactor`: Code refactoring
- `test`: Testing
- `chore`: Build/tools

**Examples:**
```
feat(auth): implement user login system
fix(api): resolve 500 error in user endpoint
docs(readme): update installation instructions
```

## � SECURITY AUDIT PROCESS

### Mandatory Security Review - EVERY CODE CHANGE
Claude must perform this security audit before any commit:

#### 🛡️ Frontend Security Checklist
- [ ] **No Sensitive Data**: No API keys, tokens, or secrets in frontend code
- [ ] **No Hardcoded Credentials**: No passwords, database URLs, or auth tokens
- [ ] **No Console Logs**: No sensitive information in console.log statements
- [ ] **Environment Variables**: All sensitive data in .env files (not committed)
- [ ] **Input Validation**: All user inputs properly validated and sanitized
- [ ] **XSS Prevention**: No dangerouslySetInnerHTML without sanitization
- [ ] **CSRF Protection**: Proper CSRF tokens where needed
- [ ] **Authentication**: Proper auth checks on protected routes
- [ ] **Authorization**: Role-based access control implemented correctly
- [ ] **Data Exposure**: No sensitive data in props or state unnecessarily

#### 🔐 Backend Security Checklist
- [ ] **Input Validation**: All inputs validated with proper schemas (Zod, Joi, etc.)
- [ ] **SQL Injection**: Using parameterized queries or ORM protection
- [ ] **Authentication**: JWT tokens handled securely
- [ ] **Password Security**: Passwords hashed with bcrypt/scrypt
- [ ] **Rate Limiting**: API endpoints protected from abuse
- [ ] **CORS**: Proper CORS configuration
- [ ] **Headers**: Security headers implemented (CSP, HSTS, etc.)
- [ ] **Error Handling**: No sensitive info in error messages
- [ ] **Database**: Proper connection security and access control
- [ ] **File Upload**: Secure file handling if applicable

#### 🌐 API Security Checklist
- [ ] **Endpoint Security**: All endpoints require proper authentication
- [ ] **Input Sanitization**: All request data sanitized and validated
- [ ] **Output Encoding**: Response data properly encoded
- [ ] **HTTP Methods**: Proper HTTP methods used (GET, POST, PUT, DELETE)
- [ ] **Status Codes**: Appropriate HTTP status codes returned
- [ ] **API Keys**: No API keys exposed in client-side code
- [ ] **Rate Limiting**: Protection against brute force attacks
- [ ] **Request Size**: Limits on request body size
- [ ] **Timeout**: Proper timeout configurations
- [ ] **Logging**: Security events logged without sensitive data

#### 🔑 Authentication & Authorization
- [ ] **Session Management**: Secure session handling
- [ ] **Token Expiration**: Proper token expiration times
- [ ] **Refresh Tokens**: Secure refresh token implementation
- [ ] **Password Policy**: Strong password requirements enforced
- [ ] **Multi-Factor**: 2FA implementation if applicable
- [ ] **Account Lockout**: Protection against brute force login attempts
- [ ] **Role Validation**: Proper role checking on all protected actions
- [ ] **Privilege Escalation**: No unauthorized privilege escalation possible
- [ ] **Session Invalidation**: Proper logout functionality
- [ ] **Concurrent Sessions**: Session management for multiple devices

#### 🗃️ Database Security
- [ ] **Connection Security**: Encrypted database connections
- [ ] **Access Control**: Proper database user permissions
- [ ] **Data Encryption**: Sensitive data encrypted at rest
- [ ] **Backup Security**: Database backups properly secured
- [ ] **Migration Security**: Database migrations don't expose sensitive data
- [ ] **Query Security**: No dynamic SQL queries without sanitization
- [ ] **Data Leakage**: No sensitive data in logs or error messages
- [ ] **Audit Trail**: Important database actions logged
- [ ] **Data Retention**: Proper data retention policies
- [ ] **PII Protection**: Personal data properly protected

#### 🔍 Common Vulnerabilities Check
- [ ] **OWASP Top 10**: Check against current OWASP Top 10
- [ ] **Injection Attacks**: SQL, NoSQL, LDAP, OS command injection
- [ ] **Broken Authentication**: Session management flaws
- [ ] **Sensitive Data**: Exposure of sensitive information
- [ ] **XML External Entities**: XXE vulnerabilities
- [ ] **Broken Access Control**: Authorization bypass
- [ ] **Security Misconfiguration**: Default credentials, verbose errors
- [ ] **Cross-Site Scripting**: XSS vulnerabilities
- [ ] **Insecure Deserialization**: Object deserialization flaws
- [ ] **Known Vulnerabilities**: Dependencies with known security issues

### 🚨 Security Audit Command
After writing any code, Claude should run this mental checklist:

```
SECURITY AUDIT PROMPT:
"Please check through all the code you just wrote and make sure it follows security best practices. Make sure there are no sensitive information in the frontend and there are no vulnerabilities that can be exploited."
```

### 🔒 Security Documentation Template
For each security-sensitive change, document:

```markdown
## Security Review - [DATE]

### Code Changes
- **Files Modified**: [list]
- **Security Impact**: [High/Medium/Low]
- **Risk Assessment**: [description]

### Security Checklist Completed
- [x] Frontend security review
- [x] Backend security review
- [x] API security review
- [x] Authentication/Authorization review
- [x] Database security review
- [x] Common vulnerabilities check

### Vulnerabilities Found & Fixed
- **Issue**: [description]
- **Risk**: [High/Medium/Low]
- **Fix**: [how it was resolved]

### Security Recommendations
- [recommendation 1]
- [recommendation 2]
- [recommendation 3]
```

## �🔍 Code Review Checklist

### Before Committing:
- [ ] **🔒 SECURITY AUDIT COMPLETED** - All security checks passed
- [ ] **Code Quality**: Follows project standards
- [ ] **Functionality**: Works as expected
- [ ] **Error Handling**: Proper error management
- [ ] **Documentation**: Comments for complex logic
- [ ] **Testing**: Basic functionality verified
- [ ] **Performance**: No obvious bottlenecks

## 📊 User Command Templates

### Session Start:
- `"Initialize project and analyze repository"`
- `"Start session: read context and report current state"`
- `"Continue with current critical priority"`

### During Work:
- `"Follow the plan, next step"`
- `"Update todos and continue"`
- `"Commit and explain changes"`
- `"Simplify into smaller steps"`

### Session End:
- `"Update session documentation"`
- `"Commit current changes"`
- `"What's the priority for next session?"`


## 🧠 CRITICAL INSTRUCTIONS FOR CLAUDE

### Every Session:
1. **READ CONTEXT FIRST** - SESSION-CONTEXT.md is critical
2. **CHECK PROTECTED FILES** - Review PROTECTED_FILES.md before any changes
3. **CHECK TODOS** - Understand current priorities
4. **MAKE PLAN** - Get approval before coding
5. **WORK INCREMENTALLY** - Small, simple changes
6. **DOCUMENT PROGRESS** - Update files at session end

### Important Reminders:
- **Do only what's asked** - Nothing more, nothing less
- **Check protected files** - Never modify without authorization
- **Prefer editing** existing files over creating new ones
- **Keep changes simple** - Avoid massive refactors
- **Wait for approval** - Don't proceed without user consent
- **Update documentation** - Keep workflow files current

---

*This file is customized for the Happy Dreamers child sleep tracking platform.*
