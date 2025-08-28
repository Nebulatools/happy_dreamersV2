# 🚀 Happy Dreamers - Test Flow Solution

## 📋 Overview

This directory contains a complete test suite for the Happy Dreamers child sleep tracking application. The test simulates the entire user journey from child registration through iterative plan refinement.

## 📁 Directory Structure

```
flow-solution/
├── COMPLETE_WORKFLOW.md    # Comprehensive workflow documentation
├── test-josefina-flow.js   # Main test script
├── sample-data.js           # Sample data generator
├── README.md               # This file
└── test-results/           # Test output directory
```

## 🛠️ Prerequisites

### Required Software
- Node.js v18+ 
- MongoDB 4.4+ (running locally or remote)
- npm or yarn package manager

### Required npm Packages
```bash
npm install mongodb
```

### Environment Variables
Create a `.env` file in the project root with:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=happy_dreamers

# Or for MongoDB Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB=happy_dreamers
```

### Database Setup
Ensure you have:
1. MongoDB running and accessible
2. A database named `happy_dreamers`
3. User account with ID `688ce146d2d5ff9616549d86` (test@test.com)
4. Admin account (optional, will use test admin ID)

## 📊 Test Flow Overview

The test simulates:

1. **Child Registration** - Creates "Josefina" with complete survey data
2. **July Events** - Generates ~93 sleep events for July 2025
3. **Plan 0** - Initial plan based on survey + statistics
4. **August Events** - Additional 45 events showing improvement
5. **Plan 1** - Updated plan based on new events
6. **Consultation** - Medical consultation transcript
7. **Plan 1.1** - Refined plan incorporating professional feedback

## 🚦 Quick Start

### 1. Basic Test Run
```bash
cd /Users/jaco/Desktop/nebula/proyectos_clientes/happy_dreamers_v0/pruebas/flow-solution
node test-josefina-flow.js
```

### 2. Test with Custom MongoDB URI
```bash
MONGODB_URI=mongodb://localhost:27017 MONGODB_DB=happy_dreamers node test-josefina-flow.js
```

### 3. Production Mode (Preserves Data)
Edit `test-josefina-flow.js` and set:
```javascript
const CONFIG = {
  // ...
  TEST_MODE: false // Changes from true to false
}
```

## 🔧 Configuration Options

### In `test-josefina-flow.js`:

```javascript
const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  DB_NAME: process.env.MONGODB_DB || 'happy_dreamers',
  PARENT_ID: '688ce146d2d5ff9616549d86', // Existing parent account
  ADMIN_ID: '676c8c1cc8c99baac91e5819',   // Admin for plan generation
  CHILD_NAME: 'Josefina',                 // Name of test child
  START_DATE: new Date('2025-07-01'),     // Start of event generation
  TEST_MODE: true                         // true = cleanup after test
}
```

## 📝 Expected Output

### Successful Test Run:
```
=============================================================

🚀 INICIANDO TEST COMPLETO - HAPPY DREAMERS FLOW

=============================================================

📍 PASO 0: Conectando a MongoDB...
✅ Conexión exitosa a MongoDB

📍 PASO 1: Verificando cuenta padre...
✅ Cuenta padre verificada

📍 PASO 2: Creando niño Josefina con survey completo...
🎉 Niño creado exitosamente

📍 PASO 3: Generando eventos iniciales (Julio 2025)...
🎉 93 eventos generados para julio 2025

📍 PASO 4: Generando Plan 0...
🎉 Plan 0 generado

📍 PASO 5: Generando eventos adicionales...
🎉 45 eventos adicionales generados

📍 PASO 6: Generando Plan 1...
🎉 Plan 1 generado

📍 PASO 7: Creando transcript de consulta...
🎉 Transcript de consulta creado

📍 PASO 8: Generando Plan 1.1...
🎉 Plan 1.1 (refinamiento) generado

📍 PASO 9: Validando flujo completo...
✓ Todos los componentes validados

📍 PASO 10: Generando reporte final...
🎉 Reporte generado

=============================================================

✅ TEST COMPLETADO EXITOSAMENTE

