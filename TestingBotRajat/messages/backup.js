"use strict";
var builder = require('botbuilder');
var request = require('request');
var socket = require('socket.io-client')('https://www.contentholmes.com');
var botbuilder_azure = require("botbuilder-azure");

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var version = 1.1;

var bot = new builder.UniversalBot(connector);
var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/1a3b2f38-149f-4fb6-a60e-b106101431a6?subscription-key=0fefdf81ed3d4b87b94232d361daf8f0';
var recognizer = new builder.LuisRecognizer(model);

bot.use(builder.Middleware.dialogVersion({ version: version }));

bot.beginDialogAction('help', '/help', { matches: /^help/i });
bot.beginDialogAction('login', 'firstRun');
bot.beginDialogAction('relogin', '/profile');
bot.beginDialogAction('Block', '/actions/Block');
bot.beginDialogAction('Session', '/actions/Session');
bot.beginDialogAction('Unblock', '/actions/Unblock');
bot.beginDialogAction('Unsession', '/actions/Unsession');
bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });

var intents = new builder.IntentDialog({ recognizers: [recognizer] })
.onDefault(function(session) {
    session.send("I did not understand what you said.");
    session.beginDialog('/help');
})
.matches('hi', function (session, args) {
            session.sendTyping();
            session.send("Hello %s!", session.userData.name);
    })
.matches('profile', [
    function (session) {
        updateAddress(session);
        session.beginDialog('/profile');
    },
    function (session, results) {
        if(results.result==true) {
            session.sendTyping();
            session.send('Okay! I made the changes %s :-)', session.userData.name);
        } else {
            session.userData.version = 0;
        }
    }
])
.matches('history', [
    function (session, args, next) {
        updateAddress(session);
        session.dialogData.childname = builder.EntityRecognizer.findEntity(args.entities, 'childname');
        if(!session.dialogData.childname||session.userData.childArray.indexOf((session.dialogData.childname.entity))==-1) {
            session.sendTyping();
            builder.Prompts.choice(session, "Sorry, I couldn't understand the name. Could you repeat the name please?", session.userData.childArray);
        } else {
            session.dialogData.childname = session.dialogData.childname.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) {
            session.dialogData.childname = results.response.entity;
        }
        console.log('https://www.contentholmes.com/data/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.childname);
        //Communication goes here.
        request('https://www.contentholmes.com/data/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.childname, function(error, response, body) {
            if(!error) {
                session.sendTyping();
                var res = JSON.parse(body);
                if(res.text.success==true) {
                    var sysdate = new Date();
                    session.send("Blocked sites accessed for %s as on %d/%d/%d - ", session.dialogData.childname, sysdate.getDate(), sysdate.getMonth()+1, sysdate.getFullYear());
                    res.text.answers.history.URls.forEach(function(item,index) {
                        item.time = new Date(item.time);
                        if(item.childName==session.dialogData.childname&&item.time.getDate()==sysdate.getDate()) {
                            session.send(format(item.time.getHours())+""+format(item.time.getMinutes())+" hours - "+item.url);
                        }
                    });
                } else {
                    session.send("I can't fetch that right now. Sorry :-(");
                }
            } else {
                session.send("There has been an error, please try to re-enter your data!");
            }
        });
    }
    ])
