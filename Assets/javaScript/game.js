$(document).ready(function () {

    var config = {
        apiKey: "AIzaSyBjXbvyBUycJ1Y-tcRxqdsKgkcM5eotg8U",
        authDomain: "rps-multiplayer-1.firebaseapp.com",
        databaseURL: "https://rps-multiplayer-1.firebaseio.com",
        projectId: "rps-multiplayer-1",
        storageBucket: "rps-multiplayer-1.appspot.com",
        messagingSenderId: "617734964098"
    };

    firebase.initializeApp(config);

    var database = firebase.database();
    var yourPlayer = firebase.auth().currentUser;
    var chat = database.ref("/chat")

    //SIGN IN FUNCTIONS VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV

    function createAccount() {
        event.preventDefault();
        console.log("wooo")
        var displayID = $("#userNameEntry").val().trim();
        var email = $("#emailEntry").val().trim();
        var password = $("#passwordEntry").val().trim();

        firebase.auth().createUserWithEmailAndPassword(email, password).then(function () {
            //add the display name after the user is done being created 
            firebase.auth().currentUser.updateProfile({ displayName: displayID });
        });
    }

    function signInFn() {
        event.preventDefault();
        var email = $("#emailLogin").val().trim();
        var password = $("#passwordLogin").val().trim();
        firebase.auth().signInWithEmailAndPassword(email, password);
    }


    function authStateChangeListener(user) {
        //signin
        if (user) {
            //perform login operations
            event.preventDefault();
            //change login visibility
            $(".signInPage").css({ "opacity": "0" })
            $(".signInPage").css({ "z-index": "0" })
            // Chat.onlogin();
            // Game.onlogin();
            //this whole section creates a score card for each user upon sign up
            disNombre = firebase.auth().currentUser.displayName
            var scoreExists = database.ref("/score/" + disNombre + "/")
            if (!scoreExists) {
                scoreInit();
            }
            var scoreRef = database.ref("/score/" + firebase.auth().currentUser.displayName + "/")
            //needs to run on startup, but after user authentication
            scoreRef.on("value", function(snapshot){
                ties = snapshot.val().ties
                wins = snapshot.val().wins
                losses = snapshot.val().losses
                $("#lossesTarget").text(losses)
                $("#winsTarget").text(wins)
                $("#tiesTarget").text(ties)
            })

        } else {
            //signout
            // window.location.reload();
        }
    }

    $(document).on("submit", "#signUp", createAccount)
    $(document).on("submit", "#signIn", signInFn)
    firebase.auth().onAuthStateChanged(authStateChangeListener);

    //SIGN IN FUNCTIONS ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    //CHAT FUNCTIONS VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV

    function chatFunction() {
        //push the message and the name of the player into /chat database on clicking "send"
        var yourPlayer = firebase.auth().currentUser
        chat.push().set({
            name: yourPlayer.displayName,
            message: $("#message-field").val().trim()
        })
    }

    //run chatFunction when the send message button is sent
    $("#message-send-button").on("click", chatFunction);

    //display new messages each time something is added to chat
    chat.on("child_added", function (snapshot) {
        var mess = snapshot.val();
        //build a better way to view this
        $("#chatTarget").append("<br>" + mess.name + " - " + mess.message)

    })

    //CHAT FUNCTIONS ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    //redefining for convenience
    var database = firebase.database();
    yourPlayer = firebase.auth().currentUser;
    var chat = database.ref("/chat")

    //SCORE Functions VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV

    //creating new score
    var scoreCardInit = {
        wins: 0,
        losses: 0,
        ties: 0,
    }
    //initializing score for new players
    function scoreInit() {
        // yourPlayer = firebase.auth().currentUser;
        disNombre = firebase.auth().currentUser.displayName
        database.ref("/score/" + disNombre + "/").update(scoreCardInit)
    }

    //SCORE FUNCTIONS ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    //MATCH FUNCTIONS VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV

    STATE = { OPEN: 1, JOINED: 2, WAIT_MOVE: 3, GAME_OVER: 4 }

    //location reference for our games in db
    gamesRef = firebase.database().ref("/games")
    //variable that categorizes games availble
    var openGames = gamesRef.orderByChild("state").equalTo(STATE.OPEN)
    //stores the unique ID for the game we are associated with
    var gameLoc;
    //testing
    var gameName;
    //score vars
    var ties;
    var wins;
    var losses;

    //function for if you're creating game
    function newGame() {
        //new game object created with information about the person who created it and set to open.
        yourPlayer = firebase.auth().currentUser;
        yourPlayerDisplayName = yourPlayer.displayName
        var currentGame = {
            creator: {
                uid: yourPlayer.uid,
                displayName: yourPlayer.displayName,
                move: null,
            },
            state: STATE.OPEN
        }
        //game object pushed into our /game DB
        firebase.database().ref("/games/" + yourPlayerDisplayName + "/").update(currentGame);
        $("#myGame").html("<button> SEARCHING </button>");
        gamePlay(yourPlayerDisplayName);
    }

    //adds buttons to opponents screens
    function addGameButton(key, name) {
        var $button = $("<button>").text(key).attr("id", name.creator.uid).addClass("gameButton")
        $("#availableGames").append($button)
    }

    //joining game
    function joinGame(event) {

        gameName = event.target.innerText;
        gameLoc = firebase.database().ref("/games/" + gameName + "/");
        var yourPlayer = firebase.auth().currentUser;

        // ensures that multiple people dont click on the same game
        gameLoc.transaction(function (gameLoc) {

            //if there is only a creator on the clicked game and no 2nd player, then we'll create one and set it equal to the information stored about us, the player.
            if (!gameLoc.joiner) {
                joinObject = {
                    state: STATE.JOINED,
                    joiner: {
                        uid: yourPlayer.uid,
                        displayName: yourPlayer.displayName
                    }
                };
                //return joinObject into the db
                firebase.database().ref("/games/" + gameName + "/").update(joinObject);
                //add a message that says XYZ game joined
                //change from searching to found
            } else {
                alert("Game full! Pick another Game")
            }
        }).then(function () {
            //display "GAME ACTIVE"
            $(".con1").css({ "background-color": "orange" })
            //playing opponent "x"
            console.log("made it this far")
            gamePlay(gameName)

        })
    }

    //gameState #2
    function joinedGame(game, gameName) {

        var stateUpdate = {
            state: STATE.WAIT_MOVE
        }
        $("#htmlGameArea").css({ "display": "none" })
        if (game.creator.uid === firebase.auth().currentUser.uid) {
            //this is what happens to the creator when a person joins the game
            $(".con1").css({ "background-color": "orange" })
        }
        gameLoc.on("value", function(){
            if (game.creator.uid === firebase.auth().currentUser.uid) {
                yourMove = game.creator.move;
                enemyMove = game.joiner.move
                $("#playerGuess").text(yourMove)
                $("#computerGuess").text(enemyMove)
            } else {
                yourMove = game.joiner.move;
                enemyMove = game.creator.move
                $("#playerGuess").text(yourMove)
                $("#computerGuess").text(enemyMove)
            }
        })
        $(".firstMove").on("click", function (event) {
            //event that fires on the choice of a move (triggered in state #2). then in state #3, we will check to make sure both players have the new data we are pushing in this step.
            playerMove = event.target.id
            var moveData = {
                move: playerMove
            }
            if (game.creator.uid === firebase.auth().currentUser.uid) {
                //if this works, we will push moveData to creator
                //else, push to joiner
                console.log("we are cooking with jet fuel")
                firebase.database().ref("/games/" + gameName + "/creator/").update(moveData)
            } else {
                firebase.database().ref("/games/" + gameName + "/joiner/").update(moveData)
            }
            //display opposing player move
        })
        alert("Waiting for other player");
        gameLoc.update(stateUpdate);

    }

    //gameState #3 
    function checkMoves(game, gameName) {
        if (game.joiner.move != undefined && game.creator.move != undefined) {
            var stateUpdate = {
                state: STATE.GAME_OVER
            }
            console.log("bazinga")
            var creMove = game.creator.move;
            var joiMove = game.joiner.move;
            //all game logic for checking wins and losses
            var youVar;
            if (game.creator.uid === firebase.auth().currentUser.uid) {
                youVar = true;
                yourMove = game.creator.move;
                enemyMove = game.joiner.move
                $("#playerGuess").text(yourMove)
                $("#computerGuess").text(enemyMove)
            } else {
                youVar = false;
                yourMove = game.joiner.move;
                enemyMove = game.creator.move
                $("#playerGuess").text(yourMove)
                $("#computerGuess").text(enemyMove)
            }
            //tie logic
            if (creMove === joiMove) {
                alert("TIE GAME MOTHER FUCKER")
                ties = ties + 1;
                var tiesDB = {
                    ties: ties
                }
                database.ref("/score/" + firebase.auth().currentUser.displayName + "/").update(tiesDB)
                $("#tiesTarget").text(ties)
                gameLoc.update(stateUpdate);

            }

            if (((youVar) && ((creMove === "rock" && joiMove === "scissors") || (creMove === "scissors" && joiMove === "paper") || (creMove === "paper" && joiMove === "rock"))) || ((youVar != true) && ((joiMove === "rock" && creMove === "scissors") || (joiMove === "scissors" && creMove === "paper") || (joiMove === "paper" && creMove === "rock")))) {
                alert("YOURE A WINNER")
                wins = wins + 1;
                var winsDB = {
                    wins: wins
                }
                database.ref("/score/" + firebase.auth().currentUser.displayName + "/").update(winsDB)
                $("#winsTarget").text(wins)
                gameLoc.update(stateUpdate);
            }
            if (((youVar != true) && ((creMove === "rock" && joiMove === "scissors") || (creMove === "scissors" && joiMove === "paper") || (creMove === "paper" && joiMove === "rock"))) || ((youVar) && ((joiMove === "rock" && creMove === "scissors") || (joiMove === "scissors" && creMove === "paper") || (joiMove === "paper" && creMove === "rock")))) {
                alert("YOU LOSE BITCH")
                losses = losses + 1;
                var lossesDB = {
                    losses: losses
                }
                database.ref("/score/" + firebase.auth().currentUser.displayName + "/").update(lossesDB)
                $("#lossesTarget").text(losses)
                gameLoc.update(stateUpdate);
            }
        }
    }

    //gameState #4
    function gameReset(game, gameName){
        alert("good game! Play again!");
        firebase.database().ref("/games/" + gameName).remove();
        $("#myGame").empty();
        $("#availableGames").empty();
        $("#playerGuess").text("")
        $("#computerGuess").text("")
        
        $(".con1").css({"background-color": "rgba(40, 255, 172, 0.959)"});
        $("#htmlGameArea").css({ "display": "initial"})
    }


    //follow gameplay logic
    function gamePlay(gameName) {
        gameLoc = firebase.database().ref("/games/" + gameName + "/");

        gameLoc.on("value", function (snapshot) {
            game = snapshot.val()
            if (game.state === 2) {
                joinedGame(game, gameName)
            }
            if (game.state === 3) {
                checkMoves(game, gameName)
            }
            if(game.state === 4){
                gameReset(game, gameName)
            }
        })
    }

    //GAME CALLS###########################
    //on click new game, create new game
    $("#createGame").on("click", newGame);

    //listens for all children added to games and add buttons to our screens if somebody else made them.
    openGames.on("child_added", function (snapshot) {
        var gameName = snapshot.val()
        if (gameName.creator.uid != firebase.auth().currentUser.uid) {
            addGameButton(snapshot.key, gameName);
        }
    })

    //on click of game, join
    $(document).on("click", ".gameButton", joinGame)

})
