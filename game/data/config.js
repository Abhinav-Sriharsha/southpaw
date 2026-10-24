/* South Paw · data/config.js
   Game version and online settings. Change the version whenever the fight rules or punch data change:
   players only meet online when their room prefix matches, so different versions never end up in the same fight. */
'use strict';
const CONFIG={
  version:'0.60',
  roomPrefix:'southpaw060-',      // every quick-match slot id starts with this, so only the same version is matched
  roomIdPrefix:'southpaw-room-',  // private rooms: the same on every version, so a friend on another version is told to update instead of 'room not found'
  quickMatchSlots:6,              // how many quick-match queue slots the game scans
  // Matchmaking server for online play. Empty = the free public PeerJS server.
  // To run your own: {host:'your-server.example.com',port:443,path:'/southpaw',secure:true}
  peerServer:{},
  // Relay (TURN) servers let two players connect when their networks block a direct connection (common on mobile data).
  // turnUrl: optional address that returns {iceServers:[...]}, for example the Worker in tools/turn-worker (Cloudflare's TURN).
  // Leave empty to use the free public relays listed below.
  turnUrl:'',
  iceServers:[
    {urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302']},
    {urls:['turn:eu-0.turn.peerjs.com:3478','turn:us-0.turn.peerjs.com:3478'],username:'peerjs',credential:'peerjsp'}
  ],
  // Open Relay (metered.ca) free relay with public shared-secret auth. Set to null to turn it off.
  openRelay:{host:'staticauth.openrelay.metered.ca',secret:'openrelayprojectsecret'}
};
