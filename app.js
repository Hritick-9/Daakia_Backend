import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { connectDB } from "./utils/features.js";
import userRoute from "./routes/user.js";
import chatRoute from "./routes/chat.js";
import { ErrorMiddleware } from "./middlewares/error.js";
import {
    CHAT_JOINED,
    CHAT_LEAVED,
    NEW_MESSAGE,
    NEW_MESSAGE_ALERT,
    ONLINE_USERS,
    START_TYPING,
    STOP_TYPING,
  } from "./constants/events.js";

import adminRoute from "./routes/admin.js";
import {v4 as uuid} from "uuid";


import  {Server} from "socket.io";
import { createServer } from "http";
import { getSockets } from "./lib/helper.js";
import cors from "cors";
import { Message } from "./models/message.js";
import {v2 as cloudinary} from "cloudinary";
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";




dotenv.config({
    path: "./.env"
});

const app = express();
const server = createServer(app);
const io = new Server (server,{
    cors:corsOptions,
});



const port = process.env.PORT || 3000;
const adminSecretKey = process.env.ADMIN_SECRET_KEY|| "baikunth";
const envMode = process.env.NODE_ENV || "PRODUCTION";
const  userSocketIDs=new Map();
const onlineUsers = new Set();


app.set("io", io);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
// Connect to Database
connectDB(process.env.MONGO_URI);
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.
  CLOUDINARY_API_SECRET,

})


// Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin",adminRoute);



app.get("/", (req, res) => {
    res.send("hello");
});

io.use((socket, next) => {
    cookieParser()(
      socket.request,
      socket.request.res,
      async (err) => await socketAuthenticator(err, socket, next)
    );
  });

io.on("connection",(socket)=>{

    const user = socket.user;


    userSocketIDs.set(user._id.toString(),socket.id);


    

    socket.on(NEW_MESSAGE,async({chatId,members,message})=>{

        const messageForRealTime={
            content:message,
            _id:uuid(),
            sender:{
                _id:user._id,
                name : user.name,

            },
            chat:chatId,
            createdAt:new Date().toISOString(),

        };
        const messageForDB = {
            content: message,
            sender: user._id,
            chat: chatId,
          };

       

        const membersSockets = getSockets(members);
        io.to(membersSockets).emit(NEW_MESSAGE,{
            chatId,
            message:messageForRealTime,
        });
        io.to(membersSockets).emit(NEW_MESSAGE_ALERT,{
            chatId
        });


       try{await Message.create(messageForDB);}
       catch(err){
             throw new Error(err);
       }
    });

    socket.on(START_TYPING,({members,chatId})=>{
       const membersSockets=getSockets(members);
       socket.to(membersSockets).emit(START_TYPING,{chatId});
    })


    socket.on(STOP_TYPING,({members,chatId})=>{
        const membersSockets=getSockets(members);
        socket.to(membersSockets).emit(STOP_TYPING,{chatId});
     })

     socket.on(CHAT_JOINED, ({ userId, members }) => {
        onlineUsers.add(userId.toString());
    
        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
      });
    
      socket.on(CHAT_LEAVED, ({ userId, members }) => {
        onlineUsers.delete(userId.toString());
    
        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
      });

    socket.on("disconnect",()=>{
        userSocketIDs.delete(user._id.toString());
        onlineUsers.delete(user._id.toString());
        socket.broadcast.emit(ONLINE_USERS,Array.from(onlineUsers));
       
    });
});

app.use(ErrorMiddleware);

server.listen(port, () => {
    console.log(`Server is running on port ${port} in ${process.env.NODE_ENV}`);
});


export{envMode,adminSecretKey,userSocketIDs};