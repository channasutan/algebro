export interface AiTutorRepository {
  getHintUsage(userId: string, problemId: string): Promise<number>;
  incrementHintUsage(userId: string, problemId: string): Promise<void>;
}
