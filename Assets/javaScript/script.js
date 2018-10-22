

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
        } else {
            //signout
            // window.location.reload();
        
        }
    }

    $(document).on("submit", "#signUp", createAccount)

    $(document).on("submit", "#signIn", signInFn)



    firebase.auth().onAuthStateChanged(authStateChangeListener);

    //optional google sign in
    // function googleSignin(googleUser) {
    //     var credential = firebase.auth.GoogleAuthProvider.credential({
    //         "idToken": googleUser.getAuthResponse().id_token
    //     });
    //     firebase.auth().signInWithCredential(credential);
    // }

    // $(document).on("click", "#google-button", googleSignin)

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
        console.log(yourPlayer);
        //build a better way to view this
        $("#chatTarget").append("<br>" + mess.name)
        $("#chatMessage").append("<br>" + mess.message)
    })

    //CHAT FUNCTIONS ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    //MATCH FUNCTIONS VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV

    STATE = { OPEN: 1, JOINED: 2, WAIT_MOVE: 3, GAME_OVER: 4 }

    //location reference for our games in db
    ref = firebase.database().ref("/games")
    //variable that categorizes games availble
    var openGames = ref.orderByChild("state").equalTo(STATE.OPEN)
    //stores the unique ID for the game we are associated with
    var gameLoc;

    //function for if your creating game
    function newGame() {
        //new game object created with information about the person who created it and set to open.

        var yourPlayer = firebase.auth().currentUser
        var name = yourPlayer
        console.log(name)
        var currentGame = {
            creator: { 
                uid: yourPlayer.uid, 
                displayName: yourPlayer.displayName 
            },
            state: STATE.OPEN
        }
        console.log(currentGame)
        //game object pushed into our /game DB
        ref.push().set(currentGame)

    }

    //function for if your joining a game
    function joinGame(event) {


        gameLoc = event.target.id
        //local reference to the /game location in the database
        console.log(gameLoc)

        //local reference to your displayName
        var yourPlayer = firebase.auth().currentUser

        //variable for the path to the game you just clicked on

        var gameRef = ref.child(gameLoc)
        console.log(gameRef)

        //transaction allows only one person to interact with a section of the database at a time and ensures that multiple people dont click on the same game
        gameRef.transaction(function (game) {
            console.log(gameRef)

            //if there is only a creator on the clicked game and no 2nd player, then we'll create one and set it equal to the information stored about us, the player.
            if (!game.joiner) {
                game.state = STATE.JOINED;
                game.joiner = { uid: yourPlayer.uid, displayName: yourPlayer.displayName }
            }
            //return game into the db
            return game;
        }).then(function () {
            //display "GAME ACTIVE"
            //playing opponent "x"
            console.log(gameRef)
            watchGame(gameLoc);
        })
    }

    //adds buttons to opponents screens
    function addGameButton(key, name) {
        var $button = $("<button>").text(name).attr("id", key).addClass("gameButton")
        $("#availableGames").append($button)
    }

    //on click new game, create new game
    $("#createGame").on("click", newGame);

    //on click of game, join
    $(document).on("click", ".gameButton", joinGame)

    //listens for all children added to games and add buttons to our screens if somebody else made them.
    openGames.on("child_added", function (snapshot) {
        var gameName = snapshot.val()
        console.log(snapshot)
        console.log(snapshot.key)
        if (gameName.creator.uid != firebase.auth().currentUser.uid) {
            addGameButton(snapshot.key, gameName);
        }
    })


    openGames.on("child_removed", function (snapshot) {
        var oldButton = $("#" + snapshot.key)

        if (oldButton) {
            oldButton.remove();
        }
    })

    //MATCH FUNCTION ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //DURING GAME VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV
    // STATE = { OPEN: 1, JOINED: 2, WAIT_MOVE: 3, GAME_OVER: 4}

    function watchGame(gameLoc) {

        var gameRef = ref.child(gameLoc)

        gameRef.on("value", function (snapshot) {
            var game = snapshot.val();

            if (!game.creator.moveP1 || !game.joiner.moveP1) {
                console.log("listening")
                $("#rock").on("click", function (event) {
                    var moveP1 = event.target.id;
                    $("#playerGuess").text(moveP1)
                    var data = {};
                    var myID;

                    console.log(game.creator.uid)
                    console.log(firebase.auth().currentUser.uid)
                    if (game.creator.uid == firebase.auth().currentUser.uid) {
                        data["creator/myMove"] = moveP1;
                        myID = 1;
                    } else {
                        data["joiner/myMove"] = moveP1;
                        myID = 2;
                    }
                    gameRef.update(data);
                })
                $("#paper").on("click", function (event) {
                    var moveP1 = event.target.id;
                    $("#playerGuess").text(moveP1)
                    var data = {};
                    var myID;

                    console.log(game.creator.uid)
                    console.log(firebase.auth().currentUser.uid)
                    if (game.creator.uid == firebase.auth().currentUser.uid) {
                        data["creator/myMove"] = moveP1;
                        myID = 1;
                    } else {
                        data["joiner/myMove"] = moveP1;
                        myID = 2;
                    }
                    gameRef.update(data);
                })
                $("#scissors").on("click", function (event) {
                    var moveP1 = event.target.id;
                    $("#playerGuess").text(moveP1)
                    var data = {};
                    var myID;

                    console.log(game.creator.uid)
                    console.log(firebase.auth().currentUser.uid)
                    if (game.creator.uid == firebase.auth().currentUser.uid) {
                        data["creator/myMove"] = moveP1;
                        myID = 1;
                    } else {
                        data["joiner/myMove"] = moveP1;
                        myID = 2;
                    }
                    gameRef.update(data);
                }

                )
            }
        })
    }




    // switch (game.state) {
    //     case STATE.JOINED: makeMove(gameRef, game); break;

    //     //push your move into gameDB and display
    //     //add to state
    //     case STATE.WAIT_MOVE: determineWinner(gameRef, game); break;

    //     case STATE.GAME_OVER: resetGame(gameRef, game); break;

    // }




    function makeMove(gameRef, game) {

        var gameRef = ref.child(gameLoc)
        var btns = $(".firstMove")



        gameRef.forEach(function () {
            $(".firstMove").on("click", function (event) {
                var moveP1 = event.target.id;
                $("#playerGuess").text(moveP1)
                var data = {};
                var myID;

                console.log(game.creator.uid)
                console.log(firebase.auth().currentUser.uid)
                if (game.creator.uid == firebase.auth().currentUser.uid) {
                    data["creator/myMove"] = moveP1;
                    myID = 1;
                } else {
                    data["joiner/myMove"] = moveP1;
                    myID = 2;
                }
                gameRef.update(data);
                //display waiting until secont move
            })
        })
        // .then(function(){
        //     if(game.creator.myID + game.joiner.myID === 3){
        //         console.log("wait")
        //     }
        // })
    }
    //  else {
    //     console.log("WHOA")
    //     var data = { state: STATE.WAIT_MOVE };
    //     gameRef.update(data)
    // }




    function determineWinner(gameRef, game) {

        var gameRef = ref.child(gameLoc)

        if ((game.creator.uid == firebase.auth().currentUser.uid)) {
            data["creator/myMove"] = moveP1;
        } else {
            data["joiner/myMove"] = moveP1;
        }
        gameRef.update(data);
    }


})








