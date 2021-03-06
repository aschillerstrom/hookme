var debug = require('debug')('api-respoke');
var request = require('request');
var wsClient = require('../util/wsclient');
var config = require('../util/config');

var clientSocket = null;
var baseUrl = config.baseUrl || "https://api-st.respoke.io";

var respoke = {};

respoke.appSecret = config.appSecret;
respoke.appId = config.appId;

var genericHandler = function(err, req, body) {
  if (err) {
    debug(err);
  }
};

// fetch a token from respoke.
respoke.getToken = function(endpointId, callback) {
  
  var body = {
    "appId": respoke.appId,
    "endpointId": endpointId,
    "roleId": "visitor",
    "ttl": 86400
  };

  request.post({
    'url': baseUrl + '/v1/tokens',
    'headers': {'App-Secret': respoke.appSecret},
    'body': JSON.stringify(body)
  }, callback);
};

// send group messages
respoke.sendGroupMessage = function (group, message, callback) {
    var handler = callback || genericHandler;
    
    if (clientSocket) {
      clientSocket.sendGroupMessage(group, message, handler);
    } else {
      request.post({
        'url': baseUrl + '/v1/channels/' + group + '/publish',
        'headers': {'App-Secret': respoke.appSecret},
        'body': JSON.stringify({"message": message})
      }, handler);
    }
}

// send endpoint messages
// NOTE: this is using the clientSocket because the current incarnation of the respoke
// back-end does not allow messages on HTTPS
respoke.sendMessage = function (endpoint, message, callback) {
  var handler = callback || genericHandler;
  var msg = {};
  msg.to = endpoint;
  msg.message = message;
  clientSocket.sendEndpointMessage(msg, handler);
};

// return a list of connections for an endpoint
respoke.getConnections = function (endpoint, callback) {
  var handler = callback || genericHandler;
  request.get({
    'url': baseUrl + '/v1/apps/' + respoke.appId + '/endpoints/' + endpoint + '/connections',
    'headers': {'App-Secret': respoke.appSecret}
  }, handler);
};

// add a connection to one or more group(s)
respoke.joinGroup = function (endpoint, connection, groups, callback) {
  var handler = callback || genericHandler;
  request.put({
    'url': baseUrl + '/v1/apps/' + respoke.appId + '/endpoints/' + endpoint + '/connections/' + connection,
    'headers': {'App-Secret': respoke.appSecret},
    'body': JSON.stringify({"groups": groups})
  }, handler); 
};

// return a list of group members (subscribers)
respoke.getMembers = function (group, callback) {
  var handler = callback || genericHandler;
  request.get({
    'url': baseUrl + '/v1/channels/' + group + '/subscribers/',
    'headers': {'App-Secret': respoke.appSecret}
  }, handler);
};

// create a websocket connection
respoke.createWebsocket = function() {
  wsClient.getSocketConnection(baseUrl, respoke.appSecret, "appSecret", function(err, socket) {
    if (err) {
      debug(err);
    } else {
      clientSocket = socket;
      debug("Application-level WebSocket connection established to Respoke.");
    }
  });
};

module.exports = respoke;