const http = require('http');
const ws = require('ws');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = new express();
const jsonParser = bodyParser.json({ extended: true })  

const httpServer = http.createServer(app)
const wss = new ws.Server({
  'server': httpServer
})

let MongoClient = require('mongodb').MongoClient;
// let url = "mongodb://localhost:27017/";
let uri = "mongodb+srv://admin:admin@cluster0.td9vv.mongodb.net/loginRequests?retryWrites=true&w=majority"
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


// { useUnifiedTopology: true, useNewUrlParser: true }

  // app.get('/s2', (req, res) => {

  //   res.sendFile(path.join(__dirname, './s2.html'), () => {

  //     wss.on('connection', function connection(ws) {
  //       console.log('A new client Connected!');
  //       // ws.send('Welcome New Client!');
      
  //       ws.on('message', function incoming(message) {
  //         console.log('received: %s', message);
  //         ws.send('Welcome New Client!');
      
  //         wss.clients.forEach(function each(client) {
  //           if (client !== ws && client.readyState === WebSocket.OPEN) {
  //             client.send(message);
  //           }
  //         });
          
  //       });
  //     });

  //   }
    
  //   );
  // })

  let connections = []
  let userInfo;
  let sessionRefId;
  let loginSuccess = false;

  wss.on('connection', function connection(ws) {
    console.log('A new client Connected!');

    ws.on('message', function incoming(message) {
      sessionRefId = JSON.parse(message);
      sessionRefId['linkVisited'] = false;
      sessionRefId['loggedInUsingLink'] = false;
      console.log(sessionRefId,'refID')

      // ws.send('Welcome New Client!');

      // MongoClient.connect(url, { useUnifiedTopology: true, useNewUrlParser: true }, function(err, db) {
      //   if (err) throw err;
      //   var dbo = db.db("loginRequests");
      //   dbo.collection("requestLogs").insertOne(sessionRefId, function(err, res) {
      //     if (err) throw err;
      //     console.log("1 document inserted");
      //     db.close();
      //   });
      // });

      client.connect(err => {
        const collection = client.db("loginRequests").collection("requestLogs");
        collection.insertOne(sessionRefId, function(err, res) {
          if (err) throw err;
          console.log("1 document inserted");;
          // client.close();
        });
      });
      
    });


    app.get('/', function(req, res){

      client.connect(err => {
        const collection = client.db("loginRequests").collection("requestLogs");
        collection.find({ uniqueString : { $eq: sessionRefId ? sessionRefId.uniqueString : false} }).toArray(function(err, result) {
          if (err) throw err;
          console.log(result, 'connectResult');
          // client.close();

          if ( result.length == 0) {
            console.log('if 0')
            res.sendFile(path.join(__dirname, './index.html'))
          } 

          else if ( result.length > 0 && result[0].linkVisited == true && result[0].loggedInUsingLink == false) {
            console.log('else if all')
            res.sendFile(path.join(__dirname, './error.html'))
            ws.close(1008, "new session opened!")
          }

          else if ( result.length > 0 && result[0].linkVisited == true && result[0].loggedInUsingLink == true) {
            console.log('else if all')
            res.sendFile(path.join(__dirname, './index.html'))
          }

          else if ( result.length > 0 && result[0].linkVisited == 'pending') {
            console.log('else if 1')
            res.sendFile(path.join(__dirname, './index.html'))
          } 
          
          else {
            console.log('else')
            res.sendFile(path.join(__dirname, './index.html'))
          }
        });

        collection.updateOne({ uniqueString : sessionRefId ? sessionRefId.uniqueString : false} , { $set: { linkVisited : true} })

      });

      // client.connect(err => {
      //   const collection = client.db("loginRequests").collection("requestLogs");
      //   collection.find({ uniqueString : { $eq: sessionRefId ? sessionRefId.uniqueString : false} }).toArray(function(err, result) {
      //     if (err) throw err;
      //     console.log(result, 'connectResult');
      //     // client.close();

      //     if ( result.length == 0) {
      //       console.log('if 0')
      //       res.sendFile(path.join(__dirname, './index2.html'))
      //     } 

      //     else if ( result.length > 0 && result[0].linkVisited == true && result[0].loggedInUsingLink == true) {
      //       console.log('else if all')
      //       res.sendFile(path.join(__dirname, './index2.html'))
      //       ws.close(1008, "new session opened!")
      //     }

      //     else if ( result.length > 0 && result[0].linkVisited == true) {
      //       console.log('else if 1')
      //       res.sendFile(path.join(__dirname, './error.html'))
      //     } 
          
      //     else {
      //       console.log('else')
      //       res.sendFile(path.join(__dirname, './index2.html'))
      //     }
      //   });

      //   collection.updateOne({ uniqueString : sessionRefId ? sessionRefId.uniqueString : false} , { $set: { linkVisited : true} })

      // });
      
      // res.sendFile(path.join(__dirname, './index.html'));
    });
  
  app.get('/thank-you', (req, res) => {

    res.sendFile(path.join(__dirname, './thank-you.html'), () => {

      // connections.forEach(function(connection) {
      //   connection.send(sessionRefId, userInfo);
      // });

    }
    
    );
  })

  app.post('/s3', jsonParser, (req, res) => {

    console.log('posts data')
    
    userInfo = {  
      sessionRefId : sessionRefId,
      uid:req.body.uid,  
      name:req.body.name,
      email:req.body.email,
      photo:req.body.photo
    };  

    res.end(JSON.stringify(userInfo), () => {
      connections.forEach(function(connection) {
        connection.send(JSON.stringify(userInfo));
      });
    })

    loginSuccess = true;

    client.connect(err => {
    const collection = client.db("loginRequests").collection("requestLogs");
    collection.updateOne({ uniqueString : sessionRefId ? sessionRefId.uniqueString : false} , { $set: { loggedInUsingLink : 'pending'} })
    });

  })

  app.get('/s1', (req, res) => {
    res.sendFile(path.join(__dirname, './s1.html'));
  })

  app.post('/authProgress', (req, res) => {
    client.connect(err => {
      const collection = client.db("loginRequests").collection("requestLogs");
      collection.updateOne({ uniqueString : sessionRefId ? sessionRefId.uniqueString : false} , { $set: { loggedInUsingLink : true} })
      });
  })


  app.use('/media', express.static(__dirname + '/media'));
  
  // MongoClient.connect(url, { useUnifiedTopology: true, useNewUrlParser: true }, function(err, db) {
  //   if (err) throw err;
  //   var dbo = db.db("loginRequests");
  
  //   dbo.collection("requestLogs").find({}).toArray(function(err, result) {
  //     if (err) throw err;
  //     console.log(result);
  //     db.close();
  //   });
  // });

  connections.push(ws);

});

