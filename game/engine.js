// =============================================
// MOTOR DEL JUEGO - TEXAS HOLD'EM SIMPLIFICADO
// =============================================

const { createDeck, shuffle, evaluateHand, compareScore } = require('./deck');
const { getBotDecision, getRandomMessage } = require('./bots');

class PokerGame {
  constructor(players, io, roomId) {
    this.players = players; // Array de { id, name, chips, isBot, botData, socket? }
    this.io = io;
    this.roomId = roomId;
    this.communityCards = [];
    this.pot = 0;
    this.deck = [];
    this.round = 0; // 0=pre-flop, 1=flop, 2=showdown
    this.currentPlayerIndex = 0;
    this.bets = {}; // playerId -> amount this round
    this.active = {}; // playerId -> true/false (folded?)
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.dealerIndex = 0;
    this.handNumber = 0;
    this.running = false;
    this.actionTimeout = null;
  }

  emit(event, data) {
    this.io.to(this.roomId).emit(event, data);
  }

  log(msg, data = {}) {
    this.emit('game_log', { msg, ...data, timestamp: Date.now() });
  }

  async startHand() {
    this.handNumber++;
    this.running = true;
    this.round = 0;
    this.pot = 0;
    this.communityCards = [];
    this.bets = {};
    this.active = {};

    // Reset active players (only those with chips)
    const alive = this.players.filter(p => p.chips > 0);
    if (alive.length < 2) {
      this.emit('game_over', { winner: alive[0] });
      return;
    }

    for (const p of alive) {
      this.active[p.id] = true;
      this.bets[p.id] = 0;
    }

    // Shuffle and deal
    this.deck = shuffle(createDeck());
    for (const p of alive) {
      p.hand = [this.deck.pop(), this.deck.pop()];
    }

    this.log(`🃏 Mano #${this.handNumber} comienza`, { hand: this.handNumber });
    this.broadcastState();

    await this.sleep(1000);

    // Post blinds
    const sbIdx = this.dealerIndex % alive.length;
    const bbIdx = (this.dealerIndex + 1) % alive.length;
    const sb = alive[sbIdx];
    const bb = alive[bbIdx];

    this.postBlind(sb, this.smallBlind, 'small blind');
    this.postBlind(bb, this.bigBlind, 'big blind');

    this.broadcastState();
    await this.sleep(800);

    // Betting round pre-flop
    await this.bettingRound(alive, (bbIdx + 1) % alive.length, this.bigBlind);

    if (this.getActivePlayers().length > 1) {
      // Flop
      this.deck.pop(); // burn
      this.communityCards = [this.deck.pop(), this.deck.pop(), this.deck.pop()];
      this.log('🌊 FLOP revelado');
      this.broadcastState();
      await this.sleep(1500);
      this.resetBetsForNewRound();
      await this.bettingRound(this.getActivePlayers(), 0, 0);
    }

    if (this.getActivePlayers().length > 1) {
      // Turn
      this.deck.pop();
      this.communityCards.push(this.deck.pop());
      this.log('🌊 TURN revelado');
      this.broadcastState();
      await this.sleep(1500);
      this.resetBetsForNewRound();
      await this.bettingRound(this.getActivePlayers(), 0, 0);
    }

    if (this.getActivePlayers().length > 1) {
      // River
      this.deck.pop();
      this.communityCards.push(this.deck.pop());
      this.log('🌊 RIVER revelado');
      this.broadcastState();
      await this.sleep(1500);
      this.resetBetsForNewRound();
      await this.bettingRound(this.getActivePlayers(), 0, 0);
    }

    await this.showdown();

    this.dealerIndex++;
    this.running = false;

    // Schedule next hand
    await this.sleep(4000);
    if (this.players.filter(p => p.chips > 0).length >= 2) {
      this.startHand();
    }
  }

  postBlind(player, amount, type) {
    const actual = Math.min(amount, player.chips);
    player.chips -= actual;
    this.bets[player.id] = (this.bets[player.id] || 0) + actual;
    this.pot += actual;
    this.log(`${player.name} paga ${type} (${actual} fichas)`);
  }

