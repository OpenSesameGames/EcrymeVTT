/* -------------------------------------------- */
import { EcrymeCommands } from "../app/ecryme-commands.js";

/* -------------------------------------------- */
const __maxImpacts = {superficial: 4, light: 3, serious: 2, major: 1}
const __nextImpacts = {superficial: "light", light: "serious", serious: "major", major: "major"}

/* -------------------------------------------- */
export class EcrymeUtility {

  /* -------------------------------------------- */
  static async init() {
    Hooks.on('renderChatLog', (log, html, data) => EcrymeUtility.chatListeners(html));
    Hooks.on("getChatLogEntryContext", (html, options) => EcrymeUtility.chatMenuManager(html, options));

    this.rollDataStore = {}
    this.defenderStore = {}

    EcrymeCommands.init();
  }

  /* -------------------------------------------- */
  static async ready() {

    Handlebars.registerHelper('count', function (list) {
      return list.length;
    })
    Handlebars.registerHelper('includes', function (array, val) {
      return array.includes(val);
    })
    Handlebars.registerHelper('upper', function (text) {
      return text.toUpperCase();
    })
    Handlebars.registerHelper('lower', function (text) {
      return text.toLowerCase()
    })
    Handlebars.registerHelper('upperFirst', function (text) {
      if (typeof text !== 'string') return text
      return text.charAt(0).toUpperCase() + text.slice(1)
    })
    Handlebars.registerHelper('notEmpty', function (list) {
      return list.length > 0;
    })
    Handlebars.registerHelper('mul', function (a, b) {
      return parseInt(a) * parseInt(b);
    })
    Handlebars.registerHelper('add', function (a, b) {
      return parseInt(a) + parseInt(b);
    })
    Handlebars.registerHelper('for', function (from, to, incr, block) {
      var accum = '';
      for (var i = from; i <= to; i += incr)
        accum += block.fn(i);
      return accum;
    })
    this.buildSkillConfig()

  }

  /*-------------------------------------------- */
  static buildSkillConfig() {
    game.system.ecryme.config.skills = {}
    for (let categKey in game.data.template.Actor.templates.core.skills) {
      let category = game.data.template.Actor.templates.core.skills[categKey]
      for (let skillKey in category.skilllist) {
        let skill = duplicate(category.skilllist[skillKey])
        skill.categKey = categKey // Auto reference the category
        game.system.ecryme.config.skills[skillKey] = skill
      }
    }
  }

  /*-------------------------------------------- */
  static upperFirst(text) {
    if (typeof text !== 'string') return text
    return text.charAt(0).toUpperCase() + text.slice(1)
  }

  /* -------------------------------------------- */
  static async loadCompendiumData(compendium) {
    const pack = game.packs.get(compendium)
    return await pack?.getDocuments() ?? []
  }

  /* -------------------------------------------- */
  static async loadCompendium(compendium, filter = item => true) {
    let compendiumData = await EcrymeUtility.loadCompendiumData(compendium)
    return compendiumData.filter(filter)
  }

  /* -------------------------------------------- */
  static getActorFromRollData(rollData) {
    let actor = game.actors.get(rollData.actorId)
    if (rollData.tokenId) {
      let token = canvas.tokens.placeables.find(t => t.id == rollData.tokenId)
      if (token) {
        actor = token.actor
      }
    }
    return actor
  }

  /* -------------------------------------------- */
  static chatMenuManager(html, options) {
    let canTranscendRoll = []
    for (let i = 1; i <= 10; i++) {
      canTranscendRoll[i] = function (li) {
        let message = game.messages.get(li.attr("data-message-id"))
        let rollData = message.getFlag("world", "rolldata")
        //console.log(">>>>>>>>>>>>>>>>>>>>>>>>>> Menu !!!!", rollData)
        if (rollData.skill && i <= rollData.skill.value && !rollData.transcendUsed && rollData.spec) {
          return true
        }
        return false
      }
      options.push({
        name: game.i18n.localize("ECRY.chat.spectranscend") + i,
        icon: '<i class="fas fa-plus-square"></i>',
        condition: canTranscendRoll[i],
        callback: li => {
          let message = game.messages.get(li.attr("data-message-id"))
          let rollData = message.getFlag("world", "rolldata")
          EcrymeUtility.transcendFromSpec(rollData, i)
        }
      })
    }
  }

