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
let votes = [1,1,0,0,0,0];
let colours = [];
let names = [];
let waiting = [];
const clients = new Map();
wss.on('connection', function(ws) {
  console.log("Client joined.");
  ws.send(Buffer.from([0, clientCount]));
  clients.set(ws, clientCount);  
  clientCount++;
  
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
            console.log(colours);
            playerCount=clientCount;
            cycle=0;
            round=-1;
            place=-1;
            finishedPlayers = [];
            places= [];
            turn=0;
            SendAll(Buffer.from([7,1+getHighest()]));
          }
      } else if (header == 4) {//vote
        votes[data[1]]++;
        if(data[2]!=255)votes[data[2]]--;
      } else if (header == 5) {      //join for real
        console.log("Names: "+names);
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              const id = clients.get(client);
              let colour = colours[id];
              //console.log(colour);
              //safeSend(ws,Buffer.concat([Buffer.from([2, colour[0], colour[1], colour[2]]), Buffer.from(names[id])]));
              safeSend(ws,Buffer.from([2, colour[0], colour[1], colour[2]]));

            }
        });
        safeSend(ws,Buffer.from([3]));
        colours.push([data[1],data[2],data[3]]);
        names.push(Array.from(data.slice(4,5+data[4])));
        if(readyCount==playerCount&&!playerCount==0) {
        waiting.push(ws);
        } else
        JoinGame(ws);
      }
    }
  });

  ws.on('close', function() {
    console.log("Client left.");
    let index = clients.get(ws);
    SendAll(Buffer.from([5,index]));
    clients.delete(ws);
    colours.splice(index, 1);
    //names.splice(index, 1);
    console.log(names);
    clients.forEach((value, key) => {
        if (value > index) clients.set(key, value - 1);
    });    
    clientCount--;
    readyCount=0;
    if(clientCount==0) {
        votes = [1,1,0,0,0,0]; 
        colours = [];
        names = [];
    }
  });
});
function getHighest() {
    let maxVote = Math.max(...votes);
    let indices = [];
    for (let i = 0; i < votes.length; i++) {
        if (votes[i] === maxVote) {
            indices.push(i);
        }
    }
    return indices[Math.floor(Math.random() * indices.length)]; //tie
}
function JoinGame(ws) {
    const id =clients.get(ws);
    let colour = colours[id];
    SendOthers(ws,Buffer.from([2, colour[0], colour[1], colour[2]]));
    safeSend(ws,Buffer.from([8]));
}
function Reset() {
  SendAll(Buffer.from([6]));
  votes = [1,1,0,0,0,0];
  readyCount=0;
  waiting.forEach(client => {
    JoinGame(client);
  });
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
