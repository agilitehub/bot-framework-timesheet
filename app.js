require('dotenv').config();
const Enums = require('./enums');
const _ = require('lodash');
const mustache = require('mustache');

var builder = require('botbuilder');
var restify = require('restify');

// Create server
let server = restify.createServer();
server.listen(process.env.PORT, function() {
    console.log(`${server.name} listening to ${server.url}`);
});

// Create connector and listen for messages
var connector = new builder.ChatConnector(Enums.CONFIG_MICROSOFT);
server.post(Enums.BOT_ENDPOINT, connector.listen());

var inMemoryStorage = new builder.MemoryBotStorage();

var bot = new builder.UniversalBot(connector, function (session) {
    console.log("--MESSAGE");
    console.log(session.message.type + " - " + session.message.text);
    console.log("--USER");
    console.log(session.message.user);

    //Check if we need to run LUIS on the message
    if(!session.privateConversationData.disableLuis){
        //Get Intent of message
        builder.LuisRecognizer.recognize(session.message.text, Enums.CONfIG_LUIS.appUrl, function(err, intents, entities){
            //Check if the Timesheet conversation is active
            if(session.privateConversationData.activeIntent && session.privateConversationData.activeIntent === "new_timesheet"){
                //If the intent is to Cancel, then run the cancel Dialog, else just pass the entities to the active dialog
                if(intents[0].intent === "cancel_process"){
                    session.beginDialog(intents[0].intent, {intent:intents[0], entities});
                }else{
                    session.replaceDialog("new_timesheet", {intent:intents[0], entities});
                }
            }else{
                //Begin a new Dialog if there are any intents
                if(intents.length > 0){
                    session.beginDialog(intents[0].intent, {intent:intents[0], entities});
                }else{
                    //Return Exception
                    session.send(mustache.render(Enums.BOT_EXCEPTION_RESPONSES[_.random(Enums.BOT_EXCEPTION_RESPONSES.length - 1)], session.message.user));
                }
            }
        });
    }else{
        //It has to be a timesheet dialog with specific instructions to not use LUIS. We simply replace the dialog with no args
        session.replaceDialog("new_timesheet", {intent:null, entities:[]});
    }
}).set('storage', inMemoryStorage); // Register in memory storage

//var recognizer = new builder.LuisRecognizer(process.env.LUIS_APP_URL);
//bot.recognizer(recognizer);

bot.set(`persistUserData`, false);
bot.set(`persistConversationData`, false);

