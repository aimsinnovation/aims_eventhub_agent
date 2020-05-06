#!/usr/bin/env node 
const { EventHubConsumerClient } = require("@azure/event-hubs");
const { ContainerClient } = require("@azure/storage-blob");    
const { BlobCheckpointStore } = require("@azure/eventhubs-checkpointstore-blob");

const config = require('./aims_config.json');

const connectionString = config.azure.connectionString;
const eventHubName = config.azure.eventHubName;
const consumerGroup = config.azure.consumerGroup;
const storageConnectionString = config.azure.storageConnectionString;
const containerName = config.azure.containerName;
var category, time, resultType, resultDescription, levelSignIn, levelSecurity, levelAudit, levelAdmin, callerIpAddress, resourceId, operationName, identity, tenantId, city, countryOrRegion, appDisplayName, loggedByService, operationType, displayName, objectLength, objectTemp;
var aims_json, temp;
var securityCounter = 0;
var signInCounter = 0;
var auditCounter = 0;
var adminCounter = 0;
var securityTime = '';
var unirest = require('unirest');

//Sends events to AIMS
function sendJSON (jsonString) {
  var req1 = unirest('POST', 'https://api.aimsinnovation.com/api/environments/' + config.aimsConnection.environmentId + '/events/') //AIMS events API
    .headers({
      'Content-Type': 'application/json',
      'X-System': config.aimsConnection.xSystem,
      'Authorization': 'Basic ' + config.aimsConnection.authToken 
    })
    .send(jsonString)
    .end(function (res) { 
      if (res.error) throw new Error(res.error); 
    });
}

//Sends stats to AIMS
function sendStats () {
  var todayDate = new Date().toISOString();
  todayDate = todayDate.substring(0, todayDate.indexOf('.')) + 'Z';

  //create JSON with stats for events
  if (securityTime.length > 1) {
    var statsJSON = '[{"nodeRef": {"nodeType": "aims.eventhub.stats","parts": {"part1": "' + config.azure.eventHubName + '"}},"statType": "aims.eventhub.logins","time":"' + todayDate + '","value": ' + signInCounter + '},{"nodeRef": {"nodeType": "aims.eventhub.stats","parts": {"part1": "' + config.azure.eventHubName + '"}},"statType": "aims.eventhub.audits","time": "' + todayDate + '","value": ' + auditCounter + '},{"nodeRef": {"nodeType": "aims.eventhub.stats","parts": {"part1": "' + config.azure.eventHubName + '"}},"statType": "aims.eventhub.security","time": "' + securityTime + '","value": ' + securityCounter + '},{"nodeRef": {"nodeType": "aims.eventhub.stats","parts": {"part1": "' + config.azure.eventHubName + '"}},"statType": "aims.eventhub.admin","time":"' + todayDate + '","value": ' + adminCounter + '}]';
  } else {
    var statsJSON = '[{"nodeRef": {"nodeType": "aims.eventhub.stats","parts": {"part1": "' + config.azure.eventHubName + '"}},"statType": "aims.eventhub.logins","time":"' + todayDate + '","value": ' + signInCounter + '},{"nodeRef": {"nodeType": "aims.eventhub.stats","parts": {"part1": "' + config.azure.eventHubName + '"}},"statType": "aims.eventhub.audits","time": "' + todayDate + '","value": ' + auditCounter + '},{"nodeRef": {"nodeType": "aims.eventhub.stats","parts": {"part1": "' + config.azure.eventHubName + '"}},"statType": "aims.eventhub.security","time": "' + todayDate + '","value": ' + securityCounter + '},{"nodeRef": {"nodeType": "aims.eventhub.stats","parts": {"part1": "' + config.azure.eventHubName + '"}},"statType": "aims.eventhub.admin","time":"' + todayDate + '","value": ' + adminCounter + '}]';    
  }
  var req2 = unirest('POST', 'https://api.aimsinnovation.com/api/environments/' + config.aimsConnection.environmentId + '/statpoints/') //AIMS statistics API
    .headers({
      'Content-Type': 'application/json',
      'X-System': config.aimsConnection.xSystem,
      'Authorization': 'Basic ' + config.aimsConnection.authToken
    })
    .send(statsJSON)
    .end(function (res) { 
      if (res.error) throw new Error(res.error); 
    });
    signInCounter = 0;
    auditCounter = 0;
    securityCounter = 0;
    adminCounter = 0;
    securityTime = '';
}

