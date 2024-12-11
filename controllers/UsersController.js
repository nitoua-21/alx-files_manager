import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    // Validate password
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    // Check if user already exists
    const db = dbClient.client.db();
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Hash password
    const hashedPassword = sha1(password);

    // Create new user
    const newUser = {
      email,
      password: hashedPassword
    };

    // Insert user into database
    const result = await db.collection('users').insertOne(newUser);

    // Return user info
    return res.status(201).json({
      id: result.insertedId,
      email
    });
  }

  static async getMe(req, res) {
    // Get token from headers
    const token = req.headers['x-token'];

    // If no token, return unauthorized
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve user ID from Redis
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    // If no user found, return unauthorized
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Convert string userId to MongoDB ObjectId
    const { ObjectId } = require('mongodb');
    const db = dbClient.client.db();
    
    try {
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

      // If user not found, return unauthorized
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Return user info
      return res.status(200).json({ id: user._id, email: user.email });
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
}

export default UsersController;
