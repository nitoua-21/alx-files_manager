import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.database = database;

    this.client.connect((err) => {
      if (err) {
        console.error(`MongoDB connection error: ${err}`);
      } else {
        console.log('Connected to MongoDB');
      }
    });
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const db = this.client.db(this.database);
    return db.collection('users').countDocuments();
  }

  async nbFiles() {
    const db = this.client.db(this.database);
    return db.collection('files').countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
