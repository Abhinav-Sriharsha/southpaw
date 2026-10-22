/* South Paw · tools/peer-server/server.js
   Your own matchmaking server for online play (instead of the free public PeerJS server).
   It only introduces two players; the fight itself goes directly between them.
   Run:  cd tools/peer-server && npm install && PORT=9000 node server.js
   Then in game/data/config.js set  peerServer:{host:'your-domain',port:443,path:'/southpaw',secure:true}
   (put it behind HTTPS, for example on Render, Fly.io or a small VPS with Caddy). */
const express=require('express');
const {ExpressPeerServer}=require('peer');
const http=require('http');
const app=express();
const server=http.createServer(app);
app.get('/',(req,res)=>res.send('South Paw matchmaking is running'));
app.use('/southpaw',ExpressPeerServer(server,{path:'/',allow_discovery:false}));
const PORT=process.env.PORT||9000;
server.listen(PORT,()=>console.log('South Paw matchmaking on port',PORT));
