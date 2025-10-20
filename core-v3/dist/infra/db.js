"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = getClient;
exports.getDb = getDb;
let clientPromise;
function createClient() {
    const uri = process.env.MONGODB_URI;
    if (!uri)
        throw new Error('Missing MONGODB_URI');
    const options = {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true,
        compressors: ['snappy', 'zlib'],
        zlibCompressionLevel: 6,
        monitorCommands: process.env.NODE_ENV === 'development',
    };
    // Import dinámico para evitar resolver ESM en contexto de test al cargar el módulo
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MongoClient: RealMongoClient } = require('mongodb');
    return new RealMongoClient(uri, options);
}
async function getClient() {
    if (clientPromise)
        return clientPromise;
    if (process.env.NODE_ENV === 'development') {
        const g = global;
        if (!g.__v3_mongo) {
            g.__v3_mongo = createClient().connect();
        }
        clientPromise = g.__v3_mongo;
        return clientPromise;
    }
    clientPromise = createClient().connect();
    return clientPromise;
}
async function getDb() {
    const client = await getClient();
    const dbName = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB;
    if (!dbName)
        throw new Error('Missing database name (MONGODB_DB|MONGODB_DATABASE|MONGODB_DB_FINAL)');
    return client.db(dbName);
}
