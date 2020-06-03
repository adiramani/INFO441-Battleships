# INFO441-Battleships

Created by Aditya Ramani, Beichen Liang, Liam O'Keeffe, and Liam Sexton

## Project Description:

We built an online battleship game for our project. Our target audience is people who are feeling disconnected from their friends over the past few months due to the extenuating circumstances of COVID-19 and want to find a way to play games with their friends. These people will want to use our application because it is fun game that they can play with their friends. There are a few online battleship games in the market, but not many of them have a chat feature, where people can connect with the people they are playing against and converse (or even trash talk!). Users can also play against random opponents. As developers, we wanted to build this app because it will enable our target audience to connect and have fun with others. In addition, all of us love playing battleships too, so we can enjoy the application with our friends once we've finished!

## Technical Description:

#### Architectural diagram:

![Architectural Diagram](readme_images/architectural_diagram.png)

#### User Stories

Priority|User|Function/Description|Technology/Implementation|Implemented?
--------|----|--------------------|-------------------------|:------:
P0|As a player|I want to create an account on the website|Create a new entry in the Player table|Yes
P0|As a player|I want to create a game for another person to join via code|Create a new entry in the Game table, and the player_game table|Yes
P0|As a player|I want to make moves and win a game vs another player|Create a new entry in the move_player_game table|Yes
P0|As a player|I want to join a game via code|Create a new entry in the player_game table|Yes
P1|As a player|I want to create a public game|Create a New entry in the game and player game table, allow the gameCode to be visible to anyone|Yes
P1|As a player|I want to join game via search for public lobbies|Search for all public gameCodes, and once one is selected, make a new entry in the player_game table|Yes
P2|As a player|I want to play games against the CPU. |CPU can be a generated “player.” Create a new entry in game and player_game, for both the CPU and player, have the CPU make a random move after the player makes a move|No
P2|As a player|I want to chat with other players while playing|Create an entry in the chat and 2 in the player_chat table, and open a websocket pipeline to be able to receive and send messages. Messages stored in the player_chat_messagetable|Yes
P3|As a player|I want to make a group chat with people I play with often|Create an entry in the chat table, and as many entries in the player_chat table as users requested. Open a websocket pipeline to be able to receive and send messages. Messages stored in the player_chat_messagetable|No

The user stories not implemented above would likely be implemented in a future iteration of the project.

#### Endpoints

**Player/Session Endpoints:**
* POST /users - create a new user in the database
  * Input: Player sign up information (JSON)
    * First & last name, email, password hash
  * Output: New Player account with ID (JSON)
    * Without email or password hash
  * Start a new player session as well
* GET /player/{id} - get a players information from ID or the currently authenticated user
  * Input: id parameter from URL
  * Output: Player account for the specified ID in JSON
    * Get ID of currently authenticated user from session store if id == ‘me’
* POST /sessions - start a session for a user based on sign in information
  * Input: User sign in information
    * Email, password
  * Output: Player account for the authenticated user in JSON
    * Begin session for user by assigning a session ID if credentials match user information in player database
* GET /sessions/{id} - get a players session info from session ID
  * Input: session id from URL parameter
  * Output: Player session information in JSON
* DELETE /player/{id} - delete a user from the database based on id. 
  * Input: player id from request URL
  * Output: Plain text confirming deletion of player
    * Only able to delete if authorized (if the current authenticated user id deleting his/her own account)
* DELETE /sessions/mine
    * Output: Plain text confirming session has ended
    * End the current authenticated user’s session

**Social Endpoints:**
* GET /v1/friends
  * Input: authorization
  * Output: List of all friends and friend requests
* POST /v1/friends/{username}
  * Input: authorization, friend username, acceptence request or first request
  * Output: Success/Failure message
* GET /v1/friends/{partialUserName}
  * 


**Chat Endpoints:**
* POST /v1/channels - create a chat with another player based on body info
  * Input: JSON of a chat model in request body
    * Chat members, creator, timeCreated
  * Output: New Chat model in JSON with ID
* GET v1/channels?friendid= - get a certain chat room based on another user's id
  * Input: id parameter in URL
  * Output: Chat model in JSON
    * Check to see if current authenticated user is creator/member of chat before returning
* WEBSOCKET /chat/{id}/message - pipeline for messages for a given chat id. Can only be accessed if user is authorized to see it
  * Input
    * chat ID from request URL
    * Receiving
      * Ensure user is member of chat & currently authenticated
    * Sending
      * Ensure user is authorized to send message in given chat id & currently authenticated
      * If message is being sent, the message text will be in the request body
  * Output: 
    * Receiving
      * Array of most recent chat message models for the given chat id in JSON
      * Any errors that occur
    * Sending
      * Chat message model in JSON with new ID, status 201
      * Any errors that occur

**Game Endpoints:**
* POST /game - create a new game, return a gameID
  * Input: game model in JSON
      * Players, time start/end, type of game, …
  * Output: New game model in JSON with new ID
* GET /game/{id} -return game information to play the game based on game id, if it exists
  * Input: game ID from request URL
  * Output: game model in JSON
* WEBSOCKET /game/{id}/move - pipeline for moves in a game provided by a certain ID
  * Input: 
    * Game ID from request URL
    * Ensure a player is authorized, a player in the specified game, and it is their current turn
    * Sending
      * The move information (name and location) will be passed as json in the request body
  * Output: 
    * Receiving
      * New moves for the specified game
      * Any errors
    * Sending
      * Any failure errors
      * 201 for a successful move along with a new move model in JSON with ID
* DELETE /game/{id} - end a game. Only accessed if a game is won, or if a player forfeits
  * Input: game id from request URL
  * Output: Plain text confirming end of game/result
  * Only allowed if player wins or if a player forfeits (loses connection) and the player is a member of the specified game id



## Database Schema:
https://app.lucidchart.com/invitations/accept/0697ccf4-8483-4385-9f6d-fc84ec2417ca
![Architectural Diagram](readme_images/erd.png)



 