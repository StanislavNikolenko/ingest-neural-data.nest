import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('neural_spikes')
export class NeuralSpike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  neuronId: string;

  @Column('float')
  spikeTime: number;

  @Column()
  sourceFile: string;

  @CreateDateColumn()
  createdAt: Date;
}