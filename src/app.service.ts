import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { NeuralSpike } from './neural-spike.entity';

const execAsync = promisify(exec);

const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const SCRIPT_PATH = process.env.SCRIPT_PATH || './extract-data.py';
const PROCESSED_NEURAL_DATA_DIR = process.env.PROCESSED_NEURAL_DATA_DIR || 'processed_neural_data';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(NeuralSpike)
    private neuralSpikeRepository: Repository<NeuralSpike>,
  ) {}

  async ingest(): Promise<string> {
    const result = await this.runPythonScript();
    await this.ingestNeuralDataToDatabase();
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

  async ingestNeuralDataToDatabase(): Promise<void> {
    try {
      if (!fs.existsSync(PROCESSED_NEURAL_DATA_DIR)) {
        console.log(`Directory ${PROCESSED_NEURAL_DATA_DIR} does not exist. No data to ingest.`);
        return;
      }

      const jsonFiles = fs.readdirSync(PROCESSED_NEURAL_DATA_DIR)
        .filter(file => file.endsWith('.json'));

      if (jsonFiles.length === 0) {
        console.log('No JSON files found in processed data directory.');
        return;
      }

      let totalSpikesIngested = 0;

      for (const jsonFile of jsonFiles) {
        const filePath = path.join(PROCESSED_NEURAL_DATA_DIR, jsonFile);
        
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const spikeData = JSON.parse(fileContent);

          if (!Array.isArray(spikeData)) {
            console.warn(`File ${jsonFile} does not contain an array of spike data. Skipping.`);
            continue;
          }

          const neuralSpikes = spikeData.map(spike => {
            const neuralSpike = new NeuralSpike();
            neuralSpike.neuronId = spike.neuronId;
            neuralSpike.spikeTime = spike.spikeTime;
            neuralSpike.sourceFile = jsonFile;
            return neuralSpike;
          });

          await this.neuralSpikeRepository.save(neuralSpikes);
          
          totalSpikesIngested += neuralSpikes.length;
          console.log(`Ingested ${neuralSpikes.length} spikes from ${jsonFile}`);
          
        } catch (error) {
          console.error(`Error processing file ${jsonFile}:`, error);
        }
      }

      console.log(`Total spikes ingested: ${totalSpikesIngested}`);
      
    } catch (error) {
      console.error('Error ingesting neural data to database:', error);
      throw error;
    }
  }
}
