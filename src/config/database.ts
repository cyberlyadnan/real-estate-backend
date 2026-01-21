import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      console.log('💡 Please add MONGODB_URI to your .env file');
      console.log('   Example: MONGODB_URI=mongodb://localhost:27017/real_estate');
      throw new Error('MONGODB_URI is not defined');
    }

    // Validate MongoDB URI format
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      console.error('❌ Invalid MongoDB URI format');
      console.log('💡 URI must start with mongodb:// or mongodb+srv://');
      console.log(`   Current value: ${mongoUri.substring(0, 20)}...`);
      throw new Error('Invalid MongoDB URI format');
    }

    // Check if URI looks incomplete (common issue)
    if (mongoUri.length < 20) {
      console.error('❌ MongoDB URI appears to be incomplete');
      console.log(`   Current value: ${mongoUri}`);
      console.log('💡 Please check your .env file for a complete MongoDB connection string');
      throw new Error('MongoDB URI appears incomplete');
    }

    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB with modern options (no deprecated options)
    const conn = await mongoose.connect(mongoUri, {
      // Modern Mongoose doesn't need useNewUrlParser or useUnifiedTopology
      // They are enabled by default in newer versions
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n❌ MongoDB Connection Error: ${errorMessage}\n`);
    
    // Provide helpful debugging information
    if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('querySrv')) {
      console.log('💡 This error usually means:');
      console.log('   1. MongoDB URI is incomplete or malformed');
      console.log('   2. MongoDB server is not running (for local connections)');
      console.log('   3. Network/DNS issues (for Atlas connections)');
      console.log('\n📝 Check your .env file:');
      console.log('   - For local: MONGODB_URI=mongodb://localhost:27017/real_estate');
      console.log('   - For Atlas: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname\n');
    }
    
    // Don't exit in development - allow server to restart
    if (process.env.NODE_ENV === 'production') {
      console.log('🚫 Exiting in production mode due to database connection failure');
      process.exit(1);
    } else {
      console.log('⚠️  Server will continue running in development mode');
      console.log('   Fix the MongoDB connection and the server will retry on next request\n');
    }
  }
};

export default connectDB;