  async bettingRound(players, startIdx, minBet) {
    let currentBet = minBet;
    let lastRaiser = -1;
    let actionsThisRound = 0;
    let idx = startIdx % players.length;
    let acted = new Set();

    while (true) {
      const active = players.filter(p => this.active[p.id] && p.chips > 0);
      if (active.length <= 1) break;

      // End if everyone acted and no new raises
      if (acted.size >= active.length && actionsThisRound > 0) break;

      const player = players[idx % players.length];
      if (!this.active[player.id] || player.chips <= 0) {
        idx++;
        continue;
      }

      const toCall = Math.max(0, currentBet - (this.bets[player.id] || 0));

      this.emit('player_turn', {
        playerId: player.id,
        toCall,
        pot: this.pot,
        currentBet
      });

      let decision;
      if (player.isBot) {
        await this.sleep(1200 + Math.random() * 1000);
        const allCards = [...player.hand, ...this.communityCards];
        const evaluation = evaluateHand(allCards);
        decision = getBotDecision(player.botData, evaluation.score, this.pot, toCall, player.chips);

        // Bot chat
        if (Math.random() < 0.4) {
          const msgType = decision.action === 'fold' ? 'fold' :
                         decision.isBluff ? 'bluff' :
                         decision.action === 'raise' ? 'bluff' : 'thinking';
          this.emit('bot_chat', {
            playerId: player.id,
            name: player.name,
            message: getRandomMessage(player.botData, msgType)
          });
        }
      } else {
        // Human - wait for socket action
        decision = await this.waitForHumanAction(player, toCall);
      }

      // Apply decision
      if (decision.action === 'fold') {
        this.active[player.id] = false;
        this.log(`${player.name} se retira 🃏`);
      } else if (decision.action === 'call') {
        const callAmount = Math.min(toCall, player.chips);
        player.chips -= callAmount;
        this.bets[player.id] = (this.bets[player.id] || 0) + callAmount;
        this.pot += callAmount;
        this.log(`${player.name} iguala (${callAmount} fichas)`);
      } else if (decision.action === 'raise') {
        const raiseAmount = Math.min(decision.amount + toCall, player.chips);
        player.chips -= raiseAmount;
        this.bets[player.id] = (this.bets[player.id] || 0) + raiseAmount;
        this.pot += raiseAmount;
        currentBet = this.bets[player.id];
        lastRaiser = idx;
        acted.clear(); // Everyone needs to act again after a raise
        this.log(`${player.name} sube a ${currentBet} fichas 💰`);
      }

      acted.add(player.id);
      actionsThisRound++;
      this.broadcastState();
      idx++;
    }
  }

  waitForHumanAction(player, toCall) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ action: toCall > 0 ? 'fold' : 'call', amount: 0 });
      }, 30000);

      player.socket.once('player_action', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });
  }

  async showdown() {
    const active = this.getActivePlayers();
    this.log('🏆 SHOWDOWN — revelando cartas...');

    // Reveal all hands
    const results = active.map(p => {
      const allCards = [...p.hand, ...this.communityCards];
      const evaluation = evaluateHand(allCards);
      return { player: p, evaluation };
    });

    // Sort by hand strength
    results.sort((a, b) => compareScore(b.evaluation.score, a.evaluation.score));
    const winner = results[0];

    // Award pot
    winner.player.chips += this.pot;

    // Update stats
    for (const r of results) {
      if (r.player.isBot) {
        if (r.player === winner.player) {
          r.player.botData.stats.wins++;
        } else {
          r.player.botData.stats.losses++;
        }
      }
    }

    this.emit('showdown', {
      results: results.map(r => ({
        id: r.player.id,
        name: r.player.name,
        hand: r.player.hand,
        handName: r.evaluation.score.name,
        isWinner: r.player === winner.player
      })),
      winner: {
        id: winner.player.id,
        name: winner.player.name,
        handName: winner.evaluation.score.name,
        pot: this.pot
      }
    });

    // Winner chat
    if (winner.player.isBot) {
      const msgType = winner.evaluation.score.rank >= 5 ? 'bigWin' : 'win';
      this.emit('bot_chat', {
        playerId: winner.player.id,
        name: winner.player.name,
        message: getRandomMessage(winner.player.botData, msgType)
      });
    }

    // Loser chat
    for (const r of results.slice(1)) {
      if (r.player.isBot && Math.random() < 0.6) {
        await this.sleep(800);
        this.emit('bot_chat', {
          playerId: r.player.id,
          name: r.player.name,
          message: getRandomMessage(r.player.botData, 'lose')
        });
      }
    }

    this.broadcastState();
  }

  resetBetsForNewRound() {
    for (const id in this.bets) this.bets[id] = 0;
  }

  getActivePlayers() {
    return this.players.filter(p => this.active[p.id] && p.chips > 0);
  }

  // ✅ NUEVO: construye el estado sin emitir (reutilizable)
  _buildState() {
    return {
      pot: this.pot,
      communityCards: this.communityCards,
      handNumber: this.handNumber,
      round: ['Pre-Flop', 'Flop', 'Turn', 'River'][
        this.communityCards.length === 0 ? 0 :
        this.communityCards.length === 3 ? 1 :
        this.communityCards.length === 4 ? 2 : 3
      ],
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        chips: p.chips,
        isBot: p.isBot,
        avatar: p.isBot ? p.botData.avatar : '👤',
        personality: p.isBot ? p.botData.personality : 'human',
        isActive: !!this.active[p.id],
        bet: this.bets[p.id] || 0,
        stats: p.isBot ? p.botData.stats : p.stats || { wins: 0, losses: 0 },
        hand: p.hand || []
      }))
    };
  }

  // ✅ Emite a toda la sala
  broadcastState() {
    this.emit('game_state', this._buildState());
  }

  // ✅ NUEVO: emite solo a un socket específico (para nuevos conectados)
  broadcastStateTo(socket) {
    socket.emit('game_state', this._buildState());
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { PokerGame };