bot.dialog('new_timesheet', [
    function (session, args, next) {
        //VARIABLES
        let tmpEntity = null;
        let timesheet = null;
        let tmpEntities = args && args.entities ? args.entities : [];
        
        //Initiate Timesheet Object if it doesn't exist
        session.privateConversationData.activeIntent === "new_timesheet";
        session.privateConversationData.disableLuis = false;

        if(!session.privateConversationData.timesheet){
            session.privateConversationData.timesheet = {
                questionType: "luis",
                timesheetConfirmed: false,
                data: JSON.parse(JSON.stringify(Enums.MODEL_TIMESHEET))
            };
        }

        timesheet = session.privateConversationData.timesheet;

        if(timesheet.questionType === "luis"){
            //Extract Entities if available
            //Client
            tmpEntity = builder.EntityRecognizer.findEntity(tmpEntities, 'clients');

            if(tmpEntity){
                timesheet.data.client = tmpEntity.resolution.values[0];
            }

            //Date
            tmpEntity = builder.EntityRecognizer.findEntity(tmpEntities, 'builtin.datetimeV2.date');

            if(tmpEntity){
                timesheet.data.date = tmpEntity.resolution.values[0].timex;
            }

            //Hours Spent
            tmpEntity = builder.EntityRecognizer.findEntity(tmpEntities, 'builtin.number');

            if(tmpEntity){
                if(tmpEntity.resolution.subtype === "integer"){
                    timesheet.data.hoursSpent = parseInt(tmpEntity.resolution.value);
                }else{
                    timesheet.data.hoursSpent = parseFloat(tmpEntity.resolution.value);
                }
            }  
            
            //Type Of Work
            tmpEntity = builder.EntityRecognizer.findEntity(tmpEntities, 'type_of_work');

            if(tmpEntity){
                timesheet.data.typeOfWork = tmpEntity.resolution.values[0];
            }

            //Check that all data has been provided
            if(timesheet.data.client === null){
                builder.Prompts.text(session, "Which client is this for?");
            }else if(timesheet.data.date === null){
                builder.Prompts.text(session, "When did you work on this?");
            }else if(timesheet.data.hoursSpent === null){
                builder.Prompts.text(session, "How much time did you spend on this task (in hours)?");
            }else if(timesheet.data.typeOfWork === null){
                session.privateConversationData.disableLuis = true;
                timesheet.questionType = "typeOfWork";
                builder.Prompts.choice(session, "What is the work categorised as?", Enums.CHOICE_TYPE_OF_WORK);            
            }else if(timesheet.data.hoursBilled === null){
                session.privateConversationData.disableLuis = false;
                timesheet.questionType = "hoursBilled";
                builder.Prompts.text(session, `Of the ${timesheet.data.hoursSpent} hours worked, how much was billable (in hours)?`);
            }else if(timesheet.data.description === null){
                session.privateConversationData.disableLuis = true;
                timesheet.questionType = "description";
                builder.Prompts.text(session, "Can you provide me with a description of the work done?");
            }else if(timesheet.questionType !== "confirm_prompt" && timesheet.questionType !== "confirm_other"){
                session.privateConversationData.disableLuis = true;
                timesheet.questionType = "confirm_prompt";
                next();
            }else{
                session.privateConversationData.disableLuis = true;
                timesheet.questionType = "confirm_other";
                next();    
            }
        }else{
            //Determine Next Dialog
            if(timesheet.data.typeOfWork === null){
                session.privateConversationData.disableLuis = true;
                timesheet.questionType = "typeOfWork";
                builder.Prompts.choice(session, "What is the work categorised as?", Enums.CHOICE_TYPE_OF_WORK);            
            }else if(timesheet.data.hoursBilled === null){
                session.privateConversationData.disableLuis = false;
                timesheet.questionType = "hoursBilled";
                builder.Prompts.text(session, `Of the ${timesheet.data.hoursSpent} hours worked, how much was billable (in hours)?`);
            }else if(timesheet.data.description === null){
                session.privateConversationData.disableLuis = true;
                timesheet.questionType = "description";
                builder.Prompts.text(session, "Can you provide me with a description of the work done?");
            }else if(timesheet.questionType !== "confirm_prompt" && timesheet.questionType !== "confirm_other"){
                session.privateConversationData.disableLuis = true;
                timesheet.questionType = "confirm_prompt";
                next();
            }else{
                session.privateConversationData.disableLuis = true;
                timesheet.questionType = "confirm_other";
                next();    
            }
        }
    },
    function (session, results, next) {//Prompt Response
        let timesheet = session.privateConversationData.timesheet;

        if(timesheet.questionType === "luis"){
            builder.LuisRecognizer.recognize(results.response, Enums.CONfIG_LUIS.appUrl, function(err, intents, entities){
                if(intents[0].intent === "cancel_process"){
                    session.beginDialog(intents[0].intent, {intent:intents[0], entities});
                }else{
                    session.replaceDialog("new_timesheet", {entities});
                }
            });
        }else if(!session.privateConversationData.disableLuis){
                builder.LuisRecognizer.recognize(results.response, Enums.CONfIG_LUIS.appUrl, function(err, intents, entities){
                    if(intents[0].intent === "cancel_process"){
                        session.beginDialog(intents[0].intent, {intent:intents[0], entities});
                    }else{
                        session.privateConversationData.tmpData = entities;
                        next();
                    }
                });
        }else{
            session.privateConversationData.tmpData = results.response;
            next();
        }
    },
    function (session, response, next) {//Get Type of Work
        let timesheet = session.privateConversationData.timesheet;

        if(timesheet.questionType === "typeOfWork"){
            timesheet.data.typeOfWork = session.privateConversationData.tmpData.entity;
            timesheet.questionType = "";
            session.replaceDialog("new_timesheet", {});
        }else{
            next();
        }
    },
    function (session, response, next) {//Get Hours Billed
        let timesheet = session.privateConversationData.timesheet;
        let tmpEntity = null;

        if(timesheet.questionType === "hoursBilled"){
            tmpEntity = builder.EntityRecognizer.findEntity(session.privateConversationData.tmpData , 'builtin.number');

            if(tmpEntity){
                if(tmpEntity.resolution.subtype === "integer"){
                    timesheet.data.hoursBilled = parseInt(tmpEntity.resolution.value);
                }else{
                    timesheet.data.hoursBilled = parseFloat(tmpEntity.resolution.value);
                }
            }

            session.replaceDialog("new_timesheet", {});
        }else{
            next();
        }
    },
    function (session, response, next) {//Get Description
        let timesheet = session.privateConversationData.timesheet;

        if(timesheet.questionType === "description"){
            if(session.message.text && session.message.text !== ""){
                timesheet.data.description = session.message.text;
            }

            session.replaceDialog("new_timesheet", {});
        }else{
            next();
        }
    },
    function (session, args, next) {//Confirm Timesheet
        let timesheet = session.privateConversationData.timesheet;

        if(timesheet.questionType === "confirm_prompt"){
            var msg = new builder.Message(session)
            .addAttachment(_generateTimesheetConfirmCard(timesheet));
            session.send(msg);
        }else if(timesheet.questionType === "confirm_other"){
            if(session.message.value && session.message.value.value){
                if(session.message.value.value === "action_yes"){
                    next();
                }else{
                    session.endConversation("Timesheet Cancelled!");
                }
            }else if(session.message.text && session.message.text !== ""){
                builder.LuisRecognizer.recognize(session.message.text, Enums.CONfIG_LUIS.appUrl, function(err, intents, entities){
                    if(entities.length > 0){
                        if(entities[0].resolution.values[0] === "action_yes"){
                           next();
                        }else if(entities[0].resolution.values[0] === "action_no"){
                            session.endConversation("Timesheet Cancelled!");
                        }else{
                            var msg = new builder.Message(session)
                            .addAttachment(_generateTimesheetConfirmCard(timesheet));
                            session.send(msg);
                        }
                    }else{
                        var msg = new builder.Message(session)
                        .addAttachment(_generateTimesheetConfirmCard(timesheet));
                        session.send(msg);                    
                    }
                });
            }else{
                var msg = new builder.Message(session)
                .addAttachment(_generateTimesheetConfirmCard(timesheet));
                session.send(msg);
            }
        }else{
            next();
        }
    },
    function (session, results, next) {//Submit Timesheet
        session.endConversation("Timesheet Successfully Submitted!");
    },    
])