httpServer.listen(8080)


// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, './index.html'));
//   })

//   app.get('/s2', (req, res) => {
//     res.sendFile(path.join(__dirname, './s2.html'));
//     wss.on('connection', function connection(ws) {
//       ws.send(`server connected`);
//       ws.on('message', function incoming(message) {
//         ws.send(`Hi ${message} user`)
//       });
//     });

//   })

//   app.get('/post', (req, res) => {
//     res.sendFile(path.join(__dirname, './s2.html'));
//     })

// app.post('/post', (req, res) => {
//   wss.on('connection', (ws) => {
//     ws.send(`message: Sai User Name`);
//     ws.on('message', function incoming(message) {
//     });
//   });
//   res.send('ff')
// })

// const port =8080;
// httpServer.listen(port)

// ws.on('message', function (message) {
//   let name = message.match(/([\p{Alpha}\p{M}\p{Nd}\p{Pc}\p{Join_C}]+)$/gu) || "Guest";
//   ws.send(`Hello from server, ${name}!`);

//   setTimeout(() => ws.close(1000, "Bye!"), 5000);
// });


// function accept(req, res) {
//   // all incoming requests must be websockets
//   if (!req.headers.upgrade || req.headers.upgrade.toLowerCase() != 'websocket') {
//     res.end();
//     return;
//   }

//   // can be Connection: keep-alive, Upgrade
//   if (!req.headers.connection.match(/\bupgrade\b/i)) {
//     res.end();
//     return;
//   }
 
//   wss.handleUpgrade(req, req.socket, Buffer.alloc(0), onConnect);

//   app.get('/', function(request, response){
//     response.sendFile('/public/index.html');
//   });

// }

// function onConnect(ws) {
//   ws.on('message', function (message) {
//     let name = message.match(/([\p{Alpha}\p{M}\p{Nd}\p{Pc}\p{Join_C}]+)$/gu) || "Guest";
//     ws.send(`Hello from server, ${name}!`);

//     setTimeout(() => ws.close(1000, "Bye!"), 5000);
//   });
// }

// if (!module.parent) {
//   http.createServer(accept).listen(8080);
// } else {
//   exports.accept = accept;
// }

