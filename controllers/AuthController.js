import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    // Get Authorization header
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Decode Base64 credentials
    const credentials = Buffer.from(
      authHeader.split(' ')[1], 
      'base64'
    ).toString('utf-8');

    // Split email and password
    const [email, password] = credentials.split(':');

    // Validate credentials
    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Hash password
    const hashedPassword = sha1(password);

    // Find user in database
    const db = dbClient.client.db();
    const user = await db.collection('users').findOne({ 
      email, 
      password: hashedPassword 
    });

    // If no user found, return unauthorized
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate token
    const token = uuidv4();

    // Store token in Redis with user ID for 24 hours
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 24 * 60 * 60);

    // Return token
    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    // Get token from headers
    const token = req.headers['x-token'];

    // If no token, return unauthorized
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create Redis key
    const key = `auth_${token}`;

    // Check if token exists in Redis
    const userId = await redisClient.get(key);

    // If no user found, return unauthorized
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete token from Redis
    await redisClient.del(key);

    // Return success status
    return res.status(204).end();
  }
}

export default AuthController;