  /* -------------------------------------------- */
  static async chatListeners(html) {

    html.on("click", '.roll-destin', event => {
      let messageId = EcrymeUtility.findChatMessageId(event.currentTarget)
      let message = game.messages.get(messageId)
      let rollData = message.getFlag("world", "rolldata")
      let actor = this.getActorFromRollData(rollData)
      actor.incDecDestin(-1)
      rollData.isReroll = true
      this.rollEcryme(rollData)
    })
    html.on("click", '.draw-tarot-card', event => {
      let messageId = EcrymeUtility.findChatMessageId(event.currentTarget)
      this.drawDeckCard(messageId)
    })

  }

  /* -------------------------------------------- */
  static async preloadHandlebarsTemplates() {

    const templatePaths = [
      'systems/fvtt-ecryme/templates/actors/editor-notes-gm.hbs',
      'systems/fvtt-ecryme/templates/items/partial-item-nav.hbs',
      'systems/fvtt-ecryme/templates/items/partial-item-equipment.hbs',
      'systems/fvtt-ecryme/templates/items/partial-item-description.hbs',
      'systems/fvtt-ecryme/templates/dialogs/partial-common-roll-dialog.hbs',
      'systems/fvtt-ecryme/templates/actors/partial-impacts.hbs'
    ]
    return loadTemplates(templatePaths);
  }

  /* -------------------------------------------- */
  static removeChatMessageId(messageId) {
    if (messageId) {
      game.messages.get(messageId)?.delete();
    }
  }

  static findChatMessageId(current) {
    return EcrymeUtility.getChatMessageId(EcrymeUtility.findChatMessage(current));
  }

  static getChatMessageId(node) {
    return node?.attributes.getNamedItem('data-message-id')?.value;
  }

  static findChatMessage(current) {
    return EcrymeUtility.findNodeMatching(current, it => it.classList.contains('chat-message') && it.attributes.getNamedItem('data-message-id'));
  }

  static findNodeMatching(current, predicate) {
    if (current) {
      if (predicate(current)) {
        return current;
      }
      return EcrymeUtility.findNodeMatching(current.parentElement, predicate);
    }
    return undefined;
  }


  /* -------------------------------------------- */
  static createDirectOptionList(min, max) {
    let options = {};
    for (let i = min; i <= max; i++) {
      options[`${i}`] = `${i}`;
    }
    return options;
  }

  /* -------------------------------------------- */
  static buildListOptions(min, max) {
    let options = ""
    for (let i = min; i <= max; i++) {
      options += `<option value="${i}">${i}</option>`
    }
    return options;
  }

  /* -------------------------------------------- */
  static getTarget() {
    if (game.user.targets) {
      for (let target of game.user.targets) {
        return target
      }
    }
    return undefined
  }

  /* -------------------------------------------- */
  static updateRollData(rollData) {

    let id = rollData.rollId
    let oldRollData = this.rollDataStore[id] || {}
    let newRollData = mergeObject(oldRollData, rollData)
    this.rollDataStore[id] = newRollData
  }

  /* -------------------------------------------- */
  static async onSocketMesssage(msg) {
    console.log("SOCKET MESSAGE", msg.name)
    if (msg.name == "msg-draw-card") {
      if (game.user.isGM && game.system.ecryme.currentTirage) {
        game.system.ecryme.currentTirage.addCard(msg.data.msgId)
      }
    }
  }

  /* -------------------------------------------- */
  static async searchItem(dataItem) {
    let item
    if (dataItem.pack) {
      let id = dataItem.id || dataItem._id
      let items = await this.loadCompendium(dataItem.pack, item => item.id == id)
      item = items[0] || undefined
    } else {
      item = game.items.get(dataItem.id)
    }
    return item
  }

