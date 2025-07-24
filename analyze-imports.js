const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function analyzeImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const imports = [];
  const usedIdentifiers = new Set();
  const issues = [];

  // Collect all imports
  function visitImports(node) {
    if (ts.isImportDeclaration(node)) {
      const importClause = node.importClause;
      const moduleSpecifier = node.moduleSpecifier.text;
      const line = sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1;

      if (importClause) {
        const importedNames = [];
        
        // Default import
        if (importClause.name) {
          importedNames.push(importClause.name.text);
        }
        
        // Named imports
        if (importClause.namedBindings) {
          if (ts.isNamespaceImport(importClause.namedBindings)) {
            importedNames.push(importClause.namedBindings.name.text);
          } else if (ts.isNamedImports(importClause.namedBindings)) {
            importClause.namedBindings.elements.forEach(element => {
              importedNames.push(element.propertyName ? element.propertyName.text : element.name.text);
            });
          }
        }

        imports.push({
          line,
          moduleSpecifier,
          importedNames,
          fullText: node.getText()
        });
      }
    }

    ts.forEachChild(node, visitImports);
  }

  // Collect all used identifiers
  function collectUsedIdentifiers(node) {
    if (ts.isIdentifier(node) && !ts.isImportDeclaration(node.parent)) {
      usedIdentifiers.add(node.text);
    }
    ts.forEachChild(node, collectUsedIdentifiers);
  }

  visitImports(sourceFile);
  collectUsedIdentifiers(sourceFile);

  // Check for unused imports
  imports.forEach(imp => {
    const unusedImports = imp.importedNames.filter(name => !usedIdentifiers.has(name));
    if (unusedImports.length > 0) {
      issues.push({
        file: filePath,
        line: imp.line,
        type: 'unused',
        imports: unusedImports,
        module: imp.moduleSpecifier
      });
    }
  });

  // Check for duplicate imports
  const moduleMap = new Map();
  imports.forEach(imp => {
    if (moduleMap.has(imp.moduleSpecifier)) {
      issues.push({
        file: filePath,
        line: imp.line,
        type: 'duplicate',
        module: imp.moduleSpecifier,
        firstLine: moduleMap.get(imp.moduleSpecifier)
      });
    } else {
      moduleMap.set(imp.moduleSpecifier, imp.line);
    }
  });

  return issues;
}

// Main execution
const directories = ['app', 'components', 'lib', 'utils'];
const baseDir = '/Users/rogelioguz/Documents/Code House/happy_dreamers_v0';

directories.forEach(dir => {
  const fullPath = path.join(baseDir, dir);
  if (fs.existsSync(fullPath)) {
    walkDir(fullPath, (filePath) => {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        try {
          const issues = analyzeImports(filePath);
          if (issues.length > 0) {
            console.log(`\n### ${filePath.replace(baseDir, '')}`);
            issues.forEach(issue => {
              if (issue.type === 'unused') {
                console.log(`Line ${issue.line}: Unused imports from '${issue.module}': ${issue.imports.join(', ')}`);
              } else if (issue.type === 'duplicate') {
                console.log(`Line ${issue.line}: Duplicate import of '${issue.module}' (first imported at line ${issue.firstLine})`);
              }
            });
          }
        } catch (err) {
          console.error(`Error analyzing ${filePath}: ${err.message}`);
        }
      }
    });
  }
});

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else {
      callback(filePath);
    }
  });
}