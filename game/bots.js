// =============================================
// PERSONALIDADES DE LOS BOTS
// =============================================

const BOTS = [
  {
    id: 'bot_el_toro',
    name: '🐂 El Toro',
    personality: 'aggressive',
    avatar: '🐂',
    description: 'Agresivo y dominante. Apuesta siempre fuerte.',
    chips: 1000,
    stats: { wins: 0, losses: 0, bigBluffs: 0 },
    chatMessages: {
      win:      ["¡MUUUU! ¡Todos al matadero!", "¿Quién es el toro ahora?", "Eso es lo que hago yo.", "¡Aplastados!"],
      lose:     ["Esto no termina aquí...", "Mala suerte, nada más.", "Me las pagarán.", "¡Trampa!"],
      bluff:    ["¿Tienes lo que hay que tener para verme?", "Todo o nada, así juego yo.", "Sube si te atreves."],
      bigWin:   ["¡EL TORO ES INDOMABLE! 🔥", "¡POKER COMPLETO! ¡Doblen las rodillas!"],
      fold:     ["Paso esta, pero volveré.", "Guardo fuerzas para cuando importa."],
      thinking: ["Calculando mi próxima jugada...", "Hmm..."],
    }
  },
  {
    id: 'bot_el_zorro',
    name: '🦊 El Zorro',
    personality: 'bluffer',
    avatar: '🦊',
    description: 'Astuta y manipuladora. Miente con una sonrisa.',
    chips: 1000,
    stats: { wins: 0, losses: 0, bigBluffs: 0 },
    chatMessages: {
      win:      ["La astucia siempre gana 😏", "¿Me creíste? Justo lo que quería.", "Nunca sabrás si miento."],
      lose:     ["Dejé ganar... estrategia.", "Esto lo planeé, créeme 😉", "La zorra deja caer su presa antes de atacar."],
      bluff:    ["Tengo algo increíble aquí... o no 😈", "¿Será bluff? Tú decides.", "Sigo subiendo... ¿hasta dónde llegas tú?"],
      bigWin:   ["¡TRAMPA PERFECTA! 🦊💫", "¡Caíste en mi telaraña!"],
      fold:     ["Esta no la necesito.", "Me retiro... por ahora 😏"],
      thinking: ["Analizando sus debilidades...", "Interesante jugada..."],
    }
  },
  {
    id: 'bot_don_frio',
    name: '🧊 Don Frío',
    personality: 'conservative',
    avatar: '🧊',
    description: 'Calculador y frío. Solo apuesta cuando tiene seguridad.',
    chips: 1000,
    stats: { wins: 0, losses: 0, bigBluffs: 0 },
    chatMessages: {
      win:      ["Matemáticas aplicadas.", "Exactamente como calculé.", "La probabilidad no miente."],
      lose:     ["Varianza normal. Ajustando parámetros.", "Error del sistema. Recalculando.", "Improbable, pero sucedió."],
      bluff:    ["Mi análisis indica ventaja estadística."],
      bigWin:   ["HAND RANK: MÁXIMO. RESULTADOS ÓPTIMOS. ✅", "Probabilidad de victoria calculada: 98.7%. Confirmado."],
      fold:     ["EV negativo. Fold correcto.", "La matemática dicta retiro."],
      thinking: ["Calculando expected value...", "Procesando probabilidades..."],
    }
  },
  {
    id: 'bot_loco_pepe',
    name: '🤪 Loco Pepe',
    personality: 'random',
    avatar: '🤪',
    description: 'Impredecible y caótico. Nadie sabe qué hará.',
    chips: 1000,
    stats: { wins: 0, losses: 0, bigBluffs: 0 },
    chatMessages: {
      win:      ["¡JAJAJAJA LO SABÍA! 🎉", "¡Plin! ¡Gané! ¡No sé cómo pero gané!", "¿Qué pasó? ¡GANÉ! 🤯"],
      lose:     ["JAJAJA perdí bien 🤣", "No importa, la vida es corta!", "¿Perdí? ¡Da igual! ¡Es solo dinero ficticio!"],
      bluff:    ["¡SUBO TODO! ¡POR QUÉ NO! 🤪", "¡ALL IN baby! ¡Yolo!"],
      bigWin:   ["¡¡¡OMG OMG OMG POKER!!! 🤯🎉🤯", "¡ME VUELVO LOCO DE VERDAD!"],
      fold:     ["Me aburro, paso.", "¡Bah! Siguiente mano mejor."],
      thinking: ["Eeehhh... 🤔", "¿Qué carta era la que tenía?"],
    }
  }
];

function getBotDecision(bot, handScore, potSize, currentBet, myChips) {
  const handRank = handScore.rank; // -1 a 8
  const handStrength = (handRank + 1) / 9; // 0 a 1

  switch (bot.personality) {
    case 'aggressive': return aggressiveDecision(handStrength, potSize, currentBet, myChips);
    case 'bluffer':    return blufferDecision(handStrength, potSize, currentBet, myChips);
    case 'conservative': return conservativeDecision(handStrength, potSize, currentBet, myChips);
    case 'random':     return randomDecision(handStrength, currentBet, myChips);
    default:           return { action: 'call', amount: currentBet };
  }
}

function aggressiveDecision(strength, potSize, currentBet, chips) {
  if (strength > 0.3) {
    const raise = Math.min(Math.floor(potSize * (0.5 + Math.random())), chips);
    return { action: 'raise', amount: Math.max(currentBet * 2, raise) };
  }
  if (strength > 0.1) return { action: 'call', amount: currentBet };
  return { action: 'fold' };
}

function blufferDecision(strength, potSize, currentBet, chips) {
  const bluffChance = Math.random();
  if (bluffChance < 0.35) {
    // BLUFF!
    const bluffAmount = Math.min(Math.floor(potSize * (1 + Math.random())), chips);
    return { action: 'raise', amount: Math.max(currentBet * 2, bluffAmount), isBluff: true };
  }
  if (strength > 0.4) {
    return { action: 'raise', amount: Math.min(currentBet * 2, chips) };
  }
  if (currentBet === 0 || strength > 0.2) return { action: 'call', amount: currentBet };
  return { action: 'fold' };
}

function conservativeDecision(strength, potSize, currentBet, chips) {
  if (strength > 0.55) {
    const raise = Math.min(Math.floor(currentBet * 2.5), chips);
    return { action: 'raise', amount: raise };
  }
  if (strength > 0.3 || currentBet === 0) return { action: 'call', amount: currentBet };
  return { action: 'fold' };
}

function randomDecision(strength, currentBet, chips) {
  const r = Math.random();
  if (r < 0.15) {
    const allIn = Math.min(chips, 500);
    return { action: 'raise', amount: allIn };
  }
  if (r < 0.5) return { action: 'call', amount: currentBet };
  if (r < 0.7 && currentBet > 0) return { action: 'fold' };
  return { action: 'call', amount: currentBet };
}

function getRandomMessage(bot, type) {
  const msgs = bot.chatMessages[type] || bot.chatMessages.thinking;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

module.exports = { BOTS, getBotDecision, getRandomMessage };
