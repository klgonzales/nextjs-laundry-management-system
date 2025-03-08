import mongoose from "mongoose";

// Encode the password to handle special characters
const password = encodeURIComponent("M@ngkukul@m@ko69");
const uri = `mongodb+srv://gonzales:${password}@ewash.p3cs1.mongodb.net/elbi_wash?retryWrites=true&w=majority&appName=EWASH`;

const clientOptions = {
  serverApi: {
    version: "1" as const,
    strict: true,
    deprecationErrors: true,
  },
};

async function dbConnect() {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log("Already connected to MongoDB!");
      return;
    }

    await mongoose.connect(uri, clientOptions);

    // Check connection
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().command({ ping: 1 });
      console.log(
        "Pinged your deployment. You successfully connected to MongoDB!"
      );
    }
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

export default dbConnect;