  /* -------------------------------------------- */
  static chatDataSetup(content, modeOverride, isRoll = false, forceWhisper) {
    let chatData = {
      user: game.user.id,
      rollMode: modeOverride || game.settings.get("core", "rollMode"),
      content: content
    };

    if (["gmroll", "blindroll"].includes(chatData.rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
    if (chatData.rollMode === "blindroll") chatData["blind"] = true;
    else if (chatData.rollMode === "selfroll") chatData["whisper"] = [game.user];

    if (forceWhisper) { // Final force !
      chatData["speaker"] = ChatMessage.getSpeaker();
      chatData["whisper"] = ChatMessage.getWhisperRecipients(forceWhisper);
    }

    return chatData;
  }
  /* -------------------------------------------- */
  static getImpactMax(impactLevel) {
    return __maxImpacts[impactLevel]
  }
  static getNextImpactLevel(impactLevel)  {
    return __nextImpacts[impactLevel]
  }
  /* -------------------------------------------- */
  static async showDiceSoNice(roll, rollMode) {
    if (game.modules.get("dice-so-nice")?.active) {
      if (game.dice3d) {
        let whisper = null;
        let blind = false;
        rollMode = rollMode ?? game.settings.get("core", "rollMode");
        switch (rollMode) {
          case "blindroll": //GM only
            blind = true;
          case "gmroll": //GM + rolling player
            whisper = this.getUsers(user => user.isGM);
            break;
          case "roll": //everybody
            whisper = this.getUsers(user => user.active);
            break;
          case "selfroll":
            whisper = [game.user.id];
            break;
        }
        await game.dice3d.showForRoll(roll, game.user, true, whisper, blind);
      }
    }
  }

  /* -------------------------------------------- */
  static computeResults(rollData) {
    rollData.isSuccess = false
    if (!rollData.difficulty || rollData.difficulty == "-") {
      return
    }
    rollData.margin = rollData.total - rollData.difficulty
    if (rollData.total > rollData.difficulty) {
      rollData.isSuccess = true
      rollData.margin = Math.min(rollData.margin, rollData.skill.value)
    }
  }

  /* -------------------------------------------- */
  static computeRollFormula(rollData, actor, isConfrontation = false) {
    // Build the dice formula
    let diceFormula = (isConfrontation) ? "4d6" : "2d6"
    if (rollData.useIdeal) {
      diceFormula = (isConfrontation) ? "5d6kh2" : "3d6kh2"
    }
    if (rollData.useSpleen) {
      diceFormula = (isConfrontation) ? "5d6kl2" : "3d6kl2"
    }
    if (rollData.skill) {
      diceFormula += "+" + rollData.skill.value
    }
    if (rollData.skillTranscendence) {
      diceFormula += "+" + rollData.skillTranscendence
      actor.spentSkillTranscendence(rollData.skill, rollData.skillTranscendence)
    }
    if (rollData.selectedSpecs && rollData.selectedSpecs.length > 0) {
      rollData.spec = actor.getSpecialization(rollData.selectedSpecs[0])
      diceFormula += "+2"
    }
    rollData.bonusMalusTraits = 0
    if (rollData.traitsBonus && rollData.traitsBonus.length > 0) {
      rollData.traitsBonusList = []
      for (let id of rollData.traitsBonus) {
        let trait = actor.getTrait(id)
        console.log(trait, id)
        rollData.traitsBonusList.push(trait)
        rollData.bonusMalusTraits += trait.system.level
      }
    }
    if (rollData.traitsMalus && rollData.traitsMalus.length > 0) {
      rollData.traitsMalusList = []
      for (let id of rollData.traitsMalus) {
        let trait = actor.getTrait(id)
        rollData.traitsMalusList.push(trait)
        rollData.bonusMalusTraits -= trait.system.level
      }
    }
    diceFormula += "+" + rollData.bonusMalusTraits
    diceFormula += "+" + rollData.bonusMalusPerso
    rollData.diceFormula = diceFormula
    return diceFormula
  }

  /* -------------------------------------------- */
  static async rollEcryme(rollData) {

    let actor = game.actors.get(rollData.actorId)
    // Fix difficulty
    if (!rollData.difficulty || rollData.difficulty == "-") {
      rollData.difficulty = 0
    }
    rollData.difficulty = Number(rollData.difficulty)

    let diceFormula = this.computeRollFormula(rollData, actor)

    // Performs roll
    let myRoll = new Roll(diceFormula).roll({ async: false })
    await this.showDiceSoNice(myRoll, game.settings.get("core", "rollMode"))
    rollData.roll = duplicate(myRoll)
    rollData.total = myRoll.total
    rollData.diceSum = myRoll.terms[0].total

    this.computeResults(rollData)

    console.log("rollData", rollData)
    let msg = await this.createChatWithRollMode(rollData.alias, {
      content: await renderTemplate(`systems/fvtt-ecryme/templates/chat/chat-generic-result.hbs`, rollData)
    })
    msg.setFlag("world", "rolldata", rollData)
    if (rollData.mode == "initiative") {
      actor.setFlag("world", "initiative", myRoll.total)
    }

    console.log("Rolldata result", rollData)
  }

  /* -------------------------------------------- */
  static async transcendFromSpec(rollData, value) {
    rollData.total += value
    rollData.transcendUsed = true
    this.computeResults(rollData)
    //console.log("Adding spec", value, rollData.total)

    let actor = game.actors.get(rollData.actorId)
    actor.spentSkillTranscendence(rollData.skill, value)

    let msg = await this.createChatWithRollMode(rollData.alias, {
      content: await renderTemplate(`systems/fvtt-ecryme/templates/chat/chat-generic-result.hbs`, rollData)
    })
    msg.setFlag("world", "rolldata", rollData)
  }

  /* -------------------------------------------- */
  static sortArrayObjectsByName(myArray) {
    myArray.sort((a, b) => {
      let fa = a.name.toLowerCase();
      let fb = b.name.toLowerCase();
      if (fa < fb) {
        return -1;
      }
      if (fa > fb) {
        return 1;
      }
      return 0;
    })
  }

  /* -------------------------------------------- */
  static getUsers(filter) {
    return game.users.filter(filter).map(user => user.id);
  }
  /* -------------------------------------------- */
  static getWhisperRecipients(rollMode, name) {
    switch (rollMode) {
      case "blindroll": return this.getUsers(user => user.isGM);
      case "gmroll": return this.getWhisperRecipientsAndGMs(name);
      case "useronly": return this.getWhisperRecipientsOnly(name);
      case "selfroll": return [game.user.id];
    }
    return undefined;
  }
  /* -------------------------------------------- */
  static getWhisperRecipientsOnly(name) {
    let recep1 = ChatMessage.getWhisperRecipients(name) || [];
    return recep1
  }
  /* -------------------------------------------- */
  static getWhisperRecipientsAndGMs(name) {
    let recep1 = ChatMessage.getWhisperRecipients(name) || [];
    return recep1.concat(ChatMessage.getWhisperRecipients('GM'));
  }

  /* -------------------------------------------- */
  static blindMessageToGM(chatOptions) {
    let chatGM = duplicate(chatOptions);
    chatGM.whisper = this.getUsers(user => user.isGM);
    chatGM.content = "Blinde message of " + game.user.name + "<br>" + chatOptions.content;
    console.log("blindMessageToGM", chatGM);
    game.socket.emit("system.fvtt-ecryme", { msg: "msg_gm_chat_message", data: chatGM });
  }


  /* -------------------------------------------- */
  static split3Columns(data) {

    let array = [[], [], []];
    if (data == undefined) return array;

    let col = 0;
    for (let key in data) {
      let keyword = data[key];
      keyword.key = key; // Self-reference
      array[col].push(keyword);
      col++;
      if (col == 3) col = 0;
    }
    return array;
  }

  /* -------------------------------------------- */
  static async createChatMessage(name, rollMode, chatOptions) {
    switch (rollMode) {
      case "blindroll": // GM only
        if (!game.user.isGM) {
          this.blindMessageToGM(chatOptions);

          chatOptions.whisper = [game.user.id];
          chatOptions.content = "Message only to the GM";
        }
        else {
          chatOptions.whisper = this.getUsers(user => user.isGM);
        }
        break;
      default:
        chatOptions.whisper = this.getWhisperRecipients(rollMode, name);
        break;
    }
    chatOptions.alias = chatOptions.alias || name;
    return await ChatMessage.create(chatOptions);
  }

  /* -------------------------------------------- */
  static getBasicRollData() {
    let rollData = {
      rollId: randomID(16),
      bonusMalusPerso: 0,
      bonusMalusSituation: 0,
      bonusMalusDef: 0,
      bonusMalusPortee: 0,
      skillTranscendence: 0,
      rollMode: game.settings.get("core", "rollMode"),
      difficulty: "-",
      useSpleen: false,
      useIdeal: false,
      config: duplicate(game.system.ecryme.config)
    }
    EcrymeUtility.updateWithTarget(rollData)
    return rollData
  }

  /* -------------------------------------------- */
  static updateWithTarget(rollData) {
    let target = EcrymeUtility.getTarget()
    if (target) {
      rollData.defenderTokenId = target.id
    }
  }

  /* -------------------------------------------- */
  static async createChatWithRollMode(name, chatOptions) {
    return await this.createChatMessage(name, game.settings.get("core", "rollMode"), chatOptions)
  }

  /* -------------------------------------------- */
  static async confirmDelete(actorSheet, li) {
    let itemId = li.data("item-id");
    let msgTxt = "<p>Are you sure to remove this Item ?";
    let buttons = {
      delete: {
        icon: '<i class="fas fa-check"></i>',
        label: "Yes, remove it",
        callback: () => {
          actorSheet.actor.deleteEmbeddedDocuments("Item", [itemId]);
          li.slideUp(200, () => actorSheet.render(false));
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    }
    msgTxt += "</p>";
    let d = new Dialog({
      title: "Confirm removal",
      content: msgTxt,
      buttons: buttons,
      default: "cancel"
    });
    d.render(true);
  }

}