.matches('Report', [
    function(session,args,next) {
        if(!session.userData.email) {
            session.sendTyping();
            session.send("Your data is not available with me, let us go to the start :-)");
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function(session, response) {
        request('https://www.contentholmes.com/data/?email='+session.userData.email+'&password='+session.userData.password, function (error, response, body) {
            if (!error) {
                session.sendTyping();
                var res=JSON.parse(body);
                if(res.text.success==true) {
                    session.send("Report for %s - ", session.userData.child);
                    session.send("URLs -");
                    res.text.answers.history.URls.forEach(function(item,index) {
                        session.send(item.time+item.Url);
                    });
                    session.send("Depression Scores - ");
                    res.text.answers.history.depressionScores.forEach(function(item,index) {
                        session.send(item.time+item.score);
                    })
                } else {
                    session.send("Please be specific, your data is wrong. This doesn't help. Please \"Change your personal info\".");
                }
            }
        });
    }
    ])
.matches('aboutme', [
    function (session) {
        session.sendTyping();
        session.send("I am your own personal AI bot, capable of understanding normal human speech. You can ask me about -");
        builder.Prompts.text(session, createHelpCarousal(session));
        session.send("Although I work on natural language input, and can answer general queries like \"Are you real?\", to get some useful commands that always work, send \"Help\", pretty cheesy right?");
        session.send("That's all for now %s, the game is on", session.userData.name);
        session.endDialog();
    }
    ])
.matches('Name', [
    function (session) {
        session.sendTyping();
        session.send("I am Holmes. And I detect \'stuff\'. :-)");
    }
    ])
.matches('Age', [
    function (session) {
        session.sendTyping();
        session.send("Well, I first appeared in 1887 in Sir Doyle's works, but I was here long before that. I still have a knack for detective work despite my age :-P.");
    }
    ])
.matches('Location', [
    function (session) {
        session.sendTyping();
        session.send("The classic 221-B, Baker Street, London.");
    }
    ])
.matches('Language', [
    function (session) {
        session.sendTyping();
        session.send("I am proficient in many Languages known to man. Mastered to full capacity.");
    }
    ])
.matches('reality', [
    function (session) {
        session.sendTyping();
        session.send("Your questions amuse me %s. I once had a Doctor friend who asked such questions.", session.userData.name);
    }
    ])
.matches('interest', [
    function(session, args, next) {
        updateAddress(session);
        session.dialogData.name = builder.EntityRecognizer.findEntity(args.entities, 'childname');
        if(!session.dialogData.name||session.userData.childArray.indexOf((session.dialogData.name.entity))==-1) {
            session.sendTyping();
            builder.Prompts.choice(session, "Sorry, I couldn't understand the name. Could you repeat the name please?", session.userData.childArray);
        } else {
            session.dialogData.name = session.dialogData.name.entity;
            next();
        }
    },
    function(session, results, next) {
        if(results.response) {
            session.dialogData.name = results.response.entity;
        }
        session.sendTyping();
        //Get request here
        request('https://www.contentholmes.com/getinterests/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.name, function(error, response, body) {
            if(!error) {
                var res = JSON.parse(body);
                console.log(res);
                if(res.text.success==true) {
                    //Do things here
                    var carousel = [];
                    console.log(res.text.interests);
                    session.send("Here are somethings that your child likes. They'll love it when you gift them something related to it! :-)");
                    // console.log(res.text.interests);
                    for(var i = 0; i<res.text.interests.length;i++) {
                        carousel.push(new builder.HeroCard(session)
                                            .title(res.text.interests[i].title)
                                            .text("Buy something related to " + res.text.interests[i].title + " :-O")
                                            // .buttons([
                                            //     builder.CardAction.openURL(session, i.website, "Buy")
                                            // ])
                                            );
                    }
                    var msg = new builder.Message(session)
                        .attachmentLayout(builder.AttachmentLayout.carousel)
                        .attachments(carousel);
                    builder.Prompts.text(session, msg);
                } else {
                    session.send("Your info might be wrong. Can you please try logging in again?");
                }
            } else {
                session.send("Something went wrong. Please \"Change your personal info\"");
            }
        });
    }
    ])
.matches('Blocker', [
    function(session) {
        session.beginDialog('/actions/Block');
    }
    ])
.matches('Session', [
    function(session) {
        // session.beginDialog('/actions/Session');
        session.send("LOL");
    }
    ])
.matches('Unblock', [
    function(session) {
        session.beginDialog('/actions/Unblock');
    }
    ])
.matches('Unsession', [
    function(session) {
        session.beginDialog('/actions/Unsession');
    }
])
.matches('depressionscores', [
    function (session, args, next) {
        updateAddress(session);
        //Get request here
        session.dialogData.childname = builder.EntityRecognizer.findEntity(args.entities, 'childname');
        if(!session.dialogData.childname||session.userData.childArray.indexOf((session.dialogData.childname.entity))==-1) {
            session.sendTyping();
            builder.Prompts.choice(session, "Sorry, I couldn't understand the name. Could you repeat the name please?", session.userData.childArray);
        } else {
            session.dialogData.childname = session.dialogData.childname.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) {
            session.dialogData.childname = results.response.entity;
        }

        //Communication goes here.
        request('https://www.contentholmes.com/data/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.childname, function(error, response, body) {
            if(!error) {
                session.sendTyping();
                var res = JSON.parse(body);
                if(res.text.success==true) {
                    session.send("Depression Analysis Report for %s - ", session.dialogData.childname);
                    res.text.answers.history.depressionScores.forEach(function(item,index) {
                        if(item.childName==session.dialogData.childname) {
                            item.allScores.forEach(function(item, index) {
                                item.time = new Date(item.time);
                                session.send(item.time.getDate()+"/"+(item.time.getMonth()+1)+"/"+item.time.getFullYear()+":   "+depressionlookup(item.score));
                            })
                        }
                    });
                } else {
                    session.send("I can't fetch that right now. Sorry :-(");
                }
            } else {
                session.send("There has been an error, please try to re-enter your data!");
            }
        });
    }
    ]);

