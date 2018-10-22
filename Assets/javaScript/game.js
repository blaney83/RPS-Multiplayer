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

    //redefining for convenience
    var database = firebase.database();
    yourPlayer = firebase.auth().currentUser;
    var chat = database.ref("/chat")

    //MATCH FUNCTIONS VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV

    STATE = { OPEN: 1, JOINED: 2, WAIT_MOVE: 3, GAME_OVER: 4 }

    //location reference for our games in db
    gamesRef = firebase.database().ref("/games")
    //variable that categorizes games availble
    var openGames = gamesRef.orderByChild("state").equalTo(STATE.OPEN)
    //stores the unique ID for the game we are associated with
    var gameLoc;

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
    }

    //on click new game, create new game
    $("#createGame").on("click", newGame);

    //listens for all children added to games and add buttons to our screens if somebody else made them.
    openGames.on("child_added", function (snapshot) {
        var gameName = snapshot.val()
        if (gameName.creator.uid != firebase.auth().currentUser.uid) {
            addGameButton(snapshot.key, gameName);
        }
    })

    //adds buttons to opponents screens
    function addGameButton(key, name) {
        console.log(name)
        var $button = $("<button>").text(key).attr("id", name.creator.uid).addClass("gameButton")
        $("#availableGames").append($button)
    }

    //on click of game, join
    $(document).on("click", ".gameButton", function (event) {

        gameName = event.target.innerText;
        gameLoc = firebase.database().ref("/games/" + gameName + "/");
        var yourPlayer = firebase.auth().currentUser;

        // ensures that multiple people dont click on the same game
        gameLoc.transaction(function (gameLoc) {
            console.log("listening")

            //if there is only a creator on the clicked game and no 2nd player, then we'll create one and set it equal to the information stored about us, the player.
            if (!gameLoc.joiner) {
                joinObject = {
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
            //playing opponent "x"
            console.log("made it this far")
            // console.log(gameRef)
            // watchGame(gameLoc);
            // game.state = STATE.JOINED;
        })
    })


})

// openGames.on("child_removed", function (snapshot) {
//     var oldButton = $("#" + snapshot.val().creator.uid)
//     if (oldButton) {
//         oldButton.remove();
//     }
// })