import * as fs from 'fs';
import * as path from 'path';
import { Script } from '@starship-ci/types';

export class ScriptManager {
  private scriptsPath: string;

  constructor(scriptsPath?: string) {
    // Default to the scripts directory in the generator package
    this.scriptsPath = scriptsPath || path.join(__dirname, '../scripts');
  }

  /**
   * Load a script from the filesystem
   */
  loadScript(scriptName: string): string {
    const scriptPath = path.join(this.scriptsPath, scriptName);
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script not found: ${scriptPath}`);
    }

    return fs.readFileSync(scriptPath, 'utf8');
  }

  /**
   * Get script content based on Script config
   */
  getScriptContent(scriptConfig: Script): string {
    if (scriptConfig.data) {
      // Use inline script data
      return scriptConfig.data;
    }

    if (scriptConfig.file) {
      // Load from file
      return this.loadScript(scriptConfig.file);
    }

    throw new Error('Script must have either file or data property');
  }

  /**
   * Get all available script files
   */
  getAvailableScripts(): string[] {
    if (!fs.existsSync(this.scriptsPath)) {
      return [];
    }

    return fs.readdirSync(this.scriptsPath)
      .filter(file => file.endsWith('.sh'))
      .sort();
  }

  /**
   * Check if a script file exists
   */
  scriptExists(scriptName: string): boolean {
    const scriptPath = path.join(this.scriptsPath, scriptName);
    return fs.existsSync(scriptPath);
  }

  /**
   * Get the full path to a script
   */
  getScriptPath(scriptName: string): string {
    return path.join(this.scriptsPath, scriptName);
  }
} 