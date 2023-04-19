
export class EcrymeHotbar {

  /**
   * Create a macro when dropping an entity on the hotbar
   * Item      - open roll dialog for item
   * Actor     - open actor sheet
   * Journal   - open journal sheet
   */
  static init( ) {

    Hooks.on("hotbarDrop", async (bar, documentData, slot) => {
    // Create item macro if rollable item - weapon, spell, prayer, trait, or skill
    if (documentData.type == "Item") {
      console.log("Drop done !!!", bar, documentData, slot)
      let item = documentData.data
      let command = `game.system.Ecryme.EcrymeHotbar.rollMacro("${item.name}", "${item.type}");`
      let macro = game.macros.contents.find(m => (m.name === item.name) && (m.command === command))
      if (!macro) {
        macro = await Macro.create({
          name: item.name,
          type: "script",
          img: item.img,
          command: command
        }, { displaySheet: false })
      }
      game.user.assignHotbarMacro(macro, slot);
    }
    // Create a macro to open the actor sheet of the actor dropped on the hotbar
    else if (documentData.type == "Actor") {
      let actor = game.actors.get(documentData.id);
      let command = `game.actors.get("${documentData.id}").sheet.render(true)`
      let macro = game.macros.contents.find(m => (m.name === actor.name) && (m.command === command));
      if (!macro) {
        macro = await Macro.create({
          name: actor.data.name,
          type: "script",
          img: actor.data.img,
          command: command
        }, { displaySheet: false })
        game.user.assignHotbarMacro(macro, slot);
      }
    }
    // Create a macro to open the journal sheet of the journal dropped on the hotbar
    else if (documentData.type == "JournalEntry") {
      let journal = game.journal.get(documentData.id);
      let command = `game.journal.get("${documentData.id}").sheet.render(true)`
      let macro = game.macros.contents.find(m => (m.name === journal.name) && (m.command === command));
      if (!macro) {
        macro = await Macro.create({
          name: journal.data.name,
          type: "script",
          img: "",
          command: command
        }, { displaySheet: false })
        game.user.assignHotbarMacro(macro, slot);
      }
    }
    return false;
  });
  }

  /** Roll macro */
  static rollMacro(itemName, itemType, bypassData) {
    const speaker = ChatMessage.getSpeaker()
    let actor
    if (speaker.token) actor = game.actors.tokens[speaker.token]
    if (!actor) actor = game.actors.get(speaker.actor)
    if (!actor) {
      return ui.notifications.warn(`Select your actor to run the macro`)
    }

    let item = actor.items.find(it => it.name === itemName && it.type == itemType)
    if (!item ) {
      return ui.notifications.warn(`Unable to find the item of the macro in the current actor`)
    }
    // Trigger the item roll
    if  (item.type === "weapon") {
      return actor.rollWeapon( item.id)
    }
    if  (item.type === "skill") {
      return actor.rollSkill( item.id)
    }
  }

}
