import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MESSAGES_DIR = path.join(__dirname, '../messages');
const SOURCE_DIR = path.join(__dirname, '../src');

const AR_PATH = path.join(MESSAGES_DIR, 'ar.json');
const EN_PATH = path.join(MESSAGES_DIR, 'en.json');

const BLACKLIST = [
  'طلبات المطبخ',
  'TODO',
  'FIXME',
  '[PLACEHOLDER]',
  'Kitchen Request'
];

/**
 * i18n Audit Tool - Base Infrastructure
 */
class I18nAudit {
  constructor() {
    this.errors = [];
    this.summary = {
      total_keys: 0,
      missing_keys: 0,
      hardcoded_strings: 0,
      placeholders: 0,
      invalid_names: 0
    };
  }

  logError(type, file, line, message) {
    this.errors.push({ type, file, line, message });
    console.error(`[${type}] ${file}${line ? `:${line}` : ''} - ${message}`);
  }

  async run() {
    console.log('🚀 Starting i18n Audit...');

    try {
      const ar = JSON.parse(fs.readFileSync(AR_PATH, 'utf-8'));
      const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));

      // Phase 3: Structural Parity
      console.log('🔍 Checking Structural Parity...');
      this.checkParity(ar, en);

      // Phase 4: Raw Text Detection
      console.log('🔍 Scanning Source Files for Hardcoded Strings...');
      await this.scanSourceFiles(SOURCE_DIR);

      // Phase 5: Placeholder & Blacklist Check
      console.log('🔍 Checking for Blacklisted Placeholders...');
      this.checkPlaceholders(ar, 'ar.json');
      this.checkPlaceholders(en, 'en.json');

      // Phase 6: Snake Case Enforcement
      console.log('🔍 Enforcing snake_case naming convention...');
      this.enforceSnakeCase(ar, 'ar.json');
      this.enforceSnakeCase(en, 'en.json');

