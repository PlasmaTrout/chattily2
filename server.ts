
import { Hono } from "https://deno.land/x/hono@v4.2.1/mod.ts";
import { serveStatic } from 'https://deno.land/x/hono/middleware.ts'
import { FileDB, Document } from "https://deno.land/x/filedb/mod.ts";
import { html } from 'https://deno.land/x/hono/helper.ts'
import { Server } from "https://deno.land/x/socket_io@0.2.0/mod.ts";


const db = new FileDB({ rootDir: "./data", isAutosave: true }); // create database with autosave

interface Message extends Document {
    userName?: string,
    message?: string,
    timeStamp?: string
};

const messages = await db.getCollection<Message>('messages')

const app = new Hono();

app.use('/static/*', serveStatic({ root: './' }))
app.use('/favicon.ico', serveStatic({ path: './favicon.ico' }))

app.get('/chats', (c) => {
    return c.html(getChats());
});

app.post('/chats', async (c) => {
    const result = await c.req.parseBody();
    console.log(result);
    messages.insertOne({
        message: result.message.toString(),
        userName: "Unknown",
        timeStamp: new Date().toISOString()
    });
    return c.html(getChats());
});

app.post('/clicked', (c) => c.text('You can access: /static/index.html'))
app.get('/', serveStatic({ path: './static/index.html' }))   

function getChats(): string {
    const m = messages.findMany({});
    const chats: string[] = [];
    m.retrieveData().every((c) => chats.push(`<li class='list-group-item'><span class='username'>${c.userName}</span>: <span class='message'>${c.message}</li>`));
    return chats.join('');
}

const io = new Server();

io.on("connection", (socket) => {
    console.log(`socket connected: ${socket.id}`);
    io.emit("chat message", `<li class='list-group-item'><i>${socket.id} has entered the chat!</i></li>`);
  
    socket.on("chat message", (msg) => {
      console.log(msg);
      io.emit("chat message", html`<li class='list-group-item'><span class='username'>${msg.userName}</span>: <span class='message'>${msg.message}</span></li>`);
    });
  
    socket.on("disconnect", (reason) => {
      console.log(`socket disconnected: ${socket.id} for ${reason}`);
    });
  });
  
  const handler = io.handler(async (req) => {
    return await app.fetch(req);
  });

 Deno.serve(handler)