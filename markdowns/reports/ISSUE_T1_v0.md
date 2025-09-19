## Branch T1

He revisado CODEX_AUDIT_HD.md y CODEX_ISSUES.md y preparé la rama T1 para unificar la capa de datos usando 
  Mongoose. A continuación detallo lo hecho.                                                                 
                                                                                                                    
  - Creada T1 para el Ticket #1 (unificación de la data layer en Mongoose).                                  
                                                                                                             
  Capa de Datos Unificada                                                                                    
                                                                                                             
  - Reescribí lib/mongoose.ts para que sea el único punto de conexión:                                       
      - Exporta default dbConnect() (singleton Mongoose).                                                    
      - Agrega utilidades: getDb() retorna mongoose.connection.db y getMongoClientPromise() retorna el       
  MongoClient subyacente (para compatibilidad con adaptadores o APIs que requieren el driver).               
      - Limpia flags deprecadas de Mongoose v8 (eliminados useNewUrlParser, useUnifiedTopology, etc.).       
  - Mantengo compatibilidad con código que requería driver nativo sin mantener dos conexiones.               
                                                                                                             
  Rutas y librerías actualizadas para usar @/lib/mongoose                                                    
                                                                                                             
  - Profesional reports (hotfix crítico):                                                                    
      - app/api/reports/professional/route.ts: ahora import dbConnect from "@/lib/mongoose" y usa await      
  dbConnect().                                                                                               
  - NextAuth + Auth helpers:                                                                                 
      - lib/auth.ts: usa MongoDBAdapter(getMongoClientPromise()) y consultas con getDb().                    
      - lib/auth-helpers.ts: reemplaza connectToDatabase()/clientPromise por getDb().                        
  - APIs principales que usaban @/lib/mongodb:                                                               
      - app/api/children/route.ts (CRUD niños) → getDb().                                                    
      - app/api/admin/users/route.ts → getDb().                                                              
      - app/api/admin/reports/route.ts → getDb().                                                            
      - app/api/chat/route.ts → getDb().                                                                     
      - app/api/events/route.ts (CRUD eventos) → getDb().                                                    
      - app/api/children/events/route.ts → getDb().                                                          
      - app/api/children/v2/route.ts → getDb().                                                              
      - app/api/users/search/route.ts → getDb().                                                             
      - app/api/user/profile/route.ts, app/api/user/password/route.ts, app/api/user/change-password/route.ts 
  → getDb().                                                                                                 
      - app/api/survey/route.ts → getDb().                                                                   
      - app/api/sleep-analysis/insights/route.ts → getDb().                                                  
      - app/api/transcripts/process/route.ts → getDb().                                                      
      - app/api/consultas/analyze/route.ts, app/api/consultas/history/route.ts, app/api/consultas/plans/     
  route.ts → getDb().                                                                                        
      - Debug endpoints: app/api/debug/check-child-events/route.ts, clean-events/route.ts, delete-event/     
  route.ts → getDb().                                                                                        
      - Integraciones:                                                                                       
      - Zoom: `lib/integrations/zoom.ts`, `app/api/integrations/zoom/poller/route.ts`, `app/api/integrations/
  zoom/webhook/route.ts` → `getDb()`.                                                                        
      - Google Drive: `app/api/integrations/google/drive/poller/route.ts`, `webhook/route.ts` → `getDb()`.   
  - RAG:                                                                                                     
      - `lib/rag/vector-store-mongodb.ts` ahora usa `getDb()`.                                               
      - `lib/rag/plan-context-builder.ts` usa `getDb()`.                                                     
      - `app/api/rag/chat/route.ts` y `route-optimized.ts` importan `@/lib/mongoose` (directo/indirecto).    
                                                                                                             
  Búsqueda final de referencias                                                                              
                                                                                                             
  - Eliminadas todas las referencias a @/lib/mongodb en .ts/.tsx.                                            
  - Punto único de conexión: @/lib/mongoose para Mongoose y para acceso Db/MongoClient cuando se requiera    
  nativo.                                                                                                    
                                                                                                             
  Notas y siguientes pasos sugeridos                                                                         
                                                                                                             
  - Puedo eliminar lib/mongodb.ts en esta misma rama si quieres cerrar el círculo y evitar regresiones.      
  - Ejecutar el build/test local para detectar cualquier typo de import o pequeñas incompatibilidades de     
  tipos.                                                                                                     
  - Si NextAuth u otros paquetes esperan un Promise<MongoClient>, estamos entregando el cliente subyacente de
  Mongoose con getMongoClientPromise(). Esto evita mantener dos conexiones.                                  
  - Quedan alineamientos relacionados al ticket que podemos abordar en T2/T3:                                
      - Ajustar next.config.mjs para reactivar validaciones en CI.                                           
      - Limpieza de dependencias no usadas.                                                                  
      - Elegir y unificar package manager y lockfile.                                                        
      - Remover archivos .backup y datasets sensibles.