bot.dialog('/', intents);

bot.dialog('/profile', [
    function (session, args, next) {
        if(args) {
            session.dialogData.get = args.get;
            next();
        } else {
            session.sendTyping();
            builder.Prompts.text(session, 'What can I call you?');
        }
    },
    function (session, results) {
        if(session.dialogData.get=="email"||!session.dialogData.get) {
            session.userData.name = results.response;
            session.sendTyping();
            builder.Prompts.text(session, 'Please give me your registered email id');
        }
    },
    function (session,results) {
        if(validateEmail(results.response)) {
            session.userData.email = results.response;
            session.sendTyping();
            builder.Prompts.text(session, 'Please give me your PIN');
        } else {
            session.send("Invalid email id");
            session.replaceDialog('/profile', {"get":"email"});
        }
    },
    function (session, results) {
        session.userData.password = results.response;
        session.userData.childArray = [];

        //Get Children Array Here!
        //'https://www.contentholmes.com/data/?email='+session.userData.email+'&password='+session.userData.password
        request('https://www.contentholmes.com/childArray/?email='+session.userData.email+'&password='+session.userData.password, function(error, response, body) {
            if(!error) {
                var res = JSON.parse(body);
                if(res.text.success==true) {
                    session.userData.childArray = [].concat(res.text.childArray);
                    console.log("Here: "+session.userData.childArray[0]);
                    session.endDialogWithResult({"result":true});
                    // console.log(session.userData.childArray[1]);
                } else {
                    session.sendTyping();
                    session.send("Invalid Credentials. Please register on http://www.contentholmes.com to avail yourself to my services");
                    session.endDialogWithResult({"result":false});
                }
            } else {
                session.sendTyping();
                session.send("Your data is wrong, you need to \"Change your profile info\"");
                session.endDialogWithResult({"result":true});
            }
        });
    }
]);

bot.dialog('/help', [
    function(session) {
        session.sendTyping();
        session.send("Here are some things that you can ask me about!");
        builder.Prompts.text(session, createHelpCarousal(session));
        session.endDialog();
    } 
]).triggerAction({matches:/^help/i});

bot.dialog('/actions/Block', [
    function(session, args,next) {
        updateAddress(session);
        if(args) {
            session.dialogData.name = builder.EntityRecognizer.findEntity(args.entities, 'blocking::name');
            session.dialogData.website = builder.EntityRecognizer.findEntity(args.entities, 'blocking::website');
            session.dialogData.time = builder.EntityRecognizer.findEntity(args.entities, 'blocking::time');
        }
        session.dialogData.time = session.dialogData.time ? session.dialogData.time.entity : "Inf";
        if(!session.dialogData.name||session.userData.childArray.indexOf((session.dialogData.name.entity))==-1) {
            session.sendTyping();
            //console.log(session.userData.childArray[0]);
            builder.Prompts.choice(session, "Block for whom?", session.userData.childArray);
        } else {
            session.dialogData.name = session.dialogData.name.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) {
            // console.log(results.response.entity);
            session.dialogData.name=results.response.entity;
        }
        if(!session.dialogData.website) {
            session.sendTyping();
            builder.Prompts.text(session, "Can you tell me the website you want to block? I understand names (Eg- Facebook) and categories (Eg- Gaming Websites) as well :-).");
        } else {
            session.dialogData.website = session.dialogData.website.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) {
            session.dialogData.website = results.response;
        }
        var date = new Date();
        var expirytime; 
        if(session.dialogData.time!="Inf") {
            expirytime= new Date(date.getTime()+parseInt(session.dialogData.time)*3600000);
        } else {
            expirytime= new Date();
        }
        if(date.getDate()!=expirytime.getDate()) {
            expirytime = new Date(date.getFullYear(), date.getMonth(), date.getDate(),23,59,0,0);
        }
        console.log(expirytime.toString());
        // session
        
        //Communication goes here!
        //session.send('https://www.contentholmes.com/blockURL/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.name+'&url='+session.dialogData.website);
        request('https://www.contentholmes.com/blockURL/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.name+'&url='+session.dialogData.website+'&duration='+expirytime, function (error, response, body) {
            if(!error) {
                session.sendTyping();
                var res = JSON.parse(body);
                if(res.text.success==true) {
                    session.send("Blocked %s for %s for %s hours", session.dialogData.website, session.dialogData.name, session.dialogData.time);
                } else {
                    session.send("Oops. This is way ahead of my thinking curve. I seem to have lost my charm.");
                }
            } else {
                session.send("Something went wrong. Please \"Change your personal info\"");
            }
        });
        // session.send(session.dialogData.name);
        // session.send(session.dialogData.website);
        // session.send(session.dialogData.time);
    }
]);

