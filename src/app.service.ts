import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const SCRIPT_PATH = process.env.SCRIPT_PATH || './extract-data.py';

@Injectable()
export class AppService {
  async ingest(): Promise<string> {
    const result = await this.runPythonScript();
    return result;
  }

  async runPythonScript(): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(`${PYTHON_PATH} ${SCRIPT_PATH}`);
      
      if (stderr) {
        console.error('Python script error:', stderr);
        throw new Error('Python script execution failed');
      }
      console.log('stdout:', stdout);
      return stdout;
    } catch (error) {
      console.error('Failed to execute Python script:', error);
      throw error;
    }
  }
}
