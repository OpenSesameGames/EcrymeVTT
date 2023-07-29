/**
 * Ecryme system
 * Author: Uberwald
 * Software License: Prop
 */

/* -------------------------------------------- */

/* -------------------------------------------- */
// Import Modules
import { EcrymeActor } from "./actors/ecryme-actor.js";
import { EcrymeItemSheet } from "./items/ecryme-item-sheet.js";
import { EcrymeActorSheet } from "./actors/ecryme-actor-sheet.js";
import { EcrymeUtility } from "./common/ecryme-utility.js";
import { EcrymeCombat } from "./app/ecryme-combat.js";
import { EcrymeItem } from "./items/ecryme-item.js";
import { EcrymeHotbar } from "./app/ecryme-hotbar.js"
import { EcrymeCharacterSummary } from "./app/ecryme-summary-app.js"
import { ECRYME_CONFIG } from "./common/ecryme-config.js"

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/************************************************************************************/
Hooks.once("init", async function () {

  console.log(`Initializing Ecryme RPG`);

  game.system.ecryme = {
    config: ECRYME_CONFIG,
    EcrymeHotbar
  }

  /* -------------------------------------------- */
  // preload handlebars templates
  EcrymeUtility.preloadHandlebarsTemplates();

  /* -------------------------------------------- */
  // Set an initiative formula for the system 
  CONFIG.Combat.initiative = {
    formula: "1d6",
    decimals: 1
  };

  /* -------------------------------------------- */
  game.socket.on("system.fvtt-ecryme", data => {
    EcrymeUtility.onSocketMesssage(data)
  });

  /* -------------------------------------------- */
  // Define custom Entity classes
  CONFIG.Combat.documentClass = EcrymeCombat
  CONFIG.Actor.documentClass = EcrymeActor
  CONFIG.Item.documentClass = EcrymeItem

  /* -------------------------------------------- */
  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("fvtt-ecryme", EcrymeActorSheet, { types: ["pc"], makeDefault: true });
  //Actors.registerSheet("fvtt-ecryme", EcrymeNPCSheet, { types: ["pnj"], makeDefault: false });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("fvtt-ecryme", EcrymeItemSheet, { makeDefault: true });

  EcrymeUtility.init()

  console.log("Babele INIT!")
  Babele.get().setSystemTranslationsDir("translated");

});

/* -------------------------------------------- */
function welcomeMessage() {
  if (game.user.isGM) {
    ChatMessage.create({
      user: game.user.id,
      whisper: [game.user.id],
      content: `<div id="welcome-message-ecryme"><span class="rdd-roll-part">
      <strong>Bienvenu dans Ecryme !</strong>` });
  }
}

/* -------------------------------------------- */
// Register world usage statistics
function registerUsageCount(registerKey) {
  if (game.user.isGM) {
    game.settings.register(registerKey, "world-key", {
      name: "Unique world key",
      scope: "world",
      config: false,
      default: "",
      type: String
    });

    let worldKey = game.settings.get(registerKey, "world-key")
    if (worldKey == undefined || worldKey == "") {
      worldKey = randomID(32)
      game.settings.set(registerKey, "world-key", worldKey)
    }
    // Simple API counter
    let regURL = `https://www.uberwald.me/fvtt_appcount/count.php?name="${registerKey}"&worldKey="${worldKey}"&version="${game.release.generation}.${game.release.build}"&system="${game.system.id}"&systemversion="${game.system.version}"`
    //$.ajaxSetup({
    //headers: { 'Access-Control-Allow-Origin': '*' }
    //})
    $.ajax(regURL)
  }
}

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.once("ready", function () {

  // User warning
  if (!game.user.isGM && game.user.character == undefined) {
    ui.notifications.info("Attention ! Aucun personnage relié au joueur !");
    ChatMessage.create({
      content: "<b>WARNING</b> Le joueur  " + game.user.name + " n'est pas relié à un personnage !",
      user: game.user._id
    });
  }

  registerUsageCount(game.system.id)
  welcomeMessage();
  EcrymeUtility.ready()
  EcrymeCharacterSummary.ready()

})


/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.on("chatMessage", (html, content, msg) => {
  if (content[0] == '/') {
    let regExp = /(\S+)/g;
    let commands = content.match(regExp);
    if (game.system.ecryme.commands.processChatCommand(commands, content, msg)) {
      return false;
    }
  }
  return true;
});

