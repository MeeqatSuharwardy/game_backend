const express = require("express");
const app = express();
const port = 3000;

let players = [];
let communityCards = [];
let currentDeck = [];
let pot = 0;
let currentPlayerIndex = 0;
let currentBet = 0;
let round = 0;
let dealerIndex = 0;
let gameEnded = false;
let winner = null;
let smallBlind = 10;
let bigBlind = 20;

// Utility functions
function createDeck() {
  const suits = ["H", "D", "C", "S"];
  const values = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ];
  let deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push(`${value}${suit}`);
    }
  }
  return shuffle(deck);
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function dealCards(deck, numPlayers) {
  const hands = Array.from({ length: numPlayers }, () => []);
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < numPlayers; j++) {
      hands[j].push(deck.pop());
    }
  }
  return hands;
}

function evaluateHand(hand, communityCards) {
  // Simplified hand evaluation for demo purposes
  const allCards = hand.concat(communityCards);
  return allCards.join(",");
}

function compareHands(hand1, hand2) {
  // Simplified comparison for demo purposes
  return hand1.localeCompare(hand2);
}

// Routes
app.use(express.json());

app.post("/start-game", (req, res) => {
  const { playerNames } = req.body;
  players = playerNames.map((name, index) => ({
    id: index + 1,
    name,
    chips: 1000,
    hand: [],
    folded: false,
    bet: 0,
  }));
  currentDeck = createDeck();
  communityCards = [];
  pot = 0;
  currentPlayerIndex = (dealerIndex + 1) % players.length;
  currentBet = bigBlind;
  round = 0;
  gameEnded = false;
  winner = null;

  const hands = dealCards(currentDeck, players.length);
  players = players.map((player, index) => ({
    ...player,
    hand: hands[index],
    folded: false,
    bet: 0,
  }));

  // Set blinds
  players[(dealerIndex + 1) % players.length].chips -= smallBlind;
  players[(dealerIndex + 1) % players.length].bet = smallBlind;
  players[(dealerIndex + 2) % players.length].chips -= bigBlind;
  players[(dealerIndex + 2) % players.length].bet = bigBlind;
  pot = smallBlind + bigBlind;

  res.json({ players, communityCards, pot });
});

app.post("/player-action", (req, res) => {
  const { playerId, action, raiseAmount } = req.body;
  const playerIndex = players.findIndex((player) => player.id === playerId);

  if (players[playerIndex].folded) {
    return res.status(400).json({ error: "Player already folded" });
  }

  switch (action) {
    case "fold":
      players[playerIndex].folded = true;
      break;
    case "call":
      const callAmount = currentBet - players[playerIndex].bet;
      if (players[playerIndex].chips >= callAmount) {
        players[playerIndex].chips -= callAmount;
        players[playerIndex].bet += callAmount;
        pot += callAmount;
      }
      break;
    case "raise":
      const raiseDiff = raiseAmount - players[playerIndex].bet;
      if (players[playerIndex].chips >= raiseDiff) {
        players[playerIndex].chips -= raiseDiff;
        players[playerIndex].bet += raiseDiff;
        pot += raiseDiff;
        currentBet = raiseAmount;
      }
      break;
  }

  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;

  // Check if all players have acted for this round
  if (currentPlayerIndex === dealerIndex) {
    nextRound();
  }

  res.json({ players, communityCards, pot });
});

function nextRound() {
  switch (round) {
    case 0:
      communityCards = currentDeck.splice(-3);
      round++;
      break;
    case 1:
      communityCards.push(currentDeck.pop());
      round++;
      break;
    case 2:
      communityCards.push(currentDeck.pop());
      round++;
      break;
    case 3:
      determineWinner();
      break;
  }
}

function determineWinner() {
  let bestPlayer = null;
  let bestHand = null;

  players.forEach((player) => {
    if (!player.folded) {
      const playerHand = evaluateHand(player.hand, communityCards);
      if (!bestPlayer || compareHands(bestHand, playerHand) < 0) {
        bestPlayer = player;
        bestHand = playerHand;
      }
    }
  });

  if (bestPlayer) {
    bestPlayer.chips += pot;
    winner = bestPlayer;
  }

  checkForGameEnd();
}

function checkForGameEnd() {
  const activePlayers = players.filter((player) => player.chips > 0);
  if (activePlayers.length === 1) {
    gameEnded = true;
    winner = activePlayers[0];
  } else if (round === 3) {
    gameEnded = true;
  }
}

app.get("/game-state", (req, res) => {
  res.json({
    players,
    communityCards,
    pot,
    currentPlayerIndex,
    currentBet,
    round,
    gameEnded,
    winner,
  });
});

app.listen(port, () => {
  console.log(`Poker game server running at http://localhost:${port}`);
});