async function main() {
  // Create a blob container client and a blob checkpoint
  const containerClient = new ContainerClient(storageConnectionString, containerName);
    const checkpointStore = new BlobCheckpointStore(containerClient);

  // Create a consumer client for the event hub by specifying the checkpoint store.
  const consumerClient = new EventHubConsumerClient(consumerGroup, connectionString, eventHubName, checkpointStore);

  // Subscribe to the events from the Event Hub
  aims_json = "";
  const subscription = consumerClient.subscribe({
      processEvents: async (events, context) => {
        for (const event of events) {
          category = JSON.stringify(event.body.records[0].category);
          category = category.replace(/"/gi, '');
          time = JSON.stringify(event.body.records[0].time);
          time = time.replace(/"/gi, '');
          if (time.includes(".")) {
            time =time.substring(0, time.indexOf('.')) + 'Z';
          }

          //check for SignIn events from Azure AD
          if (category == 'SignInLogs') {
            resultType = JSON.stringify(event.body.records[0].resultType);
            resultType = resultType.replace(/"/gi, '');
            levelSignIn = JSON.stringify(event.body.records[0].Level);
            callerIpAddress = JSON.stringify(event.body.records[0].callerIpAddress);
            callerIpAddress = callerIpAddress.replace(/"/gi, '');
            resourceId = JSON.stringify(event.body.records[0].resourceId);
            resourceId = resourceId.replace(/"/gi, '');
            operationName = JSON.stringify(event.body.records[0].operationName);
            operationName = operationName.replace(/"/gi, '');
            identity = JSON.stringify(event.body.records[0].identity);
            identity = identity.replace(/"/gi, '');
            tenantId = JSON.stringify(event.body.records[0].tenantId);
            tenantId = tenantId.replace(/"/gi, '');
            city = JSON.stringify(event.body.records[0].properties.location.city);
            city = city.replace(/"/gi, '');
            countryOrRegion = JSON.stringify(event.body.records[0].properties.location.countryOrRegion);
            countryOrRegion = countryOrRegion.replace(/"/gi, '');
            appDisplayName = JSON.stringify(event.body.records[0].properties.appDisplayName);
            appDisplayName = appDisplayName.replace(/"/gi, '');

            if (event.body.records[0].resultDescription) {
              resultDescription = JSON.stringify(event.body.records[0].resultDescription);
              resultDescription = resultDescription.replace(/"/gi, '');
            } else {
              resultDescription = 'None';
            }

            temp = 'Category: ' + category + '\n' + 'Operation Name: ' + operationName + '\n' + 'App name: ' + appDisplayName + '\n' + 'Name: ' + identity + '\n' + 'City: ' + city + '\n' + 'Country: ' + countryOrRegion + '\n' + 'IP: ' + callerIpAddress + '\n' + 'Tenant ID: ' + tenantId + '\n' + 'Result Description: ' + resultDescription + '\n';
            aims_json = aims_json + '{"eventType": "aims.eventhub.eventhub-events","level": "info","message": "' + temp + '","nodes": [{"nodeType": "aims.eventhub.stats","parts": {"part1": "' + config.azure.eventHubName + '"}}],"startTime": "' + time + '","endTime": null,"data": {}},';
            signInCounter = signInCounter + 1;

            //check for Security events from Azure Monitor
           } else if (category == 'Security') {
            securityTime = JSON.stringify(event.body.records[0].time);
            securityTime = securityTime.replace(/"/gi, '');
            if (securityTime.includes(".")) {
              securityTime =securityTime.substring(0, securityTime.indexOf('.')) + 'Z';
            }

            resourceId = JSON.stringify(event.body.records[0].resourceId);
            resourceId = resourceId.replace(/"/gi, '');
            resultType = JSON.stringify(event.body.records[0].resultType);
            resultType = resultType.replace(/"/gi, '');
            levelSecurity = JSON.stringify(event.body.records[0].level);
            levelSecurity = levelSecurity.replace(/"/gi, '');
            resultDescription = JSON.stringify(event.body.records[0].resultDescription);
            resultDescription = resultDescription.replace(/"/gi, '');
            resultDescription = resultDescription.replace(/'/gi, '');

            temp = 'Category: ' + category + '\n' + 'Security Level: ' + levelSecurity + '\n' + 'ResultType: ' + resultType + '\n' + 'Result: ' + resultDescription + '\n' + 'Resource ID: ' + resourceId + '\n';
            aims_json = aims_json + '{"eventType": "aims.eventhub.eventhub-events","level": "info","message": "' + temp + '","nodes": [{"nodeType": "aims.eventhub.stats","parts": {"part1": "' + config.azure.eventHubName + '"}}],"startTime": "' + time + '","endTime": null,"data": {}},';
            securityCounter = securityCounter + 1;

            //check for Audit events from Azure AD
          }  else if (category == 'AuditLogs') {
            operationName = JSON.stringify(event.body.records[0].operationName);
            operationName = operationName.replace(/"/gi, '');
            resourceId = JSON.stringify(event.body.records[0].resourceId);
            resourceId = resourceId.replace(/"/gi, '');
            tenantId = JSON.stringify(event.body.records[0].tenantId);
            tenantId = tenantId.replace(/"/gi, '');
            identity = JSON.stringify(event.body.records[0].identity);
            identity = identity.replace(/"/gi, '');
            levelAudit = JSON.stringify(event.body.records[0].level);
            levelAudit = levelAudit.replace(/"/gi, '');

            temp = 'Category: ' + category + '\n' + 'Operation: ' + operationName + '\n' + 'Resource Id: ' + resourceId + '\n' + 'Tenant Id: ' + tenantId + '\n' + 'Identity: ' + identity + '\n' + 'Audit Level: ' + levelAudit + '\n';
            aims_json = aims_json + '{"eventType": "aims.eventhub.eventhub-events","level": "info","message": "' + temp + '","nodes": [{"nodeType": "aims.eventhub.stats","parts": {"part1": "' + config.azure.eventHubName + '"}}],"startTime": "' + time + '","endTime": null,"data": {}},';
            auditCounter = auditCounter + 1;

            //check for Administrative events from Azure Monitor
          } else if (category == 'Administrative') {
            objectLength = event.body.records.length - 1;
            resultType = JSON.stringify(event.body.records[objectLength].resultType);
            resultType = resultType.replace(/"/gi, '');
            resourceId = JSON.stringify(event.body.records[objectLength].resourceId);
            resourceId = resourceId.replace(/"/gi, '');
            operationName = JSON.stringify(event.body.records[objectLength].operationName);
            operationName = operationName.replace(/"/gi, '');
            callerIpAddress = JSON.stringify(event.body.records[objectLength].callerIpAddress);
            callerIpAddress = callerIpAddress.replace(/"/gi, '');
            levelAdmin = JSON.stringify(event.body.records[objectLength].level);
            levelAdmin = levelAdmin.replace(/"/gi, '');
            
            if (event.body.records[objectLength].identity.claims.name != null) {
              identity = JSON.stringify(event.body.records[objectLength].identity.claims.name);
              identity = identity.replace(/"/gi, '');
            } else {
              identity = '';
            }

            temp = 'Category: ' + category + '\n' + 'Operation: ' + operationName + '\n' + 'Resource Id: ' + resourceId + '\n' + 'Name: ' + identity + '\n' + 'Caller IP: ' + callerIpAddress + '\n' + 'Level: ' + levelAdmin + '\n';
            aims_json = aims_json + '{"eventType": "aims.eventhub.eventhub-events","level": "info","message": "' + temp + '","nodes": [{"nodeType": "aims.eventhub.stats","parts": {"part1": "' + config.azure.eventHubName + '"}}],"startTime": "' + time + '","endTime": null,"data": {}},';
            adminCounter = adminCounter + 1;

          } else {

          } 
        }
        // Update the checkpoint.
        await context.updateCheckpoint(events[events.length - 1]);
      },
      processError: async (err, context) => {
        console.log(`Error : ${err}`);
      }
    }
  )

  // After 30 seconds, stop processing.
  await new Promise((resolve) => {
    setTimeout(async () => {
      await subscription.close();
      await consumerClient.close();
      resolve();
    }, 30000);
  });

  //check if any events and send to AIMS
  if (aims_json.length > 1) {
    aims_json = aims_json.replace(/,\s*$/, "");
    aims_json = '[' + aims_json + ']';
    sendJSON(aims_json);
  }
  sendStats();
}

function run() {
main().catch((err) => {
  console.log("Error occurred: ", err);
});
}

// Main Routine
var waittime = new Date(),
    secondsRemaining = (60 - waittime.getSeconds()) * 1000;

setTimeout(function() {
    setInterval(run, 60000);
}, secondsRemaining);
