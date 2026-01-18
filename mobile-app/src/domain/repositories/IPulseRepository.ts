import { Pulse } from '../entities/Pulse';

export interface IPulseRepository {
  save(pulse: Pulse): Promise<void>;
  findByUserId(userId: string, limit: number): Promise<Pulse[]>;
  findNearby(latitude: number, longitude: number, radius: number): Promise<Pulse[]>;
  delete(pulseId: string): Promise<void>;
}