/* -------------------------------------------- */
import { EcrymeUtility } from "./common/ecryme-utility.js";

/* -------------------------------------------- */
export class EcrymeCharacterSummary extends Application {

  /* -------------------------------------------- */
  static displayPCSummary() {
    if (game.user.isGM) {
      game.system.ecryme.charSummary.render(true)
    } else {
      ui.notifications.info("Commande /summary réservée au MJ !")
    }
  }

  /* -------------------------------------------- */
  updatePCSummary() {
    if (this.rendered) {
      this.render(true)
    }
  }

  /* -------------------------------------------- */
  static createSummaryPos() {
    return { top: 200, left: 200 };
  }

  /* -------------------------------------------- */
  static ready() {
    if (!game.user.isGM) { // Uniquement si GM
      return
    }
    let charSummary = new EcrymeCharacterSummary()
    game.system.ecryme.charSummary = charSummary
  }

  /* -------------------------------------------- */
  constructor() {
    super();
    //game.settings.set("world", "character-summary-data", {npcList: [], x:0, y:0})
    this.settings = game.settings.get("world", "character-summary-data")
  }

  /* -------------------------------------------- */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/fvtt-ecryme/templates/dialogs/character-summary.hbs",
      popOut: true,
      resizable: true,
      dragDrop: [{ dragSelector: ".items-list .item", dropSelector: null }],
      classes: ["bol", "dialog"], width: 920, height: 'fit-content'
    })
  }

  /* -------------------------------------------- */
  getData() {
    let formData = super.getData();

    formData.pcs = game.actors.filter(ac => ac.type == "personnage" && ac.hasPlayerOwner)
    formData.npcs = []
    let newList = []
    let toUpdate = false
    for (let actorId of this.settings.npcList) {
      let actor = game.actors.get(actorId)
      if (actor) {
        formData.npcs.push(actor)
        newList.push(actorId)
      } else {
        toUpdate = true
      }
    }
    formData.config = game.system.ecryme.config

    if (toUpdate) {
      this.settings.npcList = newList
      //console.log("Going to update ...", this.settings)
      game.settings.set("world", "character-summary-data", this.settings)
    }

    return formData
  }

  /* -------------------------------------------- */
  updateNPC() {
    game.settings.set("world", "character-summary-data", game.system.ecryme.charSummary.settings)
    game.system.ecryme.charSummary.close()
    setTimeout(function () { game.system.ecryme.charSummary.render(true) }, 500)
  }

  /* -------------------------------------------- */
  async _onDrop(event) {
    //console.log("Dragged data are : ", dragData)
    let data = event.dataTransfer.getData('text/plain')
    let dataItem = JSON.parse(data)
    let actor = fromUuidSync(dataItem.uuid)
    if (actor) {
      game.system.ecryme.charSummary.settings.npcList.push(actor.id)
      game.system.ecryme.charSummary.updateNPC()

    } else {
      ui.notifications.warn("Pas d'acteur trouvé")
    }
  }

  /* -------------------------------------------- */
  /** @override */
  async activateListeners(html) {
    super.activateListeners(html);

    html.find('.actor-open').click((event) => {
      const li = $(event.currentTarget).parents(".item")
      const actor = game.actors.get(li.data("actor-id"))
      actor.sheet.render(true)
    })

    html.find('.summary-roll').click((event) => {
      const li = $(event.currentTarget).parents(".item")
      const actor = game.actors.get(li.data("actor-id"))
      let type = $(event.currentTarget).data("type")
      let key = $(event.currentTarget).data("key")
      actor.rollAttribut(key)
    })

    html.find('.actor-delete').click(event => {
      const li = $(event.currentTarget).parents(".item");
      let actorId = li.data("actor-id")
      let newList = game.system.ecryme.charSummary.settings.npcList.filter(id => id != actorId)
      game.system.ecryme.charSummary.settings.npcList = newList
      game.system.ecryme.charSummary.updateNPC()
    })

  }

}