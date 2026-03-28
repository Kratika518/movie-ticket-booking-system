import mongoose from "mongoose";

const connectDB = async () => {
    try{
        mongoose.connection.on('connected',()=> console.log('database connected'));
       
        await mongoose.connect(`${process.env.MONGODB_URL}/quickshow`);
    }catch(error){
        console.log(error.message);
        
    }
}

export default connectDB;