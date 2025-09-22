#!/usr/bin/env node
// Script para reemplazar automáticamente console.log con logger
// Este script busca y reemplaza console statements con el servicio de logger

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Patrones de reemplazo
const replacements = [
  {
    pattern: /console\.log\((.*?)\);?$/gm,
    replacement: 'logger.info($1);'
  },
  {
    pattern: /console\.error\((.*?)\);?$/gm,
    replacement: 'logger.error($1);'
  },
  {
    pattern: /console\.warn\((.*?)\);?$/gm,
    replacement: 'logger.warn($1);'
  },
  {
    pattern: /console\.debug\((.*?)\);?$/gm,
    replacement: 'logger.debug($1);'
  }
];

// Archivos y directorios a excluir
const excludePatterns = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'public',
  'scripts',
  '.eslintrc.json',
  'lib/logger.ts', // No modificar el archivo del logger
];

// Extensiones de archivo a procesar
const fileExtensions = ['.ts', '.tsx', '.js', '.jsx'];

// Contador de cambios
let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;

// Función para verificar si un archivo/directorio debe ser excluido
function shouldExclude(filePath) {
  return excludePatterns.some(pattern => filePath.includes(pattern));
}

// Función para verificar si el archivo ya importa el logger
function hasLoggerImport(content) {
  return content.includes('import { logger') || 
         content.includes('import { createLogger') ||
         content.includes('from "@/lib/logger"');
}

// Función para agregar el import del logger
function addLoggerImport(content, filePath) {
  // Determinar qué tipo de logger usar basado en el contexto
  const isAPI = filePath.includes('/api/');
  const componentName = path.basename(filePath, path.extname(filePath));
  
  let importStatement;
  if (isAPI) {
    const apiPath = filePath.split('/api/')[1];
    const context = `API:${apiPath.replace(/\//g, ':').replace(/\.ts$/, '')}`;
    importStatement = `import { createLogger } from "@/lib/logger"\n\nconst logger = createLogger("${context}")\n`;
  } else {
    importStatement = `import { createLogger } from "@/lib/logger"\n\nconst logger = createLogger("${componentName}")\n`;
  }

  // Buscar dónde insertar el import
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Buscar después de los comentarios iniciales
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('//') && lines[i].trim() !== '') {
      insertIndex = i;
      break;
    }
  }
  
  // Si hay imports existentes, insertar después del último import
  const lastImportIndex = lines.findLastIndex(line => line.startsWith('import '));
  if (lastImportIndex !== -1) {
    insertIndex = lastImportIndex + 1;
  }
  
  lines.splice(insertIndex, 0, '', importStatement);
  return lines.join('\n');
}

// Función para procesar un archivo
function processFile(filePath) {
  if (shouldExclude(filePath)) return;
  
  const ext = path.extname(filePath);
  if (!fileExtensions.includes(ext)) return;
  
  totalFiles++;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Verificar si hay console statements
    const hasConsoleStatements = replacements.some(({ pattern }) => pattern.test(content));
    
    if (!hasConsoleStatements) return;
    
    console.log(`${colors.yellow}Procesando:${colors.reset} ${filePath}`);
    
    // Agregar import del logger si no existe
    if (!hasLoggerImport(content)) {
      content = addLoggerImport(content, filePath);
      console.log(`  ${colors.blue}+ Agregado import del logger${colors.reset}`);
    }
    
    // Realizar reemplazos
    let replacementCount = 0;
    replacements.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        replacementCount += matches.length;
        content = content.replace(pattern, replacement);
      }
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedFiles++;
      totalReplacements += replacementCount;
      console.log(`  ${colors.green}✓ ${replacementCount} console statements reemplazados${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}Error procesando ${filePath}:${colors.reset}`, error.message);
  }
}

// Función para recorrer directorios recursivamente
function processDirectory(dirPath) {
  if (shouldExclude(dirPath)) return;
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  entries.forEach(entry => {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile()) {
      processFile(fullPath);
    }
  });
}

// Función principal
function main() {
  console.log(`${colors.blue}=== Reemplazo de console.log con logger ===${colors.reset}\n`);
  
  const projectRoot = path.resolve(__dirname, '..');
  
  // Procesar directorios principales
  const dirsToProcess = ['app', 'components', 'lib', 'hooks', 'context'];
  
  dirsToProcess.forEach(dir => {
    const dirPath = path.join(projectRoot, dir);
    if (fs.existsSync(dirPath)) {
      console.log(`${colors.blue}Procesando directorio: ${dir}${colors.reset}`);
      processDirectory(dirPath);
    }
  });
  
  // Resumen
  console.log(`\n${colors.green}=== Resumen ===${colors.reset}`);
  console.log(`Total de archivos analizados: ${totalFiles}`);
  console.log(`Archivos modificados: ${modifiedFiles}`);
  console.log(`Total de reemplazos: ${totalReplacements}`);
  
  if (modifiedFiles > 0) {
    console.log(`\n${colors.yellow}Recuerda ejecutar 'npm run lint:fix' para corregir el formato${colors.reset}`);
  }
}

// Ejecutar el script
main();