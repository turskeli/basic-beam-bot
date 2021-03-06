'use strict';

const Beam = require('beam-client-node');
const BeamInteractiveGame = require('beam-interactive-node');
const BeamSocket = require('beam-client-node/lib/ws');
const https = require('https');
const util = require('util');
const beam = new Beam();


//Global configuration
//Sockets stored to allow for Interactive Game communication w/ chat
//User and Channel IDs saved for cross use
let config = {
    chatSocket: null,  // leave null
    gameSocket: null,  // leave null
    channelId: null,   // leave null
    userId: null,      // leave null
    channelName: '',   // name of channel to join
    userName: '',      // username of bot
    password: ''       // password of bot
};


//Perform lookups of IDs based on user/channel names
//then start the bot
https.get('https://beam.pro/api/v1/channels/' + config.channelName, (res) => {
    var data = "";
    res.on('data', (d) => {
        data += d;
    });
    res.on('end', ()=> {
        data = JSON.parse(data);
        config.channelId = data.id;
        if (config.channelName === config.userName) {
            config.userId = data.userId;
            startBeam();
        } else {
            https.get('https://beam.pro/api/v1/channels/' + config.userName, (res) => {
                let data = "";
                res.on('data', (d) => {
                    data += d;
                });
                res.on('end', () => {
                    data = JSON.parse(data);
                    config.userId = data.userId;
                    startBeam();
                });
            });
        }
    });
});


//Connect bot to chat and interactive
var startBeam = () => {
    beam.use('password', {username: config.userName, password: config.password})
        .attempt()
        .then(() => {
            return beam.chat.join(config.channelId);
        })
        .then((res) => {
            connectChat(res);
        })
        .then(() => {
            return beam.game.join(config.channelId);
        })
        .then((res) => {
            connectGame(res);
        })
        .catch((err) => {
            util.log(err)
        });
};

//Chat socket initialize and setup incoming ChatMessage event handler
var connectChat = (chatJoin) => {
    let socket = new BeamSocket(chatJoin.body.endpoints).boot();

    socket.call('auth', [config.channelId, config.userId, chatJoin.body.authkey]);
    socket.on('ChatMessage', (data) => {
        parseMessage(socket, data);
    });
    socket.call('msg', ['/me has joined in bot form']);
    config.chatSocket = socket;
};


//Run on incoming chat messages
//Chat command logic goes here
var parseMessage = (socket, messagePacket) => {
    //Examine packet structure
    //console.log(JSON.stringify(messagePacket));

    //first part of message, may be multiple if emotes
    //handle better
    let message = messagePacket.message.message[0].data;

    if (message === '!hello')
        socket.call('msg', ['Hello there ' + messagePacket.user_name]);
};

//Interactive socket initialize and setup incoming report events
var connectGame = (gameJoin) => {
    let details = {
        remote: gameJoin.body.address,
        channel: config.channelId,
        key: gameJoin.body.key
    };

    let socket = new BeamInteractiveGame.Robot(details);

    socket.handshake((err) => {
        if (err)
            throw new Error('Error connecting to game', err);
    });
    socket.on('report', (report) => {
        parseGameReport(report);
    });
    config.gameSocket = socket;
};

//Run on incoming interactive reports (clicks, moves, etc)
//Interactive game logic here
//Check out robotjs if you want to have bot use mouse/keyboard
var parseGameReport = (report) => {
    //Examine report structure
    util.log(JSON.stringify(report));
};