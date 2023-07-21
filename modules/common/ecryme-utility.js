/* -------------------------------------------- */
import { EcrymeCommands } from "../app/ecryme-commands.js";

/* -------------------------------------------- */
const __maxImpacts = { superficial: 4, light: 3, serious: 2, major: 1 }
const __nextImpacts = { superficial: "light", light: "serious", serious: "major", major: "major" }
const __effect2Impact = ["none", "superficial", "superficial", "light", "light", "serious", "serious", "major", "major"]
const __cephalySuccess = {
  1: "cephaly-success-2",
  2: "cephaly-success-2",
  3: "cephaly-success-4",
  4: "cephaly-success-4",
  5: "cephaly-success-6",
  6: "cephaly-success-6",
  7: "cephaly-success-8",
  8: "cephaly-success-8",
  9: "cephaly-success-9",
  10: "cephaly-success-10"
}
const __cephalyFailure = {
  1: "cephaly-failure-2",
  2: "cephaly-failure-2",
  3: "cephaly-failure-4",
  4: "cephaly-failure-4",
  5: "cephaly-failure-6",
  6: "cephaly-failure-6",
  7: "cephaly-failure-8",
  8: "cephaly-failure-8",
  9: "cephaly-failure-9",
  10: "cephaly-failure-10"
}

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
    Handlebars.registerHelper('valueAtIndex', function (arr, idx) {
      return arr[idx];
    })
    Handlebars.registerHelper('for', function (from, to, incr, block) {
      let accum = '';
      for (let i = from; i <= to; i += incr)
        accum += block.fn(i);
      return accum;
    })
    Handlebars.registerHelper('isGM', function () {
      return game.user.isGM
    })

    game.settings.register("fvtt-ecryme", "ecryme-game-level", {
      name: game.i18n.localize("ECRY.settings.gamelevel"),
      label: game.i18n.localize("ECRY.settings.gamelevelhelp"),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        "level_e": game.i18n.localize("ECRY.settings.cogs"),
        "level_c": game.i18n.localize("ECRY.settings.cephaly"),
        "level_b": game.i18n.localize("ECRY.settings.boheme"),
        "level_a": game.i18n.localize("ECRY.settings.amertume"),
      },
      restricted: true
    })

    this.buildSkillConfig()

  }

  /*-------------------------------------------- */
  static hasCephaly() {
    let level = game.settings.get("fvtt-ecryme", "ecryme-game-level")
    return level != "level_e"
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
  static getImpactFromEffect(effectValue) {
    if (effectValue >= __effect2Impact.length) {
      return "major"
    }
    return __effect2Impact[effectValue]
  }
  /* -------------------------------------------- */
  static async processConfrontation() {
    let confront = {
      type: "confront-data",
      rollData1: this.confrontData1,
      rollData2: this.confrontData2,
    }
    // Compute margin
    confront.marginExecution = this.confrontData1.executionTotal - this.confrontData2.preservationTotal
    confront.marginPreservation = this.confrontData1.preservationTotal - this.confrontData2.executionTotal
    console.log(confront.marginExecution, confront.marginPreservation)
    // Filter margin
    let maxMargin // Dummy max
    if (confront.marginExecution > 0) { // Successful hit
      // Limit with skill+spec
      maxMargin = confront.rollData1.skill.value + ((confront.rollData1.spec) ? 2 : 0)
      confront.marginExecution = Math.min(confront.marginExecution, maxMargin)
    } else { // Failed hit
      maxMargin = confront.rollData2.skill.value + ((confront.rollData2.spec) ? 2 : 0)
      confront.marginExecution = -Math.min(Math.abs(confront.marginExecution), maxMargin)
    }

    if (confront.marginPreservation > 0) { // Successful defense
      // Limit with skill+spec
      maxMargin = confront.rollData1.skill.value + ((confront.rollData1.spec) ? 2 : 0)
      confront.marginPreservation = Math.min(confront.marginPreservation, maxMargin)
    } else { // Failed defense
      maxMargin = confront.rollData2.skill.value + ((confront.rollData2.spec) ? 2 : 0)
      confront.marginPreservation = - Math.min(Math.abs(confront.marginPreservation), maxMargin)
    }

    // Compute effects
    confront.effectExecution = confront.marginExecution
    if (confront.rollData1.weapon && confront.marginExecution > 0) {
      confront.effectExecution += confront.rollData1.weapon.system.effect
      confront.impactExecution = this.getImpactFromEffect(confront.effectExecution)
    }
    if (confront.marginExecution < 0) {
      confront.bonus2 = -confront.marginExecution
    }
    confront.effectPreservation = confront.marginPreservation
    if (confront.rollData2.weapon && confront.marginPreservation < 0) {
      confront.effectPreservation = - (Math.abs(confront.marginPreservation) + confront.rollData2.weapon.system.effect)
      confront.impactPreservation = this.getImpactFromEffect(Math.abs(confront.effectPreservation))
    }
    if (confront.marginPreservation > 0) {
      confront.bonus1 = -confront.marginPreservation
    }

    let msg = await this.createChatWithRollMode(this.confrontData1.alias, {
      content: await renderTemplate(`systems/fvtt-ecryme/templates/chat/chat-confrontation-result.hbs`, confront)
    })
    msg.setFlag("world", "ecryme-rolldata", confront)
    console.log("Confront result", confront)

    this.lastConfront = confront
  }
  /* -------------------------------------------- */
  static async manageCephalyDifficulty(rollData, difficulty) {
    rollData.difficulty = Number(difficulty)
    if (rollData.executionTotal > difficulty) {
      rollData.marginExecution = rollData.executionTotal - difficulty
      rollData.cephalySuccess = "ECRY.rule." + __cephalySuccess[(rollData.marginExecution > 10) ? 10 : rollData.marginExecution]
    } else {
      rollData.marginExecution = -1
    }
    if (rollData.preservationTotal < difficulty) {
      rollData.marginPreservation = difficulty - rollData.preservationTotal
      rollData.cephalyFailure = "ECRY.rule." + __cephalyFailure[(rollData.marginPreservation > 10) ? 10 : rollData.marginPreservation]
    } else {
      rollData.marginPreservation = -1
    }
    let msg = await this.createChatWithRollMode(rollData.alias, {
      content: await renderTemplate(`systems/fvtt-ecryme/templates/chat/chat-cephaly-result.hbs`, rollData)
    })
    msg.setFlag("world", "ecryme-rolldata", rollData)
    console.log("Cephaly result", rollData)
  }

  /* -------------------------------------------- */
  static manageConfrontation(rollData) {
    console.log("Confront", rollData)
    // Auto - Reset
    if (this.confrontData1 && this.confrontData2) {
      this.confrontData1 = undefined
      this.confrontData2 = undefined
    }
    // Then attribute
    if (!this.confrontData1) {
      this.confrontData1 = rollData
    } else if (this.confrontData1 && this.confrontData1.rollId != rollData.rollId) {
      this.confrontData2 = rollData
      this.processConfrontation().catch("Error during confrontation processing")
    } else {
      ui.notifications.warn(game.i18n.localize("ECRY.warn.confrontalready"))
    }
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
          EcrymeUtility.transcendFromSpec(rollData, i).catch("Error on Transcend")
        }
      })
    }
  }

  /* -------------------------------------------- */
  static async chatListeners(html) {

    html.on("click", '.button-select-confront', event => {
      let messageId = EcrymeUtility.findChatMessageId(event.currentTarget)
      let message = game.messages.get(messageId)
      let rollData = message.getFlag("world", "ecryme-rolldata")
      EcrymeUtility.manageConfrontation(rollData)
    })
    html.on("click", '.button-apply-cephaly-difficulty', event => {
      let messageId = EcrymeUtility.findChatMessageId(event.currentTarget)
      let message = game.messages.get(messageId)
      let rollData = message.getFlag("world", "ecryme-rolldata")
      let difficulty = $("#" + rollData.rollId + "-cephaly-difficulty").val()
      EcrymeUtility.manageCephalyDifficulty(rollData, difficulty)
    })
    html.on("click", '.button-apply-impact', event => {
      let messageId = EcrymeUtility.findChatMessageId(event.currentTarget)
      let message = game.messages.get(messageId)
      let actor = game.actors.get($(event.currentTarget).data("actor-id"))
      actor.modifyImpact($(event.currentTarget).data("impact-type"), $(event.currentTarget).data("impact"), 1)
    })
    html.on("click", '.button-apply-bonus', event => {
      let messageId = EcrymeUtility.findChatMessageId(event.currentTarget)
      let message = game.messages.get(messageId)
      let actor = game.actors.get($(event.currentTarget).data("actor-id"))
      actor.modifyConfrontBonus($(event.currentTarget).data("bonus"))
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
      'systems/fvtt-ecryme/templates/dialogs/partial-confront-dice-area.hbs',
      'systems/fvtt-ecryme/templates/dialogs/partial-confront-bonus-area.hbs',
      'systems/fvtt-ecryme/templates/actors/partial-impacts.hbs',
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
  static chatDataSetup(content, modeOverride, forceWhisper, isRoll = false) {
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
  static getNextImpactLevel(impactLevel) {
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
            whisper = this.getUsers(user => user.isGM);
            blind = true;
            break
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
      let maxMargin = rollData.skill.value + (rollData.spec) ? 2 : 0
      rollData.margin = Math.min(rollData.margin, maxMargin)
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
    diceFormula += "+" + rollData.impactMalus
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

    let msg = await this.createChatWithRollMode(rollData.alias, {
      content: await renderTemplate(`systems/fvtt-ecryme/templates/chat/chat-generic-result.hbs`, rollData)
    })
    msg.setFlag("world", "ecryme-rolldata", rollData)
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
    msg.setFlag("world", "ecryme-rolldata", rollData)
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
      type: "roll-data",
      bonusMalusPerso: 0,
      bonusMalusSituation: 0,
      bonusMalusDef: 0,
      bonusMalusPortee: 0,
      skillTranscendence: 0,
      rollMode: game.settings.get("core", "rollMode"),
      difficulty: "-",
      useSpleen: false,
      useIdeal: false,
      impactMalus: 0,
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