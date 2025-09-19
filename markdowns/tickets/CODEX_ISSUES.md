## LISTADO DE TICKETS POR RESOLVER

Aquí tienes el listado priorizado, de mayor a menor criticidad, para empezar una rama de hardening/mejoras:

  1. Unificar capa de datos (bloqueador crítico)

  - Decidir Mongoose vs Driver Nativo.
  - Si Mongoose: usar lib/mongoose.ts en todos los endpoints, corregir app/api/reports/professional/route.ts 
  (importar @/lib/mongoose y await dbConnect()), eliminar lib/mongodb.ts y actualizar opciones de Mongoose v8
  (quitar flags deprecados).                                                                                 
  - Si Driver Nativo: migrar modelos/consultas Mongoose a repositorios nativos y eliminar models/* y lib/    
  mongoose.ts.                                                                                               
  - Alinear nombres de import (no usar dbConnect para el driver nativo; usar connectToDatabase/              
  clientPromise).                                                                                            
                                                                                                             
  2. Rehabilitar validaciones de build y CI                                                                  
                                                                                                             
  - next.config.mjs: eslint.ignoreDuringBuilds=false, typescript.ignoreBuildErrors=false.                    
  - Agregar workflow CI: npm run lint:strict, npm run type-check, npm run test:ci, next build.               
  - Opcional (muy recomendado): precommit con husky + lint-staged.                                           
                                                                                                             
  3. Secretos y PII fuera del repo                                                                           
                                                                                                             
  - Verificar que .env no esté versionado; rotar claves si hubo exposición.                                  
  - Remover bernardo prueba happy dreamers.csv y cualquier dataset con PII; actualizar .gitignore y, si      
  procede, purgar del historial.                                                                             
                                                                                                             
  4. Unificar package manager y lockfile                                                                     
                                                                                                             
  - Elegir pnpm (recomendado) o npm y eliminar el lockfile del otro (package-lock.json o pnpm-lock.yaml).    
  - Documentar en README e instalar dependencias consistentemente.                                           
                                                                                                             
  5. Limpieza de dependencias no usadas/duplicadas                                                           
                                                                                                             
  - Remover: bcrypt (se usa bcryptjs), @types/mongoose, multer + @types/multer (si no se usa), mammoth,      
  faiss-node, kerberos, socks, mongodb-client-encryption, @mongodb-js/zstd, gcp-metadata (validar antes).    
  - Ejecutar prune/dedupe y ajustar imports.                                                                 
                                                                                                             
  6. Consolidar colecciones de “planes” en la base                                                           
                                                                                                             
  - Unificar childplans, child_plans, sleepPlans en una colección canónica (p.ej., child_plans) con esquema  
  claro.                                                                                                     
  - Script de migración (rename/copy/backfill) + verificación de conteo y consistencia.                      
  - Actualizar código para usar la colección única.                                                          
                                                                                                             
  7. Crear índices según patrones de consulta                                                                
                                                                                                             
  - events: {childId:1,startTime:-1} (+ variantes por userId/type).                                          
  - children: {parentId:1} y por sharedWith.                                                                 
  - user_child_access: único {userId:1,childId:1} + secundarios.                                             
  - consultation_reports: por childId, professionalId+status+updatedAt, userId+privacy.parentCanView.        
  - consultation_transcripts: por childId, reportId.                                                         
  - documents_metadata: driveFileId único, y por userId/childId+createdAt.                                   
  - notification_logs: por userId+createdAt y evaluar TTL.                                                   
  - surveys: por childId+createdAt.                                                                          
  - Versionar un scripts/create-indexes.ts y documentar en docs/DATABASE.md.                                 
                                                                                                             
  8. Estandarizar nombres de colecciones (consistencia)                                                      
                                                                                                             
  - Adoptar snake_case: userChildAccess → user_child_access, pendingInvitations → pending_invitations,       
  notificationlogs → notification_logs, etc.                                                                 
  - Sincronizar código y migrar con renameCollection con ventana de mantenimiento.                           
                                                                                                             
  9. Normalizar tipos de IDs y fechas en DB y tipos TS                                                       
                                                                                                             
  - Usar ObjectId para *_Id y Date/ISO para fechas.                                                          
  - Migrar documentos con strings a ObjectId y normalizar fechas.                                            
  - Validar en bordes de API con Zod.                                                                        
                                                                                                             
  10. Eliminar/mover archivos de respaldo del árbol de código                                                
                                                                                                             
  - components/calendar/MonthLineChart.tsx.backup                                                            
  - app/dashboard/calendar/page.tsx.backup                                                                   
  - Mover a archive/ o eliminar si ya no hacen falta.                                                        
                                                                                                             
  11. Aplicar validación Zod consistente en todas las rutas                                                  
                                                                                                             
  - Usar lib/api-middleware.ts en todos los endpoints (body, query, params).                                 
  - Crear/especificar esquemas por endpoint y centralizar manejo de errores.                                 
                                                                                                             
  12. Corregir problemas de codificación (UTF-8) y texto                                                     
                                                                                                             
  - Revisar archivos con mojibake en models/*, components/*, lib/event-types.ts, etc.                        
  - Forzar UTF-8 y añadir .editorconfig si no existe.                                                        
                                                                                                             
  13. Alinear nombres y lenguaje en el código                                                                
                                                                                                             
  - Establecer guía: código en inglés, labels/UX en español (o viceversa) y aplicar de forma consistente.    
  - Añadir CONTRIBUTING.md/CODING_STANDARDS.md con casing, nombres de archivos/carpetas, patrón de imports.  
                                                                                                             
  14. Ajustes de seguridad y headers                                                                         
                                                                                                             
  - Validar coherencia entre next.config.mjs y vercel.json en headers/Policies.                              
  - Añadir CSP si es viable y documentar excepciones.                                                        
                                                                                                             
  15. Vector/Atlas Search y definición de índices de búsqueda                                                
                                                                                                             
  - Confirmar índice de búsqueda vectorial para vector_documents en el cluster.                              
  - Versionar JSON de índice (Atlas Search/Vector) en infra/ o docs/ y automatizar su creación.              
                                                                                                             
  16. Simplificar webpack/experimental innecesarios                                                          
                                                                                                             
  - Revisar alias moment → date-fns (no hay moment en el repo); eliminar si no aporta.                       
  - Mantener optimizePackageImports sólo para paquetes realmente usados.                                     
                                                                                                             
  17. Revisión de tipos de librerías                                                                         
                                                                                                             
  - @types/jspdf puede ser redundante con jspdf@^3; verificar y limpiar si innecesario.                      
                                                                                                             
  18. Scripts de mantenimiento y pruebas                                                                     
                                                                                                             
  - Añadir scripts de seeds/fixtures para tests de integración de endpoints críticos (auth, children, events,
  reports).                                                                                                  
  - Documentar cómo correrlos y limpiar datos.  