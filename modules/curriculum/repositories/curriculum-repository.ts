export interface TopicProgress {
  id: string;
  userId: string;
  topicId: string;
  masteryScore: number;
  lastPracticedAt: Date | null;
}

export interface CurriculumRepository {
  getTopicProgress(userId: string, topicId: string): Promise<TopicProgress | null>;
  upsertTopicProgress(userId: string, topicId: string, masteryScore: number): Promise<void>;
  getTopicProgressByUser(userId: string): Promise<TopicProgress[]>;
}
