# Claude AI Development Workflow - Happy Dreamers 🌙
*Customized for the Happy Dreamers child sleep tracking platform*

## 🎯 Project Context - Happy Dreamers

### Tech Stack
- **Frontend**: Next.js 15.2.4, React 19, TypeScript 5
- **UI**: Tailwind CSS with shadcn/ui components
- **Backend**: Next.js API Routes (serverless)
- **Database**: MongoDB with Mongoose ODM
- **Auth**: NextAuth.js with JWT sessions
- **AI**: OpenAI GPT-4, LangChain, LangGraph
- **Deployment**: Configured for Vercel

### Project Purpose
Happy Dreamers is a comprehensive sleep tracking and AI consultation platform for children, serving both parents and healthcare professionals. The application features multi-child support, advanced analytics, and an AI-powered assistant with RAG capabilities.

### Language & Localization
- **Interface Language**: Spanish
- **Code Comments**: Spanish throughout codebase
- **User Messages**: Spanish
- **Technical Logs**: English for debugging

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
- [ ] **Update SESSION-CONTEXT.md** - What was accomplished
- [ ] **Update SESSION-DEBUG.md** - Technical details if needed
- [ ] **Commit with descriptive message** - Clear commit format
- [ ] **Report session results** - What's ready for next time

### Documentation Priority
1. **CLAUDE.md** - This file (BRAIN & ORCHESTRATOR)
2. **SESSION-CONTEXT.md** - Current state, next session critical
3. **tasks/TODO.md** - Actionable items and progress
4. **SESSION-DEBUG.md** - Technical debugging history

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
2. **CHECK TODOS** - Understand current priorities
3. **MAKE PLAN** - Get approval before coding
4. **WORK INCREMENTALLY** - Small, simple changes
5. **DOCUMENT PROGRESS** - Update files at session end

### Important Reminders:
- **Do only what's asked** - Nothing more, nothing less
- **Prefer editing** existing files over creating new ones
- **Keep changes simple** - Avoid massive refactors
- **Wait for approval** - Don't proceed without user consent
- **Update documentation** - Keep workflow files current

---

*This file is customized for the Happy Dreamers child sleep tracking platform.*
