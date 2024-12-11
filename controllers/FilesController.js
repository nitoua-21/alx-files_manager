import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { ObjectId } from "mongodb";
import path from "path";
import dbClient from "../utils/db";
import redisClient from "../utils/redis";

class FilesController {
  static async postUpload(req, res) {
    const token = req.header("X-Token");
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await dbClient.client
      .db(dbClient.database)
      .collection("users")
      .findOne({ _id: userId });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, type, isPublic = false, parentId = 0, data } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing name" });
    }

    if (!type || !["folder", "file", "image"].includes(type)) {
      return res.status(400).json({ error: "Missing type" });
    }

    if (type !== "folder" && !data) {
      return res.status(400).json({ error: "Missing data" });
    }

    const filesCollection = dbClient.client
      .db(dbClient.database)
      .collection("files");

    if (parentId !== 0) {
      const parentFile = await filesCollection.findOne({ _id: parentId });
      if (!parentFile) {
        return res.status(400).json({ error: "Parent not found" });
      }
      if (parentFile.type !== "folder") {
        return res.status(400).json({ error: "Parent is not a folder" });
      }
    }

    const fileDocument = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === "folder") {
      const result = await filesCollection.insertOne(fileDocument);
      return res.status(201).json({ id: result.insertedId, ...fileDocument });
    }

    const folderPath = process.env.FOLDER_PATH || "/tmp/files_manager";
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const localPath = path.join(folderPath, uuidv4());
    fs.writeFileSync(localPath, Buffer.from(data, "base64"));

    fileDocument.localPath = localPath;
    const result = await filesCollection.insertOne(fileDocument);

    return res.status(201).json({ id: result.insertedId, ...fileDocument });
  }

  static async getShow(req, res) {
    const token = req.header("X-Token");
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const file = await dbClient.client
      .db(dbClient.database)
      .collection("files")
      .findOne({ _id: ObjectId(id), userId });

    if (!file) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const token = req.header("X-Token");
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { parentId = 0, page = 0 } = req.query;
    const filesCollection = dbClient.client
      .db(dbClient.database)
      .collection("files");
    const query = { userId, parentId: parentId === 0 ? 0 : ObjectId(parentId) };

    const files = await filesCollection
      .find(query)
      .skip(parseInt(page, 10) * 20)
      .limit(20)
      .toArray();

    return res.status(200).json(files);
  }
}

export default FilesController;
