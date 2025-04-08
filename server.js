const { Console } = require('console');
const crypto = require('crypto');
const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');

const app = express();
const port = 3000;

const server = createServer(app);
const wss = new WebSocket.Server({ server });
let clientCount = 0;
let playerCount = 0;
let readyCount  = 0;
let turn =0;
let cycle=0;
let place= -1;
let finishedPlayers = [];
let places = [];
let round =-1;
let votes = [0,0,0,0,0,0];
const clients = new Map();
wss.on('connection', function(ws) {
  console.log("Client joined.");
  ws.send(Buffer.from([0, clientCount]));
  clients.set(ws, clientCount);  
  clientCount++;
  wss.clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      safeSend(ws,Buffer.from([2]));
    }
  });
  safeSend(ws,Buffer.from([3]));
  JoinGame(ws);
  // send "hello world" interval
  ws.on('message', function(data) {
    if (data.length > 0) {
      const header = data[0];
      //console.log(`Header: ${header}, Payload: [${Array.from(payload).join(", ")}]`);
      
      if (header == 1) { //move
        // Broadcast to all other clients
        SendOthers(ws,data);
      } else if (header == 2) {//done turn
        if(data[1] == 1) {//finsished
          const id = clients.get(ws);
          finishedPlayers.push(id);
          if(round!=cycle) {
            round=cycle;
            place++;
          }
          places[place]=id;
        


        }
        if(finishedPlayers.length==playerCount) {
          Reset();
        } else {
          do {
            turn++;
            if(turn==playerCount) {
              cycle++;
              turn=0;
            }
          } while(finishedPlayers.includes(turn));
          SendAll(Buffer.from([4,turn]));
        }
      } else if (header == 3) {//ready
          readyCount++;
          //console.log("Ready: "+readyCount);
          if(readyCount==clientCount) {//all ready
            playerCount=clientCount;
            readyCount=0;
            cycle=0;
            round=-1;
            place=-1;
            finishedPlayers = [];
            places= [];
            turn=0;
            SendAll(Buffer.from([7,1]));
            console.log(votes);
          }
      } else if (header == 4) {//vote
        votes[data[1]]++;
        votes[data[2]]--;
      }
    }
  });

  ws.on('close', function() {
    console.log("Client left.");
    SendAll(Buffer.from([5,clients.get(ws)]));
    clientCount--;
    readyCount=0;
  });
});
function JoinGame(ws) {
  SendOthers(ws,Buffer.from([2]));
  
}
function Reset() {
  SendAll(Buffer.from([6]));
  votes = [0,0,0,0,0,0];
}
function SendOthers(ws,payload) {
  wss.clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
 function SendAll(payload) {
  wss.clients.forEach(client => {
      client.send(payload);
  });
}
function safeSend(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(data);
  } else {
    ws.on('open', () => {
      ws.send(data);
    }); // Ensure it sends when open
  }
}
server.listen(port, function() {
  console.log(`Listening on http://localhost:${port}`);
});
