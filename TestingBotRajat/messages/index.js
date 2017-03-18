"use strict";
var builder = require('botbuilder');
var request = require('request');
var socket = require('socket.io-client')('http://tfoxtrip.com');
var botbuilder_azure = require("botbuilder-azure");

// var server = restify.createServer();
// server.listen(process.env.port || process.env.PORT || 3978, function () {
//    console.log('%s listening to %s', server.name, server.url);
// });

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

// var connector = new builder.ChatConnector({
//     appId: process.env.MICROSOFT_APP_ID,
//     appPassword: process.env.MICROSOFT_APP_PASSWORD
// });
var bot = new builder.UniversalBot(connector);
// server.post('/api/messages', connector.listen());
var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/1a3b2f38-149f-4fb6-a60e-b106101431a6?subscription-key=0fefdf81ed3d4b87b94232d361daf8f0';
var recognizer = new builder.LuisRecognizer(model);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
.onDefault(builder.DialogAction.send('I\'m not sure what you mean...'))
.matches('hi', [
    function (session, args, next) {
        if (!session.userData.name) {
            session.sendTyping();
            session.send('Hey, I am Content Holmes a.k.a CH. I\'ll be your assistant with the app.');
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function (session, results) {
        session.sendTyping();
        updateAddress(session);
        session.send('Hello %s!', session.userData.name);
    }
    ])
.matches('profile', [
    function (session) {
        updateAddress();
        session.beginDialog('/profile');
    },
    function (session, results) {
        session.sendTyping();
        session.send('Okay! I made the changes %s :-)', session.userData.name);
    }
])
.matches('history', [
    function (session, args, next) {
        updateAddress(session);
        session.dialogData.childname = builder.EntityRecognizer.findEntity(args.entities, 'childname');
        if(!session.dialogData.childname) {
            session.sendTyping();
            builder.Prompts.text(session, "Sorry, I couldn't understand the name. Could you repeat?");
        } else {
            session.dialogData.childname = session.dialogData.childname.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) {
            session.dialogData.childname = results.response;
        }
        console.log('http://tfoxtrip.com/data/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.childname);
        //Communication goes here.
        request('http://tfoxtrip.com/data/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.childname, function(error, response, body) {
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
        request('http://tfoxtrip.com/data/?email='+session.userData.email+'&password='+session.userData.password, function (error, response, body) {
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
        session.send("1. Recent history of all children");
        session.send("2. Depression profile of all children");
        session.send("3. Blocking sites externally for some time for all children");
        session.send("4. Session Restrictions for daily usage of websites")
        session.send("5. Change your profile :-)");
        session.send("Although I work on natural anguage input, and can answer general queries like \"Are you real?\", to get some useful commands that always work, send \"Help\", pretty cheesy right?");
        session.send("That's all for now %s, the game is on", session.userData.name);
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
        session.send("Well, I first appeared in 1887 in Sir Doyle's works, but I was here long before that. I still have a knack for detective work depite my age :-P.");
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
.matches('Blocker', [
    function(session, args,next) {
        updateAddress(session);
        session.dialogData.name = builder.EntityRecognizer.findEntity(args.entities, 'blocking::name');
        session.dialogData.website = builder.EntityRecognizer.findEntity(args.entities, 'blocking::website');
        session.dialogData.time = builder.EntityRecognizer.findEntity(args.entities, 'blocking::time');
        session.dialogData.time = session.dialogData.time ? session.dialogData.time.entity : "Inf";
        // session.send(args);
        // console.log(session.userData.childArray[0]);
        if(!session.dialogData.name) {
            session.sendTyping();
            // console.log(session.userData.childArray[0]);
            builder.Prompts.choice(session, "Sorry, I couldn't understand the name. Could you repeat?", session.userData.childArray);
        } else {
            session.dialogData.name = session.dialogData.name.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) {
            session.dialogData.name=results.response.entity;
        }
        if(!session.dialogData.website) {
            session.sendTyping();
            builder.Prompts.text(session, "I couldn't recognize the website. Please re-enter.");
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
        session.send('http://tfoxtrip.com/blockURL/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.name+'&url='+session.dialogData.website);
        request('http://tfoxtrip.com/blockURL/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.name+'&url='+session.dialogData.website+'&duration='+expirytime, function (error, response, body) {
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
    ])
.matches('Session', [
    function(session, args,next) {
        updateAddress(session);
        session.dialogData.name = builder.EntityRecognizer.findEntity(args.entities, 'blocking::name');
        session.dialogData.website = builder.EntityRecognizer.findEntity(args.entities, 'blocking::website');
        session.dialogData.time = builder.EntityRecognizer.findEntity(args.entities, 'blocking::time');
        session.dialogData.website = session.dialogData.website ? session.dialogData.website.entity : "Inf";
        //session.send(args);
        if(!session.dialogData.name) {
            session.sendTyping();
            builder.Prompts.text(session, "Sorry, I couldn't understand the name. Could you repeat?");
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
            builder.Prompts.text(session, "I couldn't recognize the time. Please re-enter.");
        } else {
            session.dialogData.website = session.dialogData.website.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) { 
            session.dialogData.time = results.response;
        }
        
        //Communication goes here!
        request('http://tfoxtrip.com/session/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.name+'&url='+session.dialogData.website+'&duration='+session.dialogData.time, function(error, response, body) {
            if(!error) {
                session.sendTyping();
                var res = JSON.parse(body);
                if(res.text.success==true) {
                    session.send("Session timings on %s are now effective for %s.", session.dialogData.website, session.dialogData.name);
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
    ])
.matches('Unblock', [
    function(session, args, next) {
        updateAddress(session);
        session.dialogData.name = builder.EntityRecognizer.findEntity(args.entities, 'blocking::name');
        session.dialogData.website = builder.EntityRecognizer.findEntity(args.entities, 'blocking::website');
        if(!session.dialogData.name) {
            session.sendTyping();
            builder.Prompts.choice(session, "Sorry, I couldn't understand the name. Could you repeat?", session.userData.childArray);
        } else {
            session.dialogData.name = session.dialogData.name.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) {
            session.dialogData.name = results.response;
        }
        if(!session.dialogData.website) {
            session.sendTyping();
            builder.Prompts.text(session, "I couldn't recognize the website. Please re-enter.");
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
        request('http://tfoxtrip.com/unblockURL/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.name+'&url='+session.dialogData.website, function (error, response, body) {
            if(!error) {
                session.sendTyping();
                var res = JSON.parse(body);
                if(res.text.success==true) {
                    session.send("Unblocked %s for %s", session.dialogData.website, session.dialogData.name);
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
    ])
.matches('Unsession', [
    function(session, args, next) {
        updateAddress(session);
        session.dialogData.name = builder.EntityRecognizer.findEntity(args.entities, 'blocking::name');
        session.dialogData.website = builder.EntityRecognizer.findEntity(args.entities, 'blocking::website');
        if(!session.dialogData.name) {
            session.sendTyping();
            builder.Prompts.choice(session, "Sorry, I couldn't understand the name. Could you repeat?", session.userData.childArray);
        } else {
            session.dialogData.name = session.dialogData.name.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) {
            session.dialogData.name = results.response;
        }
        if(!session.dialogData.website) {
            session.sendTyping();
            builder.Prompts.text(session, "I couldn't recognize the website. Please re-enter.");
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

        request('http://tfoxtrip.com/unsession/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.name+'&url='+session.dialogData.website, function (error, response, body) {
            if(!error) {
                session.sendTyping();
                var res = JSON.parse(body);
                if(res.text.success==true) {
                    session.send("Unsessioned %s for %s", session.dialogData.website, session.dialogData.name);
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
    ])
.matches('Help', [
    function (session) {
        session.sendTyping();
        session.send("Here are some queries that always work -");
        session.send("To change your login details - Change my info");
        session.send("To request Depression Reports - How depressed is <Child name>?");
        session.send("To block a URL - Block <Site name> for <Child name> for <Time in hours>");
        session.send("To unblock a URL - Unblock <Site name> for <Child name>");
        session.send("To issue session timings - Session <Child name>'s <Website name> for <Time>");
        session.send("To remove session instructions - Unsession <Child name>'s <Website Name>");
        session.send("--------------That's All Folks--------------");
    }
    ])
.matches('depressionscores', [
    function (session, args, next) {
        updateAddress(session);
        //Get request here
        session.dialogData.childname = builder.EntityRecognizer.findEntity(args.entities, 'childname');
        if(!session.dialogData.childname) {
            session.sendTyping();
            builder.Prompts.text(session, "Sorry, I couldn't understand the name. Could you repeat?");
        } else {
            session.dialogData.childname = session.dialogData.childname.entity;
            next();
        }
    },
    function (session, results, next) {
        if(results.response) {
            session.dialogData.childname = results.response;
        }

        //Communication goes here.
        request('http://tfoxtrip.com/data/?email='+session.userData.email+'&password='+session.userData.password+'&childName='+session.dialogData.childname, function(error, response, body) {
            if(!error) {
                session.sendTyping();
                var res = JSON.parse(body);
                if(res.text.success==true) {
                    session.send("Depression Analysis Report for %s - ", session.dialogData.childname);
                    res.text.answers.history.depressionScores.forEach(function(item,index) {
                        if(item.childName==session.dialogData.childname) {
                            item.time = new Date(item.time);
                            session.send(item.time.getDate()+"/"+(item.time.getMonth()+1)+"/"+item.time.getFullYear()+":   "+depressionlookup(item.score));
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
    function (session) {
        session.sendTyping();
        builder.Prompts.text(session, 'What can I call you?');
    },
    // function (session, results) {
    //     session.sendTyping();
        // session.userData.name = results.response;
    //     builder.Prompts.text(session, 'What\'s your child\'s name?');
    // },
    function (session, results) {
        // session.userData.child = results.response;
        session.userData.name = results.response;
        session.sendTyping();
        builder.Prompts.text(session, 'Please give me your registered email id');
    },
    function (session,results) {
        session.userData.email = results.response;
        session.sendTyping();
        builder.Prompts.text(session, 'Please give me your PIN');
    },
    function (session, results) {
        session.userData.password = results.response;
        session.userData.childArray = [];

        //Get Children Array Here!
        //'http://tfoxtrip.com/data/?email='+session.userData.email+'&password='+session.userData.password
        request('http://tfoxtrip.com/childArray/?email='+session.userData.email+'&password='+session.userData.password, function(error, response, body) {
            if(!error) {
                var res = JSON.parse(body);
                if(res.text.success==true) {
                    session.userData.childArray = [].concat(res.text.childArray);
                    // console.log(session.userData.childArray[0]);
                    // console.log(session.userData.childArray[1]);
                } else {
                    session.sendTyping();
                    session.send("I guess you've added no children yet. And maybe this extension is not for you. :D");
                }
            } else {
                session.sendTyping();
                session.send("Your data is wrong, you need to \"Change your profile info\"");
            }
        })
        // console.log(session.userData.childArray[0]);
        session.endDialog();
    }
]);

socket.on('servermsg', function(data) {
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
            request('http://tfoxtrip.com/sendID/?email='+session.userData.email+'&password='+session.userData.password+'&id='+JSON.stringify(session.message.address), function(error, response, body) {});
        }
}

function format(digit) {
    if(digit/10<1) {
        return "0"+digit;
    }
    return digit;
}

function depressionlookup(score) {
    score = parseInt(score);
    if(score<=-10) {
        return "Depressed";
    } else if (score<=-5) {
        return "Too sad";
    } else if (score<=-3) {
        return "Sad, but nothing to worry :-)";
    } else if (score<=0) {
        return "Normal"
    } else if (score<=2) {
        return "Somewhat happy";
    } else if (score<=5) {
        return "Happy";
    } else {
        return "Doing extremely well";
    }
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