      this.report();
    } catch (err) {
      console.error('❌ Audit failed with critical error:', err.message);
      process.exit(1);
    }
  }

  checkParity(ar, en, path = '') {
    const arKeys = Object.keys(ar);
    const enKeys = Object.keys(en);

    const allKeys = new Set([...arKeys, ...enKeys]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;

      if (!arKeys.includes(key)) {
        this.logError('MISSING_KEY', 'ar.json', null, `Key "${currentPath}" exists in en.json but is missing in ar.json`);
        this.summary.missing_keys++;
      } else if (!enKeys.includes(key)) {
        this.logError('MISSING_KEY', 'en.json', null, `Key "${currentPath}" exists in ar.json but is missing in en.json`);
        this.summary.missing_keys++;
      } else {
        const arValue = ar[key];
        const enValue = en[key];

        if (typeof arValue !== typeof enValue) {
          this.logError('TYPE_MISMATCH', 'messages', null, `Type mismatch for key "${currentPath}": ar is ${typeof arValue}, en is ${typeof enValue}`);
        } else if (typeof arValue === 'object' && arValue !== null) {
          this.checkParity(arValue, enValue, currentPath);
        } else {
          this.summary.total_keys++;
          if (!arValue || arValue.trim() === '') {
            this.logError('EMPTY_VALUE', 'ar.json', null, `Key "${currentPath}" has an empty value in ar.json`);
          }
          if (!enValue || enValue.trim() === '') {
            this.logError('EMPTY_VALUE', 'en.json', null, `Key "${currentPath}" has an empty value in en.json`);
          }
          
          // Check for unauthorized identical strings (SC-001)
          if (arValue === enValue && arValue.length > 3 && !['SAR', 'USD', 'EA', 'KG', 'L'].includes(arValue.toUpperCase())) {
            // Only flag if it doesn't look like an acronym or technical value
            this.logError('IDENTICAL_VALUE', 'messages', null, `Key "${currentPath}" has identical values in AR and EN: "${arValue}"`);
          }
        }
      }
    }
  }

  getFiles(dir, exts) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.next')) {
          results = results.concat(this.getFiles(file, exts));
        }
      } else {
        if (exts.includes(path.extname(file))) {
          results.push(file);
        }
      }
    });
    return results;
  }

  async scanSourceFiles(dir) {
    const files = this.getFiles(dir, ['.tsx', '.jsx']);
    
    // Regex for text in JSX: >Text<
    const jsxTextRegex = />\s*([^<>{}\s][^<>{}]*)\s*</g;
    // Regex for props: label="Text", etc.
    const propRegex = /\b(label|placeholder|title|description|alt|aria-label|header)="([^"{}\n]+)"/g;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const relativePath = path.relative(SOURCE_DIR, file);

      lines.forEach((line, index) => {
        // Skip imports, comments, and console logs
        // Skip imports, comments, console logs, and type definitions
        if (
          line.trim().startsWith('import') || 
          line.trim().startsWith('//') || 
          line.trim().startsWith('*') || 
          line.includes('console.log') ||
          line.includes('Promise<') ||
          line.includes('type ') ||
          line.includes('interface ')
        ) return;
        
        // Skip lines with explicit ignore
        if (line.includes('// i18n-ignore') || line.includes('// i18n-dynamic')) return;

        let match;
        
        // Check JSX text
        while ((match = jsxTextRegex.exec(line)) !== null) {
          const text = match[1].trim();
          if (this.isHardcodedText(text)) {
            this.logError('HARDCODED_TEXT', relativePath, index + 1, `Found raw text in JSX: "${text}"`);
            this.summary.hardcoded_strings++;
          }
        }

        // Check Props
        while ((match = propRegex.exec(line)) !== null) {
          const text = match[2].trim();
          if (this.isHardcodedText(text)) {
            this.logError('HARDCODED_TEXT', relativePath, index + 1, `Found raw text in prop: "${text}"`);
            this.summary.hardcoded_strings++;
          }
        }
      });
    }
  }

  isHardcodedText(text) {
    // Ignore numbers, punctuation, icons, and dynamic-looking strings
    if (!text || text.length < 2) return false;
    if (/^[0-9\s.,:\-/_+()]+$/.test(text)) return false;
    if (text.includes('{') || text.includes('}')) return false;
    if (['SAR', 'USD', 'KG', 'L', 'EA'].includes(text.toUpperCase())) return false;
    // Ignore common technical strings
    if (['lg', 'md', 'sm', 'xl', '2xl', 'outline', 'solid', 'ghost'].includes(text)) return false;
    return true;
  }

  checkPlaceholders(obj, filename, path = '') {
    for (const key in obj) {
      const currentPath = path ? `${path}.${key}` : key;
      const value = obj[key];

      if (typeof value === 'object' && value !== null) {
        this.checkPlaceholders(value, filename, currentPath);
      } else if (typeof value === 'string') {
        for (const blacklisted of BLACKLIST) {
          if (value.includes(blacklisted)) {
            this.logError('BLACKLISTED_VALUE', filename, null, `Key "${currentPath}" contains blacklisted term "${blacklisted}": "${value}"`);
            this.summary.placeholders++;
          }
        }
      }
    }
  }

  enforceSnakeCase(obj, filename, path = '') {
    for (const key in obj) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Enforce snake_case for keys
      if (!/^[a-z0-9_]+$/.test(key)) {
        this.logError('INVALID_KEY_NAME', filename, null, `Key "${currentPath}" must be in snake_case`);
        this.summary.invalid_names++;
      }

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.enforceSnakeCase(obj[key], filename, currentPath);
      }
    }
  }

  report() {
    console.log('\n--- Audit Report ---');
    console.log(`Total Keys: ${this.summary.total_keys}`);
    console.log(`Missing Keys: ${this.summary.missing_keys}`);
    console.log(`Hardcoded Strings: ${this.summary.hardcoded_strings}`);
    console.log(`Placeholder Violations: ${this.summary.placeholders}`);
    console.log(`Invalid Key Names: ${this.summary.invalid_names}`);
    
    const totalIssues = this.errors.length;
    console.log(`\nStatus: ${totalIssues === 0 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Total Issues: ${totalIssues}`);
    
    if (totalIssues > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

const auditor = new I18nAudit();
auditor.run();