=============================================================
```

## 🔍 Validation Checks

The test performs these validations:

| Component | Validation |
|-----------|------------|
| Child Creation | ✅ Child exists with survey data |
| Event Generation | ✅ 138+ events created |
| Plan 0 | ✅ Initial plan generated |
| Plan 1 | ✅ Event-based plan created |
| Consultation | ✅ Transcript analyzed |
| Plan 1.1 | ✅ Refinement plan created |
| Data Consistency | ✅ All relationships valid |

## 🐛 Troubleshooting

### Common Issues:

#### 1. MongoDB Connection Failed
```
❌ Error conectando a MongoDB
```
**Solution**: 
- Check MongoDB is running: `mongod --version`
- Verify connection string in CONFIG
- Check network/firewall settings

#### 2. Parent Account Not Found
```
❌ No se encontró el usuario padre con ID: 688ce146d2d5ff9616549d86
```
**Solution**:
- Create parent account first
- Or update PARENT_ID in CONFIG to existing account

#### 3. Admin Account Issues
```
❌ No autorizado (Plan generation)
```
**Solution**:
- Ensure admin account exists
- Update ADMIN_ID in CONFIG
- Admin role required for plan generation

#### 4. Cleanup Failed
```
❌ Error durante limpieza
```
**Solution**:
- Manually check and remove test data
- Collections: children, events, child_plans, consultation_reports

## 🧪 Manual Testing

### Create Parent Account (if needed):
```javascript
// MongoDB shell
use happy_dreamers
db.users.insertOne({
  _id: ObjectId("688ce146d2d5ff9616549d86"),
  email: "test@test.com",
  name: "Test Parent",
  password: "hashed_password_here",
  role: "parent",
  children: [],
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Verify Test Data:
```javascript
// Check child
db.children.findOne({ firstName: "Josefina" })

// Count events
db.children.findOne({ firstName: "Josefina" }).events.length

// View plans
db.child_plans.find({ childId: ObjectId("child_id_here") }).toArray()

// Check consultation
db.consultation_reports.findOne({ childId: ObjectId("child_id_here") })
```

## 📊 Data Cleanup

### Automatic Cleanup (TEST_MODE = true):
The test automatically removes:
- Created child
- All generated events
- All plans (0, 1, 1.1)
- Consultation report
- Parent reference updates

### Manual Cleanup:
```javascript
// MongoDB shell
use happy_dreamers

// Find and remove test child
const child = db.children.findOne({ firstName: "Josefina", lastName: "TestFlow" })
if (child) {
  // Remove plans
  db.child_plans.deleteMany({ childId: child._id })
  
  // Remove consultation reports
  db.consultation_reports.deleteMany({ childId: child._id })
  
  // Remove analytics events
  db.events.deleteMany({ childId: child._id })
  
  // Remove child
  db.children.deleteOne({ _id: child._id })
  
  // Update parent
  db.users.updateOne(
    { _id: ObjectId("688ce146d2d5ff9616549d86") },
    { $pull: { children: child._id } }
  )
}
```

## 📈 Performance Metrics

Expected execution times:

| Operation | Time |
|-----------|------|
| MongoDB Connection | < 1s |
| Child Creation | < 500ms |
| Event Generation (138) | 5-10s |
| Plan Generation (each) | 1-2s |
| Consultation Creation | < 1s |
| Full Test Run | 15-30s |

## 🔄 Continuous Testing

### Run Multiple Tests:
```bash
# Run 5 test iterations
for i in {1..5}; do
  echo "Test iteration $i"
  node test-josefina-flow.js
  sleep 2
done
```

### Monitor MongoDB:
```javascript
// MongoDB shell - monitor in real-time
use happy_dreamers
while (true) {
  const count = db.children.countDocuments({ firstName: "Josefina" })
  print(new Date().toISOString() + " - Children: " + count)
  sleep(1000)
}
```

## 📚 Additional Resources

- [Complete Workflow Documentation](./COMPLETE_WORKFLOW.md)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Happy Dreamers API Reference](../docs/API_REFERENCE.md)

## 🤝 Support

For issues or questions:
1. Check troubleshooting section above
2. Review COMPLETE_WORKFLOW.md for details
3. Examine test output logs
4. Verify MongoDB connection and data

## 📝 Notes

- Test data uses realistic patterns based on actual usage
- Survey data includes all 6 steps with complete responses
- Event patterns simulate natural sleep variations
- Plans evolve based on "improvements" in data
- Consultation transcript includes realistic medical dialogue

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Test Coverage**: Complete user journey from registration to Plan 1.1