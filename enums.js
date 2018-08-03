const constants = {
    BOT_ENDPOINT: "/api/messages",
    BOT_GREETING_RESPONSES: [
        "Good day to you {{{name}}}. How can I be of assistance?",
        "Hello there {{{name}}}. How can I help today?",
        "At your service {{{name}}}. What can I do for you?"
    ],
    BOT_CANCEL_RESPONSES: [
        "Conversation cancelled. Have a great day further.",
        "I've cancelled the conversation. Thank you for your patience."
    ],
    BOT_THANK_YOU_RESPONSES: [
        "You're very welcome {{{name}}}.",
        "The pleasure is mine {{{name}}}. Have a great day further.",
        "One is happy to be of service {{{name}}}."
    ],
    BOT_EXCEPTION_RESPONSES: [
        "Sorry {{{name}}}. I didn't get your meaning. Please try again or you can cancel this conversation."
    ],
    CHOICE_TYPE_OF_WORK: [
        "Bug",
        "Consulting",
        "Sales",
        "Support"
    ],
    CHOICE_YES_NO: [
        "Yes",
        "No"
    ],
    MODEL_TIMESHEET: {
        date: null,
        typeOfWork: null,
        client: null,
        hoursSpent: null,
        hoursBilled: null,
        description: null, 
    },
    CONfIG_LUIS: {
        appId: process.env.LUIS_APP_ID,
        subscriptionKey: process.env.LUIS_SUBSCRIPTION_KEY,
        serviceEndpoint: process.env.LUIS_SERVICE_ENDPOINT,
        appUrl: process.env.LUIS_APP_URL
    },
    CONFIG_MICROSOFT: {
        appId: process.env.MICROSOFT_APP_ID,
        appPassword: process.env.MICROSOFT_APP_PASSWORD
    },
};

module.exports = constants;