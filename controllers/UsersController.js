import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const userCollection = dbClient.client.db(dbClient.database).collection('users');

    const existingUser = await userCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);
    const result = await userCollection.insertOne({ email, password: hashedPassword });

    return res.status(201).json({ id: result.insertedId, email });
  }
}

export default UsersController;