bot.dialog('/actions/Session',[
    function(session, args,next) {
        updateAddress(session);
        if(args) {
            session.dialogData.name = builder.EntityRecognizer.findEntity(args.entities, 'blocking::name');
            session.dialogData.website = builder.EntityRecognizer.findEntity(args.entities, 'blocking::website');
            session.dialogData.time = builder.EntityRecognizer.findEntity(args.entities, 'blocking::time');
        }
        if(!session.dialogData.name||session.userData.childArray.indexOf((session.dialogData.name.entity))==-1) {
            session.sendTyping();
            builder.Prompts.choice(session, "Who do you need sessioning for?", session.userData.childArray);
        } else {
            session.dialogData.name = session.dialogData.name.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) {
            session.dialogData.name=results.response.entity;
        }
        if(!session.dialogData.time) {
            session.sendTyping();
            builder.Prompts.text(session, "How many hours do you need sessioning for?");
        } else {
            session.dialogData.time = session.dialogData.time.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) { 
            session.dialogData.time = results.response;
        }
        //Communication goes here!
        request('https://www.contentholmes.com/session/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.name+'&url='+session.dialogData.website+'&duration='+session.dialogData.time, function(error, response, body) {
            if(!error) {
                session.sendTyping();
                var res = JSON.parse(body);
                if(res.text.success==true) {
                    session.send("Session timings now effective for %s.", session.dialogData.name);
                } else {
                    session.send("Oops. Watson... This doesn't seem good.");
                }
            } else {
                session.send("Hmm... There seems to be some error. Sorry, I guess this functionality is not available for now.");
            }
        });
        // session.send(session.dialogData.name);
        // session.send(session.dialogData.website);
        // session.send(session.dialogData.time);
    }
]);

bot.dialog('/actions/Unblock', [
    function(session, args, next) {
        updateAddress(session);
        if(args) {
            session.dialogData.name = builder.EntityRecognizer.findEntity(args.entities, 'blocking::name');
            session.dialogData.website = builder.EntityRecognizer.findEntity(args.entities, 'blocking::website');
        }
        if(!session.dialogData.name||session.userData.childArray.indexOf((session.dialogData.name.entity))==-1) {
            session.sendTyping();
            builder.Prompts.choice(session, "So you want to unblock.. Cool! For whom?", session.userData.childArray);
        } else {
            session.dialogData.name = session.dialogData.name.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) {
            session.dialogData.name = results.response.entity;
        }
        if(!session.dialogData.website) {
            session.sendTyping();
            builder.Prompts.text(session, "Can you tell me the website you want to unblock?");
        } else {
            session.dialogData.website = session.dialogData.website.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) {
            session.dialogData.website = results.response;
        }
        
        //Communication goes here!
        request('https://www.contentholmes.com/unblockURL/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.name+'&url='+session.dialogData.website, function (error, response, body) {
            if(!error) {
                session.sendTyping();
                var res = JSON.parse(body);
                if(res.text.success==true) {
                    session.send("Unblocked %s for %s :-)", session.dialogData.website, session.dialogData.name);
                } else {
                    session.send(res.text.reason);
                }
            } else {
                session.sendTyping();
                session.send("Okay... I guess your data is wrong. Try \"Changing your info\".");
            }
        })
        // session.send(session.dialogData.name);
        // session.send(session.dialogData.website);
    }
]);

