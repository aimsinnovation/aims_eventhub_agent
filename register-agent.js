#!/usr/bin/env node
const config = require('./aims_config.json');
var todayDate = new Date().toISOString();
todayDate = todayDate.substring(0, todayDate.indexOf('.')) + 'Z';
var bufferSystem;
var unirest = require('unirest');

var node_json = '[{"creationTime": "' + todayDate + '","modificationTime": "' + todayDate + '","name": "' + config.azure.eventHubName + '","nodeRef": {"nodeType": "aims.eventhub.stats","parts": {"part1": "' + config.azure.eventHubName + '"}},"properties": {"aims.eventhub.type": "' + config.azure.eventHubName + '"},"status": "aims.core.running"}]';
var system_json = '{"agentId": "aims.eventhub","majorVersion": 1,"minorVersion": 0,"name": "EventHubs"}';

console.log("Registering system...");
// Register system first...
var req = unirest('POST', 'https://api.aimsinnovation.com/api/environments/' + config.aimsConnection.environmentId + '/systems/')
  .headers({
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + config.aimsConnection.authToken
  })
  .send(system_json)
  .end(function (res) { 
    if (res.error) throw new Error(res.error); 
    bufferSystem = JSON.stringify(res.body.id);
    console.log("Please update the aims_config.json file with the following xsystem value: " + bufferSystem);
    console.log("System registration complete")

    console.log("Registering agent node...");
    // ...then register node
    var req1 = unirest('POST', 'https://api.aimsinnovation.com/api/environments/' + config.aimsConnection.environmentId + '/nodes/')
    .headers({
    'Content-Type': 'application/json',
    'X-System': + bufferSystem,
    'Authorization': 'Basic ' + config.aimsConnection.authToken
    })
    .send(node_json)
    .end(function (res) { 
      if (res.error) throw new Error(res.error); 
      callReturn = res.raw_body;
     console.log(callReturn);
     });
     console.log("Agent node registration complete!");
     console.log("Process complete!")
  });