// var usersConnected = database.ref(".info/connected");
// var trueFalseUserCount = database.ref("/totalPlayers")
// var userInfo = database.ref("/userInfo")
// var messaging = database.ref("/messaging");
// var userName;
// var playerNumber;
// var move = "waiting"
// var keyArray=[]

// $(document).ready(function () {
//     //what happens on submitting name(basically whole game starts)
//     userInfo.limitToLast().on("child_added")("child_added", function(snapshot){
//         console.log("wtf")
//     })

//     $(document).on("submit", "form", function () {

//         //preventing refresh
//         event.preventDefault();

//         //grabbing username input value
//         userName = $("#userNameEntry").val().trim();

//         //making the sign in screen go bye bye
//         $(".signInPage").css({ "opacity": "0" })
//         $(".signInPage").css({ "z-index": "0" })


//         //what functions to run when user comes online
//         usersConnected.on("value", function (snap) {

//             if (snap.val()) {

//                 console.log(snap)
//                 var connected = trueFalseUserCount.push(true)
//                 //if trueFalseUserCount.children === 2{}

//                 //what to do when a player disconnects
//                 connected.onDisconnect().remove();

//                 //setting up new user subcatagory in db referenced under the persons newly created username
//                 var player = userInfo.push({
//                     name: userName,
//                     // move: move
//                 })

//                 player.onDisconnect().remove();



//             }
//         })
//     })

//     userInfo.on("child_added", function (snapshot) {
//         console.log(snapshot.val())
//         // var userNumber = snapshot.numChildren()
//         // if(userNumber == 2){
//         // console.log(userInfo)
//         snapshot.forEach(function (childSnapshot) {
//             // key will be "ada" the first time and "alan" the second time

//             var opponent = childSnapshot.val()
//             console.log(opponent)
//             // childData will be the actual contents of the child

//             $("#player2").text(opponent)
//             $("#player1").text(userName)

//             // if(j=1){
//             //     return true;
//             // }
//             // j++;

//         })})
    // }
    // childData will be the actual contents of the child

    //  else {

    //     $("#player2").text(snapshot.val())
    // }


        // var dbUserName = snapshot.child("name").val()
        // console.log(snapshot.val())
        // console.log(snapshot.child("name/first"))
        // $("#player" + i).text(dbUserName)
        // i--;
    // })

    // userInfo.on("child_changed", function(snapshot){
    //     console.log("hey")
    //     var dbUserName = snapshot.child("name").val()
    //     console.log(snapshot.val())
    //     console.log(snapshot.child("name").val())
    //     $("#player" + i).text(dbUserName)
    //     i++;
    // })

//     userInfo.on("child_removed", function (snapshot) {
//         $("#player2").append("DISCONNECTED")
//         keyArray = []
//         // i++;
//     })
// })


