import { MongoClient, Db } from 'mongodb';

class Database {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<Db> {
    try {
      const uri = process.env.MONGODB_URI || "mongodb+srv://Roha:1234512345@cluster0.ctncent.mongodb.net/SamrtSchedular?retryWrites=true&w=majority";
      
      this.client = new MongoClient(uri);
      await this.client.connect();
      
      this.db = this.client.db('SamrtSchedular');
      
      console.log('âœ… Connected to MongoDB: SamrtSchedular database');
      
      const userCount = await this.db.collection('User').countDocuments();
      const studentCount = await this.db.collection('student').countDocuments();
      const courseCount = await this.db.collection('Course').countDocuments();

      console.log(`ðŸ“Š Data counts - Users: ${userCount}, Students: ${studentCount}, Courses: ${courseCount}`);
      
      return this.db;
    } catch (error) {
      console.error('âŒ Database connection failed:', error);
      throw error;
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not initialized. Call connect() first.');
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('Database connection closed');
    }
  }
}

export default new Database();