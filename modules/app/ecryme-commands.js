/* -------------------------------------------- */

import { EcrymeUtility } from "./common/ecryme-utility.js";
import { EcrymeCharacterSummary } from "./app/ecryme-summary-app.js"

/* -------------------------------------------- */
export class EcrymeCommands {

  static init() {
    if (!game.system.ecryme.commands) {
      const commands = new EcrymeCommands();
      commands.registerCommand({ path: ["/tirage"], func: (content, msg, params) => EcrymeCommands.createTirage(msg), descr: "Tirage des tarots" });
      commands.registerCommand({ path: ["/carte"], func: (content, msg, params) => EcrymeCommands.tirerCarte(msg), descr: "Tirer une carte" });
      commands.registerCommand({ path: ["/resume"], func: (content, msg, params) => EcrymeCharacterSummary.displayPCSummary(), descr: "Affiche la liste des PJs!" });
      game.system.ecryme.commands = commands;
    }
  }
  constructor() {
    this.commandsTable = {}
  }

  /* -------------------------------------------- */
  registerCommand(command) {
    this._addCommand(this.commandsTable, command.path, '', command);
  }

  /* -------------------------------------------- */
  _addCommand(targetTable, path, fullPath, command) {
    if (!this._validateCommand(targetTable, path, command)) {
      return;
    }
    const term = path[0];
    fullPath = fullPath + term + ' '
    if (path.length == 1) {
      command.descr = `<strong>${fullPath}</strong>: ${command.descr}`;
      targetTable[term] = command;
    }
    else {
      if (!targetTable[term]) {
        targetTable[term] = { subTable: {} };
      }
      this._addCommand(targetTable[term].subTable, path.slice(1), fullPath, command)
    }
  }

  /* -------------------------------------------- */
  _validateCommand(targetTable, path, command) {
    if (path.length > 0 && path[0] && command.descr && (path.length != 1 || targetTable[path[0]] == undefined)) {
      return true;
    }
    console.warn("crucibleCommands._validateCommand failed ", targetTable, path, command);
    return false;
  }


  /* -------------------------------------------- */
  /* Manage chat commands */
  processChatCommand(commandLine, content = '', msg = {}) {
    // Setup new message's visibility
    let rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) msg["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "blindroll") msg["blind"] = true;
    msg["type"] = 0;

    let command = commandLine[0].toLowerCase();
    let params = commandLine.slice(1);

    return this.process(command, params, content, msg);
  }

  /* -------------------------------------------- */
  process(command, params, content, msg) {
    return this._processCommand(this.commandsTable, command, params, content, msg);
  }

  /* -------------------------------------------- */
  _processCommand(commandsTable, name, params, content = '', msg = {}, path = "") {
    console.log("===> Processing command")
    let command = commandsTable[name];
    path = path + name + " ";
    if (command && command.subTable) {
      if (params[0]) {
        return this._processCommand(command.subTable, params[0], params.slice(1), content, msg, path)
      }
      else {
        this.help(msg, command.subTable);
        return true;
      }
    }
    if (command && command.func) {
      const result = command.func(content, msg, params);
      if (result == false) {
        CrucibleCommands._chatAnswer(msg, command.descr);
      }
      return true;
    }
    return false;
  }

  /* -------------------------------------------- */
  static _chatAnswer(msg, content) {
    msg.whisper = [game.user.id];
    msg.content = content;
    ChatMessage.create(msg);
  }

  /* --------------------------------------------- */
  static async createTirage(msg) {
    if (game.user.isGM) {
      let tirageData = {
        state: 'select-player',
        nbCard: 0,
        maxPlayerCard: 4,
        maxSecretCard: 1,
        cards: [],
        players: duplicate(game.users),
        secretCards: [],
        deck: EcrymeUtility.getTarots()
      }
      for (let i = 0; i < 4; i++) {
        tirageData.cards.push({ name: "???", img: "systems/fvtt-ecryme/images/tarots/background.webp" })
      }
      tirageData.secretCards.push({ name: "???", img: "systems/fvtt-ecryme/images/tarots/background.webp" })

      let tirageDialog = await EcrymeTirageTarotDialog.create(this, tirageData)
      tirageDialog.render(true)
    }
  }
  /* --------------------------------------------- */
  static async tirerCarte(msg) {
    let deck =  EcrymeUtility.getTarots()
    let index = Math.round(Math.random() * (deck.length-1))
    let selectedCard = deck[index]
    selectedCard.system.ispositif = true
    if ( selectedCard.system.isdualside) { // Cas des cartes pouvant avoir 2 sens
      selectedCard.system.ispositif = (Math.random() > 0.5)
    }
    selectedCard.system.isgm = false
    selectedCard.value = (selectedCard.system.ispositif)? selectedCard.system.numericvalueup : selectedCard.system.numericvaluedown
    EcrymeUtility.createChatMessage(game.user.name, "", {
      content: await renderTemplate(`systems/fvtt-ecryme/templates/chat/display-tarot-card.hbs`, selectedCard) 
    })
  }

}