/* South Paw · data/config.js
   Game version and online settings. Change the version whenever the fight rules or punch data change:
   players only meet online when their room prefix matches, so different versions never end up in the same fight. */
'use strict';
const CONFIG={
  version:'0.5',
  roomPrefix:'southpaw050-',      // every online room and quick-match slot id starts with this
  quickMatchSlots:6,              // how many quick-match queue slots the game scans
  // Matchmaking server for online play. Empty = the free public PeerJS server.
  // To run your own: {host:'your-server.example.com',port:443,path:'/southpaw',secure:true}
  peerServer:{}
};