bot.dialog('greeting', function (session, args) {
    session.endConversation(mustache.render(Enums.BOT_GREETING_RESPONSES[_.random(Enums.BOT_GREETING_RESPONSES.length - 1)], session.message.user));
})

bot.dialog('cancel_process', function (session, args) {   
    session.endConversation(mustache.render(Enums.BOT_CANCEL_RESPONSES[_.random(Enums.BOT_CANCEL_RESPONSES.length - 1)], session.message.user));
})

//PRIVATE FUNCTIONS
var _generateTimesheetConfirmCard = function(timesheet){
    var msg = {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            type: "AdaptiveCard",
            version: "1.0",
               body: [
                   {
                       type: "Container",
                       items:[
                            {
                                "type": "TextBlock",
                                "text": "Timesheet Confirmation",
                                "size": "large",
                                "weight": "bolder"
                            },
                            {
                                type: "FactSet",
                                facts: [
                                    {
                                        title: "Date",
                                        value: timesheet.data.date
                                    },
                                    {
                                        title: "Client",
                                        value: timesheet.data.client
                                    },
                                    {
                                        title: "Type of Work",
                                        value: timesheet.data.typeOfWork
                                    },
                                    {
                                        title: "Hours Spent",
                                        value: timesheet.data.hoursSpent
                                    },
                                    {
                                        title: "Hours Billed",
                                        value: timesheet.data.hoursBilled
                                    },
                                    {
                                        title: "Description",
                                        value: timesheet.data.description
                                    }
                                ]
                            }
                       ]
                   }
                ],
                "actions": [
                    {
                        "type": "Action.Submit",
                        "title": "Yes",
                        "data": {
                            "value": "action_yes"
                        }
                    },
                    {
                        "type": "Action.Submit",
                        "title": "No",
                        "data": {
                            "value": "action_no"
                        }
                    }
                ]
        }
    }

    return msg;
};