bot.dialog('/actions/Unsession',[
    function(session, args, next) {
        updateAddress(session);
        if(args) {
            session.dialogData.name = builder.EntityRecognizer.findEntity(args.entities, 'blocking::name');
            session.dialogData.website = builder.EntityRecognizer.findEntity(args.entities, 'blocking::website');
        }
        if(!session.dialogData.name||session.userData.childArray.indexOf((session.dialogData.name.entity))==-1) {
            session.sendTyping();
            builder.Prompts.choice(session, "Who is the lucky guy getting unsessioned :O? Can you give me his name?", session.userData.childArray);
        } else {
            session.dialogData.name = session.dialogData.name.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) {
            session.dialogData.name = results.response.entity;
        }
        next();
    },
    function (session, results, next) {
        if(results.response) {
            session.dialogData.website = results.response;
        }
        
        //Communication goes here!

        request('https://www.contentholmes.com/unsession/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.name+'&url='+session.dialogData.website, function (error, response, body) {
            if(!error) {
                session.sendTyping();
                var res = JSON.parse(body);
                if(res.text.success==true) {
                    session.send("Removed sessioning for %s :-)", session.dialogData.name);
                } else {
                    session.send(res.text.reason);
                }
            } else {
                session.sendTyping();
                session.send("Okay... I guess your data is wrong. Try \"Changing your info\".");
            }
        })
        // session.send(session.dialogData.name);
        // session.send(session.dialogData.website);
    }
]);

bot.dialog('firstRun', [
    function(session) {
        session.userData.version = version;
        session.send("Hey! Welcome to Content Holmes. If you've not installed the extension, visit contentholmes.com to check it out.");
        session.beginDialog('/profile');
    },
    function(session, results) {
        if(results.result==true) {
            session.sendTyping();
            session.send("Hello %s!", session.userData.name);
            // updateAddress();
        } else {
            session.userData.version = 0;
        }
        session.endDialog();
    }]).triggerAction({
    onFindAction: function (context, callback) {
        var ver = context.userData.version || 0;
        var score = ver < version ? version : 0.0;
        callback(null, score);
    },
    onInterrupted: function(session, dialogId, dialogArgs, next) {
        session.send("Sorry... We need some info from you first");
    }
});

socket.on('servermsg', function(data) {
    data = JSON.parse(data);
    var address = JSON.parse(data.address);
    var notification = data.notification;
    var msg = new builder.Message()
        .address(address)
        .text(notification);
    bot.send(msg, function(err) {});
});

function updateAddress(session) {
        if(session.userData.address!=JSON.stringify(session.message.address)) {
            session.userData.address = JSON.stringify(session.message.address);
            request('https://www.contentholmes.com/sendID/?email='+session.userData.email+'&password='+session.userData.password+'&id='+JSON.stringify(session.message.address), function(error, response, body) {});
        }
}

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function format(digit) {
    if(digit/10<1) {
        return "0"+digit;
    }
    return digit;
}

function depressionlookup(score) {
    score = parseInt(score);
    if(score<=-30) {
        return "Depressed ("+score+")";
    } else if (score<=-15) {
        return "Too sad ("+score+")";
    } else if (score<=-9) {
        return "Sad, but nothing to worry :-) ("+score+")";
    } else if (score<=0) {
        return "Normal ("+score+")";
    } else if (score<=6) {
        return "Somewhat happy ("+score+")";
    } else if (score<=15) {
        return "Happy ("+score+")";
    } else {
        return "Doing extremely well ("+score+")";
    }
}

function createHelpCarousal(session) {
    var carousal = [];
    carousal.push(new builder.HeroCard(session)
        .title("Block a website")
        .buttons([
            builder.CardAction.dialogAction(session, "Block", "","Block")
        ])
    );

    carousal.push(new builder.HeroCard(session)
        .title("Unblock a website")
        .buttons([
            builder.CardAction.dialogAction(session, "Unblock", "","Unblock")
        ])
    );

    carousal.push(new builder.HeroCard(session)
        .title("Put up an internet session")
        .buttons([
            builder.CardAction.dialogAction(session, "Session", "","Session")
        ])
    );

    carousal.push(new builder.HeroCard(session)
        .title("Remove an internet session")
        .buttons([
            builder.CardAction.dialogAction(session, "Unsession", "","Unsession")
        ])
    );
    
    var msg = new builder.Message(session)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(carousal);
    return msg;
}


if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    module.exports = { default: connector.listen() }
}