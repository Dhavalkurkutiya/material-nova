const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, 'src');
const palettesDir = path.join(srcDir, 'palettes');
const buildThemesDir = path.join(__dirname, 'build', 'themes');

// Helper to ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

ensureDir(buildThemesDir);

console.log('Starting theme build...');

// Load base template
const baseTemplatePath = path.join(srcDir, 'base-template.json');
if (!fs.existsSync(baseTemplatePath)) {
  console.error(`Error: Base template not found at ${baseTemplatePath}`);
  process.exit(1);
}
const baseTemplate = JSON.parse(fs.readFileSync(baseTemplatePath, 'utf8'));

// Recursive compiler function
function compile(template, palette) {
  if (typeof template === 'string') {
    if (template.startsWith('{') && template.endsWith('}')) {
      const key = template.slice(1, -1);
      if (palette.hasOwnProperty(key)) {
        return palette[key];
      } else {
        console.warn(`Warning: Palette is missing key "${key}"`);
      }
    }
    return template;
  }

  if (Array.isArray(template)) {
    return template.map(item => compile(item, palette));
  }

  if (template !== null && typeof template === 'object') {
    const result = {};
    for (const key of Object.keys(template)) {
      result[key] = compile(template[key], palette);
    }
    return result;
  }

  return template;
}

// Get all palette files
const paletteFiles = fs.readdirSync(palettesDir).filter(f => f.endsWith('.json'));

let compiledCount = 0;

paletteFiles.forEach(file => {
  const palettePath = path.join(palettesDir, file);
  const palette = JSON.parse(fs.readFileSync(palettePath, 'utf8'));

  // Compile the theme
  const compiledTheme = compile(baseTemplate, palette);

  // Format with 4 spaces to match the VS Code theme style exactly
  const outputJson = JSON.stringify(compiledTheme, null, 4);

  // Write to build/themes/
  const buildOutPath = path.join(buildThemesDir, file);
  fs.writeFileSync(buildOutPath, outputJson, 'utf8');

  console.log(`Compiled: ${file}`);
  compiledCount++;
});

console.log(`\nSuccessfully compiled ${compiledCount} themes!`);

// Package the extension as .vsix
console.log('\nPackaging VSIX extension...');
try {
  const output = execSync('npx @vscode/vsce package --no-dependencies', {
    cwd: __dirname,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log(output.trim());
  console.log('VSIX package created successfully!');
} catch (err) {
  console.error('Error creating VSIX package:', err.stderr || err.message);
  process.exit(1);
}
