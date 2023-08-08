/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */

import { EcrymeUtility } from "../common/ecryme-utility.js";

/* -------------------------------------------- */
export class EcrymeAnnencySheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {

    return mergeObject(super.defaultOptions, {
      classes: ["fvtt-ecryme", "sheet", "actor"],
      template: "systems/fvtt-ecryme/templates/actors/annency-sheet.hbs",
      width: 640,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "annency" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
      editScore: true
    });
  }

  /* -------------------------------------------- */
  async getData() {

    let formData = {
      title: this.title,
      id: this.actor.id,
      type: this.actor.type,
      img: this.actor.img,
      name: this.actor.name,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      system: duplicate(this.object.system),
      limited: this.object.limited,
      config: duplicate(game.system.ecryme.config),
      hasCephaly: EcrymeUtility.hasCephaly(),
      hasBoheme: EcrymeUtility.hasBoheme(),
      hasAmertume: EcrymeUtility.hasAmertume(),
      characters: this.actor.buildAnnencyActorList(),
      options: this.options,
      owner: this.document.isOwner,
      editScore: this.options.editScore,
      isGM: game.user.isGM
    }
    this.formData = formData;

    console.log("Annency : ", formData, this.object);
    return formData;
  }


  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html.bind("keydown", function (e) { // Ignore Enter in actores sheet
      if (e.keyCode === 13) return false;
    });

    html.find('.actor-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item")
      let actorId = li.data("actor-id")
      const actor = game.actors.get(actorId)
      actor.sheet.render(true)
    })
    html.find('.actor-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item")
      let actorId = li.data("actor-id")
      this.actor.removeAnnencyActor(actorId)
    })
    

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item")
      let itemId = li.data("item-id")
      const item = this.actor.items.get(itemId);
      item.sheet.render(true);
    });
    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item")
      EcrymeUtility.confirmDelete(this, li).catch("Error : No deletion confirmed")
    })
    html.find('.item-add').click(ev => {
      let dataType = $(ev.currentTarget).data("type")
      this.actor.createEmbeddedDocuments('Item', [{ name: "NewItem", type: dataType }], { renderSheet: true })
    })

    html.find('.subactor-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let actorId = li.data("actor-id");
      let actor = game.actors.get(actorId);
      actor.sheet.render(true);
    });

    html.find('.subactor-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let actorId = li.data("actor-id");
      this.actor.delSubActor(actorId);
    });
    html.find('.update-field').change(ev => {
      const fieldName = $(ev.currentTarget).data("field-name");
      let value = Number(ev.currentTarget.value);
      this.actor.update({ [`${fieldName}`]: value });
    });
  }

  /* -------------------------------------------- */
  async _onDropActor(event, dragData) {
    const actor = fromUuidSync(dragData.uuid)
    if (actor) {
      this.actor.addAnnencyActor(actor.id)
    } else {
      ui.notifications.warn("Actor not found")
    }
    super._onDropActor(event)
  }

  /* -------------------------------------------- */
  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */
  /** @override */
  _updateObject(event, formData) {
    // Update the Actor
    return this.object.update(formData);
  }
}
